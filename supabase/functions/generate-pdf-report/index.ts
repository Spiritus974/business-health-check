import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ Extended AuditData Interface (V1 + V2 compatible) ============
interface AuditData {
  // V1 fields (legacy)
  nom?: string;
  secteur?: string;
  variant?: string;
  margebrutepct?: number;
  caannuel?: number;
  effectifetp?: number;
  chargesrhpct?: number;
  digitalpct?: number;
  fidelisationpct?: number;
  tauxoccupation?: number;
  nbservices?: number;
  
  // V2 fields (new structure)
  businessName?: string;
  sector?: string;
  sectorVariant?: string;
  dataOrigin?: string;
  
  // Finance
  finance?: {
    caAnnuel?: number;
    margeBrutePct?: number;
    tresorerieNette?: number;
    dettesLongTerme?: number;
    chargesFixesMensuelles?: number;
  };
  
  // Costs
  costs?: {
    chargesRhPct?: number;
    chargesFixes?: number;
    chargesVariables?: number;
  };
  
  // Productivity
  productivity?: {
    effectifETP?: number;
    revenuePerFte?: number;
  };
  
  // Quality
  quality?: {
    tauxAbsenteisme?: number;
    turnoverAnnuel?: number;
    tauxReclamation?: number;
    npsScore?: number;
  };
  
  // Ops
  ops?: {
    tauxOccupation?: number;
    nbServices?: number;
    tempsServiceMoyen?: number;
  };
  
  // HR
  hr?: {
    effectifTotal?: number;
    ancienneteMoyenne?: number;
    formationHeuresAn?: number;
  };
  
  // Satisfaction
  satisfaction?: {
    tauxFidelisation?: number;
    avisMoyenGoogle?: number;
    tauxReponseAvis?: number;
  };
  
  // Commercial
  commercial?: {
    digitalPct?: number;
    fidelisationPct?: number;
    panierMoyen?: number;
    freqVisiteMois?: number;
  };
}

interface Scores {
  global: number;
  financier: number;
  operationnel: number;
  commercial: number;
  strategique: number;
}

// ============ Safe Formatting Helpers ============

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function formatEUR(value: unknown): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return num.toLocaleString('fr-FR') + ' €';
}

function formatNumber(value: unknown): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return num.toLocaleString('fr-FR');
}

function formatPercent(value: unknown): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return num + '%';
}

function formatDecimal(value: unknown, decimals: number = 1): string {
  const num = toNumber(value);
  if (num === null) return "—";
  return num.toFixed(decimals);
}

function safeCalc(value: unknown, fallback: number = 0): number {
  const num = toNumber(value);
  return num !== null ? num : fallback;
}

// ============ End Safe Formatting Helpers ============

// ============ Data Normalization (V1 ↔ V2) ============

interface NormalizedData {
  nom: string;
  secteur: string;
  variant: string;
  caAnnuel: number | null;
  margeBrutePct: number | null;
  effectifETP: number | null;
  chargesRhPct: number | null;
  digitalPct: number | null;
  fidelisationPct: number | null;
  tauxOccupation: number | null;
  nbServices: number | null;
  // Extended V2 fields
  tresorerieNette: number | null;
  tauxAbsenteisme: number | null;
  turnoverAnnuel: number | null;
  panierMoyen: number | null;
  npsScore: number | null;
}

function normalizeAuditData(data: AuditData): NormalizedData {
  // Priority: V2 nested fields > V1 flat fields
  return {
    nom: data?.businessName || data?.nom || 'Entreprise',
    secteur: data?.sector || data?.secteur || 'Non renseigné',
    variant: data?.sectorVariant || data?.variant || 'Standard',
    
    // Finance - V2 first, fallback to V1
    caAnnuel: toNumber(data?.finance?.caAnnuel) ?? toNumber(data?.caannuel),
    margeBrutePct: toNumber(data?.finance?.margeBrutePct) ?? toNumber(data?.margebrutepct),
    tresorerieNette: toNumber(data?.finance?.tresorerieNette),
    
    // HR & Costs
    effectifETP: toNumber(data?.productivity?.effectifETP) ?? toNumber(data?.effectifetp),
    chargesRhPct: toNumber(data?.costs?.chargesRhPct) ?? toNumber(data?.chargesrhpct),
    
    // Operations
    tauxOccupation: toNumber(data?.ops?.tauxOccupation) ?? toNumber(data?.tauxoccupation),
    nbServices: toNumber(data?.ops?.nbServices) ?? toNumber(data?.nbservices),
    
    // Commercial
    digitalPct: toNumber(data?.commercial?.digitalPct) ?? toNumber(data?.digitalpct),
    fidelisationPct: toNumber(data?.satisfaction?.tauxFidelisation) ?? 
                     toNumber(data?.commercial?.fidelisationPct) ?? 
                     toNumber(data?.fidelisationpct),
    panierMoyen: toNumber(data?.commercial?.panierMoyen),
    
    // Quality
    tauxAbsenteisme: toNumber(data?.quality?.tauxAbsenteisme),
    turnoverAnnuel: toNumber(data?.quality?.turnoverAnnuel),
    npsScore: toNumber(data?.quality?.npsScore),
  };
}

// ============ End Data Normalization ============

function getScoreLevel(score: number): { level: string; label: string; color: string } {
  if (score >= 80) return { level: 'excellent', label: 'Excellent', color: '#10b981' };
  if (score >= 60) return { level: 'bon', label: 'Bon', color: '#3b82f6' };
  if (score >= 40) return { level: 'critique', label: 'À améliorer', color: '#f59e0b' };
  return { level: 'danger', label: 'Critique', color: '#ef4444' };
}

function getMissingFields(normalized: NormalizedData): string[] {
  const missing: string[] = [];
  
  // Critical fields
  if (normalized.caAnnuel === null) missing.push("Chiffre d'affaires annuel");
  if (normalized.margeBrutePct === null) missing.push("Marge brute (%)");
  if (normalized.effectifETP === null) missing.push("Effectif ETP");
  if (normalized.chargesRhPct === null) missing.push("Charges RH (%)");
  if (normalized.digitalPct === null) missing.push("Digitalisation (%)");
  if (normalized.fidelisationPct === null) missing.push("Fidélisation (%)");
  if (normalized.tauxOccupation === null) missing.push("Taux d'occupation");
  if (normalized.nbServices === null) missing.push("Nombre de services");
  
  return missing;
}

function generateRecommendations(data: AuditData, scores: Scores): string[] {
  const recommendations: string[] = [];
  
  if (scores.financier < 60) {
    recommendations.push("Optimiser la marge brute par une révision des prix d'achat et de vente");
    recommendations.push("Améliorer la productivité par ETP via la formation et l'optimisation des processus");
    recommendations.push("Analyser la structure des charges RH et identifier les leviers d'optimisation");
  }
  
  if (scores.operationnel < 60) {
    recommendations.push("Optimiser le planning pour augmenter le taux d'occupation");
    recommendations.push("Réduire les temps morts et améliorer l'efficacité opérationnelle");
    recommendations.push("Mettre en place des outils de suivi de la productivité");
  }
  
  if (scores.commercial < 60) {
    recommendations.push("Développer la présence digitale et les outils de prise de RDV en ligne");
    recommendations.push("Mettre en place un programme de fidélisation client structuré");
    recommendations.push("Améliorer la communication client via newsletters et rappels automatisés");
  }
  
  if (scores.strategique < 60) {
    recommendations.push("Diversifier l'offre de services pour augmenter le panier moyen");
    recommendations.push("Identifier de nouvelles opportunités de développement");
    recommendations.push("Élaborer un plan stratégique à 3-5 ans");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Maintenir les bonnes pratiques actuelles");
    recommendations.push("Continuer à surveiller les indicateurs clés de performance");
    recommendations.push("Explorer de nouvelles opportunités de croissance");
  }
  
  return recommendations;
}

function generateStrengths(scores: Scores): string[] {
  const strengths: string[] = [];
  
  if (scores.financier >= 70) {
    strengths.push("Excellente santé financière avec des marges optimisées");
  }
  if (scores.operationnel >= 70) {
    strengths.push("Efficacité opérationnelle remarquable");
  }
  if (scores.commercial >= 70) {
    strengths.push("Stratégie commerciale et digitale performante");
  }
  if (scores.strategique >= 70) {
    strengths.push("Positionnement stratégique solide avec une offre diversifiée");
  }
  
  if (strengths.length === 0) {
    strengths.push("Potentiel d'amélioration identifié sur l'ensemble des axes");
  }
  
  return strengths;
}

function generateHTMLReport(data: AuditData, scores: Scores): string {
  // CRITICAL: Normalize data first for V1/V2 compatibility
  const n = normalizeAuditData(data);
  
  const date = new Date().toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const globalLevel = getScoreLevel(scores.global);
  const financierLevel = getScoreLevel(scores.financier);
  const operationnelLevel = getScoreLevel(scores.operationnel);
  const commercialLevel = getScoreLevel(scores.commercial);
  const strategiqueLevel = getScoreLevel(scores.strategique);
  
  const recommendations = generateRecommendations(data, scores);
  const strengths = generateStrengths(scores);
  const missingFields = getMissingFields(n);
  
  // Safe calculations with normalized data
  const effectifEtp = n.effectifETP ?? 1;
  const caAnnuel = n.caAnnuel ?? 0;
  const caEtp = effectifEtp > 0 ? (caAnnuel / effectifEtp).toFixed(0) : "—";
  const tauxOccupationPct = (n.tauxOccupation ?? 0) * 100;
  
  // Generate missing fields alert HTML if needed
  const missingFieldsAlert = missingFields.length > 0 ? `
    <div class="card" style="background: #fef3c7; border-left-color: #f59e0b; margin-bottom: 30px;">
      <h3 style="color: #92400e;">⚠️ Alertes de cohérence</h3>
      <p style="color: #92400e; margin: 10px 0;">Les champs suivants n'ont pas été renseignés. Certaines analyses peuvent être incomplètes :</p>
      <ul style="padding-left: 20px; color: #92400e;">
        ${missingFields.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  ` : '';
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport d'Audit - ${n.nom}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      background: #ffffff;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      page-break-after: always;
      background: #ffffff;
      position: relative;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #6366f1;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 800;
      color: #6366f1;
    }
    
    .logo span {
      color: #f59e0b;
    }
    
    .date {
      color: #64748b;
      font-size: 14px;
    }
    
    .cover {
      text-align: center;
      padding-top: 80px;
    }
    
    .cover h1 {
      font-size: 42px;
      font-weight: 800;
      color: #1a1a2e;
      margin-bottom: 20px;
    }
    
    .cover .subtitle {
      font-size: 24px;
      color: #64748b;
      margin-bottom: 60px;
    }
    
    .cover .company {
      font-size: 32px;
      font-weight: 700;
      color: #6366f1;
      margin-bottom: 20px;
    }
    
    .cover .sector {
      font-size: 18px;
      color: #64748b;
      margin-bottom: 80px;
    }
    
    .score-circle {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${globalLevel.color}20, ${globalLevel.color}40);
      border: 6px solid ${globalLevel.color};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
    }
    
    .score-value {
      font-size: 56px;
      font-weight: 800;
      color: ${globalLevel.color};
    }
    
    .score-label {
      font-size: 18px;
      color: ${globalLevel.color};
      font-weight: 600;
    }
    
    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 30px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    h3 {
      font-size: 22px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 20px;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      border-left: 4px solid #6366f1;
    }
    
    .score-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      background: #ffffff;
      border-radius: 12px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .score-card-title {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a2e;
    }
    
    .score-card-value {
      font-size: 28px;
      font-weight: 800;
    }
    
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .metric-row:last-child {
      border-bottom: none;
    }
    
    .metric-label {
      font-weight: 500;
      color: #64748b;
    }
    
    .metric-value {
      font-weight: 700;
      color: #1a1a2e;
    }
    
    .progress-bar {
      width: 100%;
      height: 12px;
      background: #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.3s ease;
    }
    
    .recommendation-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: #ffffff;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    
    .recommendation-icon {
      width: 32px;
      height: 32px;
      background: #6366f1;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .recommendation-text {
      font-size: 15px;
      color: #1a1a2e;
      line-height: 1.5;
    }
    
    .strength-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: #dcfce7;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    
    .strength-icon {
      color: #10b981;
      font-size: 20px;
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    .table th, .table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .table th {
      background: #6366f1;
      color: white;
      font-weight: 600;
    }
    
    .table tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .footer {
      position: absolute;
      bottom: 20mm;
      left: 20mm;
      right: 20mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    
    .page-number {
      background: #6366f1;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }
    
    .chart-placeholder {
      width: 100%;
      height: 200px;
      background: linear-gradient(135deg, #f0f4ff, #e0e7ff);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 20px 0;
    }
    
    .dimension-detail {
      background: #ffffff;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
    
    .dimension-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    
    .dimension-score {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .dimension-score-value {
      font-size: 24px;
      font-weight: 800;
    }
    
    .analysis-box {
      background: #f8fafc;
      border-radius: 10px;
      padding: 20px;
      margin-top: 16px;
    }
    
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px dotted #cbd5e1;
    }
    
    .toc-title {
      font-weight: 600;
      color: #1a1a2e;
    }
    
    .toc-page {
      color: #6366f1;
      font-weight: 700;
    }
    
    .benchmark-indicator {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .benchmark-excellent { background: #dcfce7; color: #166534; }
    .benchmark-bon { background: #dbeafe; color: #1e40af; }
    .benchmark-critique { background: #fef3c7; color: #92400e; }
    .benchmark-danger { background: #fee2e2; color: #991b1b; }
    
    .action-priority {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #fef3c7;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid #f59e0b;
    }
    
    .priority-high {
      background: #fee2e2;
      border-left-color: #ef4444;
    }
    
    .priority-medium {
      background: #fef3c7;
      border-left-color: #f59e0b;
    }
    
    .priority-low {
      background: #dcfce7;
      border-left-color: #10b981;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 20px 0;
    }
    
    .kpi-item {
      background: #ffffff;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .kpi-value {
      font-size: 32px;
      font-weight: 800;
      color: #6366f1;
    }
    
    .kpi-label {
      font-size: 14px;
      color: #64748b;
      margin-top: 8px;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page { page-break-after: always; }
    }
  </style>
</head>
<body>

  <!-- Page 1: Cover -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <div class="cover">
      <h1>Rapport d'Audit 4D</h1>
      <div class="subtitle">Analyse complète de performance</div>
      <div class="company">${n.nom}</div>
      <div class="sector">Secteur: ${n.secteur}${n.variant !== 'Standard' ? ` - ${n.variant}` : ''}</div>
      <div class="score-circle">
        <div class="score-value">${formatDecimal(scores.global)}</div>
        <div class="score-label">${globalLevel.label}</div>
      </div>
      <p style="color: #64748b; font-size: 14px; margin-top: 40px;">
        Benchmarks sectoriels v2.1 • Scoring 4D paramétré
      </p>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">1</div>
    </div>
  </div>

  <!-- Page 2: Table of Contents -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>Table des Matières</h2>
    ${missingFieldsAlert}
    <div class="section">
      <div class="toc-item"><span class="toc-title">1. Synthèse Exécutive</span><span class="toc-page">3</span></div>
      <div class="toc-item"><span class="toc-title">2. Vue d'ensemble des Scores</span><span class="toc-page">4</span></div>
      <div class="toc-item"><span class="toc-title">3. Données d'Entreprise</span><span class="toc-page">5</span></div>
      <div class="toc-item"><span class="toc-title">4. Analyse Financière</span><span class="toc-page">6-8</span></div>
      <div class="toc-item"><span class="toc-title">5. Performance Opérationnelle</span><span class="toc-page">9-11</span></div>
      <div class="toc-item"><span class="toc-title">6. Dimension Commerciale</span><span class="toc-page">12-14</span></div>
      <div class="toc-item"><span class="toc-title">7. Vision Stratégique</span><span class="toc-page">15-17</span></div>
      <div class="toc-item"><span class="toc-title">8. Benchmarks Sectoriels</span><span class="toc-page">18-19</span></div>
      <div class="toc-item"><span class="toc-title">9. Plan d'Actions Prioritaires</span><span class="toc-page">20-21</span></div>
      <div class="toc-item"><span class="toc-title">10. Recommandations Détaillées</span><span class="toc-page">22-23</span></div>
      <div class="toc-item"><span class="toc-title">11. Conclusion et Prochaines Étapes</span><span class="toc-page">24</span></div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">2</div>
    </div>
  </div>

  <!-- Page 3: Executive Summary -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>1. Synthèse Exécutive</h2>
    <div class="card">
      <h3>Résumé de l'Audit</h3>
      <p style="margin-bottom: 20px; color: #64748b;">
        Ce rapport présente une analyse complète de la performance de <strong>${n.nom}</strong> 
        basée sur le modèle de scoring 4D (Financier, Opérationnel, Commercial, Stratégique) et les benchmarks 
        sectoriels ${n.secteur}.
      </p>
      <div style="display: flex; justify-content: center; margin: 30px 0;">
        <div class="score-circle" style="width: 150px; height: 150px;">
          <div class="score-value" style="font-size: 42px;">${formatDecimal(scores.global)}</div>
          <div class="score-label">${globalLevel.label}</div>
        </div>
      </div>
    </div>
    <h3>Points Forts Identifiés</h3>
    ${strengths.map(s => `
      <div class="strength-item">
        <span class="strength-icon">✓</span>
        <span>${s}</span>
      </div>
    `).join('')}
    <h3 style="margin-top: 30px;">Principales Recommandations</h3>
    ${recommendations.slice(0, 3).map((r, i) => `
      <div class="recommendation-item">
        <div class="recommendation-icon">${i + 1}</div>
        <div class="recommendation-text">${r}</div>
      </div>
    `).join('')}
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">3</div>
    </div>
  </div>

  <!-- Page 4: Score Overview -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>2. Vue d'ensemble des Scores</h2>
    <div class="kpi-grid">
      <div class="kpi-item">
        <div class="kpi-value" style="color: ${financierLevel.color}">${formatDecimal(scores.financier)}</div>
        <div class="kpi-label">Score Financier</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${safeCalc(scores.financier)}%; background: ${financierLevel.color}"></div>
        </div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value" style="color: ${operationnelLevel.color}">${formatDecimal(scores.operationnel)}</div>
        <div class="kpi-label">Score Opérationnel</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${safeCalc(scores.operationnel)}%; background: ${operationnelLevel.color}"></div>
        </div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value" style="color: ${commercialLevel.color}">${formatDecimal(scores.commercial)}</div>
        <div class="kpi-label">Score Commercial</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${safeCalc(scores.commercial)}%; background: ${commercialLevel.color}"></div>
        </div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value" style="color: ${strategiqueLevel.color}">${formatDecimal(scores.strategique)}</div>
        <div class="kpi-label">Score Stratégique</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${safeCalc(scores.strategique)}%; background: ${strategiqueLevel.color}"></div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top: 30px;">
      <h3>Pondération du Score Global</h3>
      <div class="metric-row">
        <span class="metric-label">Dimension Financière</span>
        <span class="metric-value">35%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Dimension Opérationnelle</span>
        <span class="metric-value">25%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Dimension Commerciale</span>
        <span class="metric-value">20%</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Dimension Stratégique</span>
        <span class="metric-value">20%</span>
      </div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">4</div>
    </div>
  </div>

  <!-- Page 5: Company Data -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>3. Données d'Entreprise</h2>
    <div class="dimension-detail">
      <h3>Informations Générales</h3>
      <div class="metric-row">
        <span class="metric-label">Nom de l'entreprise</span>
        <span class="metric-value">${n.nom}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Secteur d'activité</span>
        <span class="metric-value">${n.secteur}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Variante sectorielle</span>
        <span class="metric-value">${n.variant}</span>
      </div>
    </div>
    <div class="dimension-detail">
      <h3>Données Financières</h3>
      <div class="metric-row">
        <span class="metric-label">Chiffre d'affaires annuel</span>
        <span class="metric-value">${formatEUR(n.caAnnuel)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Marge brute</span>
        <span class="metric-value">${formatPercent(n.margeBrutePct)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Charges RH</span>
        <span class="metric-value">${formatPercent(n.chargesRhPct)}</span>
      </div>
    </div>
    <div class="dimension-detail">
      <h3>Données Opérationnelles</h3>
      <div class="metric-row">
        <span class="metric-label">Effectif (ETP)</span>
        <span class="metric-value">${formatNumber(n.effectifETP)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">CA par ETP</span>
        <span class="metric-value">${caEtp !== "—" ? formatNumber(parseInt(caEtp)) + ' €' : '—'}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Taux d'occupation</span>
        <span class="metric-value">${n.tauxOccupation !== null ? formatDecimal(tauxOccupationPct, 0) + '%' : '—'}</span>
      </div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">5</div>
    </div>
  </div>

  <!-- Page 6: Financial Analysis 1 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>4. Analyse Financière</h2>
    <div class="dimension-detail">
      <div class="dimension-header">
        <h3>Score Financier</h3>
        <div class="dimension-score" style="background: ${financierLevel.color}20; border: 3px solid ${financierLevel.color};">
          <div class="dimension-score-value" style="color: ${financierLevel.color}">${formatDecimal(scores.financier)}</div>
        </div>
      </div>
      <span class="benchmark-indicator benchmark-${financierLevel.level}">${financierLevel.label}</span>
      <div class="analysis-box">
        <p>La dimension financière représente <strong>35%</strong> du score global. Elle évalue la rentabilité, 
        la productivité et la maîtrise des charges de votre structure.</p>
      </div>
    </div>
    <h3>Indicateurs Clés</h3>
    <table class="table">
      <tr>
        <th>Indicateur</th>
        <th>Valeur</th>
        <th>Seuil Bon</th>
        <th>Seuil Excellent</th>
      </tr>
      <tr>
        <td>Marge Brute</td>
        <td><strong>${formatPercent(n.margeBrutePct)}</strong></td>
        <td>70%</td>
        <td>75%</td>
      </tr>
      <tr>
        <td>CA par ETP</td>
        <td><strong>${caEtp !== "—" ? formatNumber(parseInt(caEtp)) + ' €' : '—'}</strong></td>
        <td>100 000 €</td>
        <td>130 000 €</td>
      </tr>
      <tr>
        <td>Charges RH</td>
        <td><strong>${formatPercent(n.chargesRhPct)}</strong></td>
        <td>≤55%</td>
        <td>≤50%</td>
      </tr>
    </table>
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">6</div>
    </div>
  </div>

  <!-- Page 7: Financial Analysis 2 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>4. Analyse Financière (suite)</h2>
    <h3>Analyse de la Marge Brute</h3>
    <div class="card">
      <p>Votre marge brute de <strong>${formatPercent(n.margeBrutePct)}</strong> ${(n.margeBrutePct ?? 0) >= 70 ? 'atteint' : 'n\'atteint pas encore'} le seuil de performance.</p>
      <div class="progress-bar" style="margin-top: 16px;">
        <div class="progress-fill" style="width: ${Math.min(n.margeBrutePct ?? 0, 100)}%; background: ${(n.margeBrutePct ?? 0) >= 75 ? '#10b981' : (n.margeBrutePct ?? 0) >= 70 ? '#3b82f6' : '#f59e0b'}"></div>
      </div>
      <div class="analysis-box" style="margin-top: 16px;">
        <p><strong>Leviers d'amélioration :</strong></p>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>Révision de la politique tarifaire</li>
          <li>Négociation des coûts d'achat</li>
          <li>Optimisation du mix produits/services</li>
        </ul>
      </div>
    </div>
    <h3>Productivité par ETP</h3>
    <div class="card">
      <p>Le chiffre d'affaires par ETP s'élève à <strong>${caEtp !== "—" ? formatNumber(parseInt(caEtp)) + ' €' : '—'}</strong>.</p>
      <div class="analysis-box" style="margin-top: 16px;">
        <p><strong>Facteurs d'influence :</strong></p>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>Niveau de formation des équipes</li>
          <li>Outils et processus de travail</li>
          <li>Organisation du temps de travail</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">7</div>
    </div>
  </div>

  <!-- Page 8: Financial Analysis 3 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>4. Analyse Financière (fin)</h2>
    <h3>Structure des Charges RH</h3>
    <div class="card">
      <p>Les charges RH représentent <strong>${formatPercent(n.chargesRhPct)}</strong> du chiffre d'affaires.</p>
      <div class="progress-bar" style="margin-top: 16px;">
        <div class="progress-fill" style="width: ${Math.min(n.chargesRhPct ?? 0, 100)}%; background: ${(n.chargesRhPct ?? 0) <= 50 ? '#10b981' : (n.chargesRhPct ?? 0) <= 55 ? '#3b82f6' : '#f59e0b'}"></div>
      </div>
    </div>
    <div class="dimension-detail">
      <h3>Recommandations Financières</h3>
      ${scores.financier < 80 ? `
        <div class="action-priority ${scores.financier < 50 ? 'priority-high' : 'priority-medium'}">
          <strong>⚡</strong>
          <span>Réaliser un audit détaillé des coûts et de la structure tarifaire</span>
        </div>
        <div class="action-priority priority-medium">
          <strong>📊</strong>
          <span>Mettre en place un tableau de bord de suivi mensuel</span>
        </div>
        <div class="action-priority priority-low">
          <strong>📈</strong>
          <span>Former les équipes à la gestion financière</span>
        </div>
      ` : `
        <div class="strength-item">
          <span class="strength-icon">✓</span>
          <span>Excellente performance financière - Maintenir les bonnes pratiques</span>
        </div>
      `}
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">8</div>
    </div>
  </div>

  <!-- Page 9: Operational Analysis 1 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>5. Performance Opérationnelle</h2>
    <div class="dimension-detail">
      <div class="dimension-header">
        <h3>Score Opérationnel</h3>
        <div class="dimension-score" style="background: ${operationnelLevel.color}20; border: 3px solid ${operationnelLevel.color};">
          <div class="dimension-score-value" style="color: ${operationnelLevel.color}">${formatDecimal(scores.operationnel)}</div>
        </div>
      </div>
      <span class="benchmark-indicator benchmark-${operationnelLevel.level}">${operationnelLevel.label}</span>
      <div class="analysis-box">
        <p>La dimension opérationnelle représente <strong>25%</strong> du score global. Elle mesure 
        l'efficacité des opérations quotidiennes et l'utilisation des ressources.</p>
      </div>
    </div>
    <h3>Taux d'Occupation</h3>
    <div class="card">
      <div style="text-align: center; padding: 30px 0;">
        <div style="font-size: 64px; font-weight: 800; color: ${operationnelLevel.color};">
          ${n.tauxOccupation !== null ? formatDecimal(tauxOccupationPct, 0) + '%' : '—'}
        </div>
        <p style="color: #64748b; margin-top: 10px;">Taux d'occupation actuel</p>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${tauxOccupationPct}%; background: ${operationnelLevel.color}"></div>
      </div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${n.nom}</span>
      <div class="page-number">9</div>
    </div>
  </div>

  <!-- Page 10: Operational Analysis 2 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>5. Performance Opérationnelle (suite)</h2>
    <h3>Analyse du Taux d'Occupation</h3>
    <table class="table">
      <tr>
        <th>Niveau</th>
        <th>Seuil</th>
        <th>Interprétation</th>
      </tr>
      <tr>
        <td><span class="benchmark-indicator benchmark-excellent">Excellent</span></td>
        <td>≥85%</td>
        <td>Optimisation maximale des ressources</td>
      </tr>
      <tr>
        <td><span class="benchmark-indicator benchmark-bon">Bon</span></td>
        <td>70-85%</td>
        <td>Utilisation satisfaisante</td>
      </tr>
      <tr>
        <td><span class="benchmark-indicator benchmark-critique">À améliorer</span></td>
        <td>50-70%</td>
        <td>Marge de progression significative</td>
      </tr>
      <tr>
        <td><span class="benchmark-indicator benchmark-danger">Critique</span></td>
        <td>&lt;50%</td>
        <td>Sous-utilisation importante</td>
      </tr>
    </table>
    <div class="card" style="margin-top: 30px;">
      <h3>Impact sur la Rentabilité</h3>
      <p style="color: #64748b;">
        Chaque point de taux d'occupation supplémentaire représente une amélioration directe 
        de la productivité et du chiffre d'affaires potentiel.
      </p>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">10</div>
    </div>
  </div>

  <!-- Page 11: Operational Analysis 3 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>5. Performance Opérationnelle (fin)</h2>
    <h3>Recommandations Opérationnelles</h3>
    <div class="dimension-detail">
      <div class="action-priority priority-high">
        <strong>📅</strong>
        <span>Optimisation du planning et des créneaux de rendez-vous</span>
      </div>
      <div class="action-priority priority-medium">
        <strong>⏱️</strong>
        <span>Réduction des temps d'attente et des créneaux vides</span>
      </div>
      <div class="action-priority priority-low">
        <strong>🔄</strong>
        <span>Amélioration des processus de travail</span>
      </div>
    </div>
    <div class="dimension-detail">
      <h3>Plan d'Action Opérationnel</h3>
      <table class="table">
        <tr>
          <th>Action</th>
          <th>Priorité</th>
          <th>Échéance</th>
        </tr>
        <tr>
          <td>Audit des créneaux horaires</td>
          <td><span class="benchmark-indicator benchmark-danger">Haute</span></td>
          <td>1 mois</td>
        </tr>
        <tr>
          <td>Mise en place suivi temps réel</td>
          <td><span class="benchmark-indicator benchmark-critique">Moyenne</span></td>
          <td>3 mois</td>
        </tr>
        <tr>
          <td>Formation équipes</td>
          <td><span class="benchmark-indicator benchmark-bon">Standard</span></td>
          <td>6 mois</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">11</div>
    </div>
  </div>

  <!-- Page 12: Commercial Analysis 1 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>6. Dimension Commerciale</h2>
    <div class="dimension-detail">
      <div class="dimension-header">
        <h3>Score Commercial</h3>
        <div class="dimension-score" style="background: ${commercialLevel.color}20; border: 3px solid ${commercialLevel.color};">
          <div class="dimension-score-value" style="color: ${commercialLevel.color}">${formatDecimal(scores.commercial)}</div>
        </div>
      </div>
      <span class="benchmark-indicator benchmark-${commercialLevel.level}">${commercialLevel.label}</span>
      <div class="analysis-box">
        <p>La dimension commerciale représente <strong>20%</strong> du score global. Elle évalue 
        la maturité digitale et la capacité à fidéliser les clients.</p>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-item">
        <div class="kpi-value">${formatPercent(data?.digitalpct)}</div>
        <div class="kpi-label">Taux de Digitalisation</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${safeCalc(data?.digitalpct)}%; background: ${safeCalc(data?.digitalpct) >= 80 ? '#10b981' : '#f59e0b'}"></div>
        </div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value">${formatPercent(data?.fidelisationpct)}</div>
        <div class="kpi-label">Taux de Fidélisation</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${safeCalc(data?.fidelisationpct)}%; background: ${safeCalc(data?.fidelisationpct) >= 85 ? '#10b981' : '#f59e0b'}"></div>
        </div>
      </div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">12</div>
    </div>
  </div>

  <!-- Page 13: Commercial Analysis 2 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>6. Dimension Commerciale (suite)</h2>
    <h3>Maturité Digitale</h3>
    <div class="card">
      <p>Votre taux de digitalisation de <strong>${formatPercent(data?.digitalpct)}</strong> indique une ${safeCalc(data?.digitalpct) >= 80 ? 'excellente' : safeCalc(data?.digitalpct) >= 60 ? 'bonne' : 'marge de'} maturité digitale.</p>
      <div class="analysis-box" style="margin-top: 16px;">
        <p><strong>Composantes évaluées :</strong></p>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>Présence web et réseaux sociaux</li>
          <li>Prise de rendez-vous en ligne</li>
          <li>Communication digitale (email, SMS)</li>
          <li>Outils de gestion digitalisés</li>
        </ul>
      </div>
    </div>
    <h3>Fidélisation Client</h3>
    <div class="card">
      <p>Votre taux de fidélisation de <strong>${formatPercent(data?.fidelisationpct)}</strong> ${safeCalc(data?.fidelisationpct) >= 85 ? 'est excellent' : safeCalc(data?.fidelisationpct) >= 70 ? 'est satisfaisant' : 'peut être amélioré'}.</p>
      <div class="analysis-box" style="margin-top: 16px;">
        <p><strong>Leviers de fidélisation :</strong></p>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>Programme de fidélité structuré</li>
          <li>Suivi personnalisé des clients</li>
          <li>Rappels automatisés</li>
          <li>Offres exclusives</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">13</div>
    </div>
  </div>

  <!-- Page 14: Commercial Analysis 3 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>6. Dimension Commerciale (fin)</h2>
    <h3>Recommandations Commerciales</h3>
    <div class="dimension-detail">
      ${scores.commercial < 80 ? `
        <div class="action-priority ${scores.commercial < 50 ? 'priority-high' : 'priority-medium'}">
          <strong>🌐</strong>
          <span>Développer la présence digitale et les outils en ligne</span>
        </div>
        <div class="action-priority priority-medium">
          <strong>💳</strong>
          <span>Mettre en place un programme de fidélité structuré</span>
        </div>
        <div class="action-priority priority-low">
          <strong>📧</strong>
          <span>Automatiser les communications client (rappels, newsletters)</span>
        </div>
      ` : `
        <div class="strength-item">
          <span class="strength-icon">✓</span>
          <span>Excellente performance commerciale - Capitaliser sur les acquis</span>
        </div>
      `}
    </div>
    <h3>Objectifs à 12 Mois</h3>
    <table class="table">
      <tr>
        <th>Indicateur</th>
        <th>Actuel</th>
        <th>Objectif</th>
        <th>Gap</th>
      </tr>
      <tr>
        <td>Digitalisation</td>
        <td>${formatPercent(data?.digitalpct)}</td>
        <td>90%</td>
        <td>${Math.max(0, 90 - safeCalc(data?.digitalpct))}%</td>
      </tr>
      <tr>
        <td>Fidélisation</td>
        <td>${formatPercent(data?.fidelisationpct)}</td>
        <td>90%</td>
        <td>${Math.max(0, 90 - safeCalc(data?.fidelisationpct))}%</td>
      </tr>
    </table>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">14</div>
    </div>
  </div>

  <!-- Page 15: Strategic Analysis 1 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>7. Vision Stratégique</h2>
    <div class="dimension-detail">
      <div class="dimension-header">
        <h3>Score Stratégique</h3>
        <div class="dimension-score" style="background: ${strategiqueLevel.color}20; border: 3px solid ${strategiqueLevel.color};">
          <div class="dimension-score-value" style="color: ${strategiqueLevel.color}">${formatDecimal(scores.strategique)}</div>
        </div>
      </div>
      <span class="benchmark-indicator benchmark-${strategiqueLevel.level}">${strategiqueLevel.label}</span>
      <div class="analysis-box">
        <p>La dimension stratégique représente <strong>20%</strong> du score global. Elle évalue 
        la diversification de l'offre et le positionnement sur le marché.</p>
      </div>
    </div>
    <h3>Diversification de l'Offre</h3>
    <div class="card">
      <div style="text-align: center; padding: 30px 0;">
        <div style="font-size: 64px; font-weight: 800; color: ${strategiqueLevel.color};">
          ${formatNumber(data?.nbservices)}
        </div>
        <p style="color: #64748b; margin-top: 10px;">Services/Produits proposés</p>
      </div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">15</div>
    </div>
  </div>

  <!-- Page 16: Strategic Analysis 2 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>7. Vision Stratégique (suite)</h2>
    <h3>Analyse de l'Offre</h3>
    <div class="card">
      <p>Avec <strong>${formatNumber(data?.nbservices)} services/produits</strong>, votre offre ${safeCalc(data?.nbservices) >= 5 ? 'est bien diversifiée' : safeCalc(data?.nbservices) >= 3 ? 'couvre les besoins essentiels' : 'gagnerait à être élargie'}.</p>
      <div class="analysis-box" style="margin-top: 16px;">
        <p><strong>Bénéfices d'une offre diversifiée :</strong></p>
        <ul style="margin-top: 10px; padding-left: 20px;">
          <li>Augmentation du panier moyen</li>
          <li>Meilleure fidélisation client</li>
          <li>Réduction de la dépendance à un service</li>
          <li>Attractivité renforcée</li>
        </ul>
      </div>
    </div>
    <h3>Positionnement Concurrentiel</h3>
    <table class="table">
      <tr>
        <th>Critère</th>
        <th>Évaluation</th>
        <th>Commentaire</th>
      </tr>
      <tr>
        <td>Diversification</td>
        <td><span class="benchmark-indicator benchmark-${safeCalc(data?.nbservices) >= 5 ? 'excellent' : safeCalc(data?.nbservices) >= 3 ? 'bon' : 'critique'}">${safeCalc(data?.nbservices) >= 5 ? 'Fort' : safeCalc(data?.nbservices) >= 3 ? 'Moyen' : 'Faible'}</span></td>
        <td>${formatNumber(data?.nbservices)} services</td>
      </tr>
      <tr>
        <td>Innovation</td>
        <td><span class="benchmark-indicator benchmark-bon">À développer</span></td>
        <td>Potentiel d'expansion</td>
      </tr>
      <tr>
        <td>Adaptabilité</td>
        <td><span class="benchmark-indicator benchmark-${scores.commercial >= 70 ? 'excellent' : 'critique'}">${scores.commercial >= 70 ? 'Bonne' : 'À renforcer'}</span></td>
        <td>Basé sur score commercial</td>
      </tr>
    </table>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">16</div>
    </div>
  </div>

  <!-- Page 17: Strategic Analysis 3 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>7. Vision Stratégique (fin)</h2>
    <h3>Recommandations Stratégiques</h3>
    <div class="dimension-detail">
      <div class="action-priority priority-medium">
        <strong>🎯</strong>
        <span>Élaborer une vision stratégique à 3-5 ans</span>
      </div>
      <div class="action-priority priority-medium">
        <strong>📊</strong>
        <span>Réaliser une étude de marché pour identifier les opportunités</span>
      </div>
      <div class="action-priority priority-low">
        <strong>🚀</strong>
        <span>Développer de nouveaux services à forte valeur ajoutée</span>
      </div>
    </div>
    <h3>Axes de Développement Prioritaires</h3>
    <div class="card">
      <ol style="padding-left: 20px;">
        <li style="margin-bottom: 12px;"><strong>Court terme (0-6 mois)</strong> : Optimiser l'offre existante</li>
        <li style="margin-bottom: 12px;"><strong>Moyen terme (6-18 mois)</strong> : Développer 1-2 nouveaux services</li>
        <li style="margin-bottom: 12px;"><strong>Long terme (18-36 mois)</strong> : Consolider le positionnement</li>
      </ol>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">17</div>
    </div>
  </div>

  <!-- Page 18: Benchmarks 1 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>8. Benchmarks Sectoriels</h2>
    <div class="card">
      <h3>Référentiel ${data?.secteur || 'Général'}</h3>
      <p style="color: #64748b; margin-bottom: 20px;">
        Les benchmarks utilisés sont issus d'études sectorielles actualisées 
        et adaptés à la variante "${data?.variant || 'standard'}".
      </p>
    </div>
    <h3>Indicateurs Financiers</h3>
    <table class="table">
      <tr>
        <th>Indicateur</th>
        <th>Critique</th>
        <th>Bon</th>
        <th>Excellent</th>
        <th>Vous</th>
      </tr>
      <tr>
        <td>Marge brute</td>
        <td>&lt;55%</td>
        <td>70%</td>
        <td>≥75%</td>
        <td><strong>${formatPercent(data?.margebrutepct)}</strong></td>
      </tr>
      <tr>
        <td>CA/ETP</td>
        <td>&lt;70k€</td>
        <td>100k€</td>
        <td>≥130k€</td>
        <td><strong>${caEtp !== "—" ? formatNumber(parseInt(caEtp)) + '€' : '—'}</strong></td>
      </tr>
      <tr>
        <td>Charges RH</td>
        <td>&gt;70%</td>
        <td>≤55%</td>
        <td>≤50%</td>
        <td><strong>${formatPercent(data?.chargesrhpct)}</strong></td>
      </tr>
    </table>
    <h3 style="margin-top: 30px;">Indicateurs Commerciaux</h3>
    <table class="table">
      <tr>
        <th>Indicateur</th>
        <th>Critique</th>
        <th>Bon</th>
        <th>Excellent</th>
        <th>Vous</th>
      </tr>
      <tr>
        <td>Digitalisation</td>
        <td>&lt;30%</td>
        <td>80%</td>
        <td>≥95%</td>
        <td><strong>${formatPercent(data?.digitalpct)}</strong></td>
      </tr>
      <tr>
        <td>Fidélisation</td>
        <td>&lt;60%</td>
        <td>85%</td>
        <td>≥92%</td>
        <td><strong>${formatPercent(data?.fidelisationpct)}</strong></td>
      </tr>
    </table>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">18</div>
    </div>
  </div>

  <!-- Page 19: Benchmarks 2 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>8. Benchmarks Sectoriels (fin)</h2>
    <h3>Positionnement par Rapport au Marché</h3>
    <div class="dimension-detail">
      <div class="metric-row">
        <span class="metric-label">Score Global</span>
        <span class="metric-value">
          ${scores.global >= 80 ? 'Top 10%' : scores.global >= 60 ? 'Top 30%' : scores.global >= 40 ? 'Médiane' : 'À améliorer'} du secteur
        </span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Performance Financière</span>
        <span class="metric-value">${financierLevel.label}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Efficacité Opérationnelle</span>
        <span class="metric-value">${operationnelLevel.label}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Maturité Commerciale</span>
        <span class="metric-value">${commercialLevel.label}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Positionnement Stratégique</span>
        <span class="metric-value">${strategiqueLevel.label}</span>
      </div>
    </div>
    <div class="card">
      <h3>Méthodologie</h3>
      <p style="color: #64748b;">
        Le scoring 4D est basé sur une méthodologie éprouvée combinant :
      </p>
      <ul style="margin-top: 10px; padding-left: 20px; color: #64748b;">
        <li>Données sectorielles actualisées (v2.1)</li>
        <li>Pondération adaptée au secteur ${data?.secteur || 'général'}</li>
        <li>Comparaison avec les meilleures pratiques</li>
      </ul>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">19</div>
    </div>
  </div>

  <!-- Page 20: Action Plan 1 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>9. Plan d'Actions Prioritaires</h2>
    <div class="card">
      <h3>Priorisation des Actions</h3>
      <p style="color: #64748b; margin-bottom: 16px;">
        Les actions ci-dessous sont classées par ordre de priorité selon leur impact 
        potentiel et leur urgence.
      </p>
    </div>
    <h3>Actions Immédiates (0-3 mois)</h3>
    <div class="dimension-detail">
      ${scores.financier < 70 ? `
        <div class="action-priority priority-high">
          <strong>💰</strong>
          <span>Audit financier approfondi et plan de redressement si nécessaire</span>
        </div>
      ` : ''}
      ${scores.operationnel < 70 ? `
        <div class="action-priority priority-high">
          <strong>⚙️</strong>
          <span>Optimisation du taux d'occupation et des processus</span>
        </div>
      ` : ''}
      ${scores.commercial < 70 ? `
        <div class="action-priority priority-high">
          <strong>📱</strong>
          <span>Accélération de la transformation digitale</span>
        </div>
      ` : ''}
      <div class="action-priority priority-medium">
        <strong>📊</strong>
        <span>Mise en place d'un tableau de bord de pilotage</span>
      </div>
    </div>
    <h3>Actions à Moyen Terme (3-12 mois)</h3>
    <div class="dimension-detail">
      <div class="action-priority priority-medium">
        <strong>🎓</strong>
        <span>Formation continue des équipes</span>
      </div>
      <div class="action-priority priority-low">
        <strong>📈</strong>
        <span>Développement de nouveaux services</span>
      </div>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">20</div>
    </div>
  </div>

  <!-- Page 21: Action Plan 2 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>9. Plan d'Actions Prioritaires (fin)</h2>
    <h3>Calendrier de Mise en Œuvre</h3>
    <table class="table">
      <tr>
        <th>Phase</th>
        <th>Actions</th>
        <th>Échéance</th>
        <th>Indicateur</th>
      </tr>
      <tr>
        <td>Phase 1</td>
        <td>Quick wins opérationnels</td>
        <td>M+3</td>
        <td>+5 pts score opérationnel</td>
      </tr>
      <tr>
        <td>Phase 2</td>
        <td>Transformation digitale</td>
        <td>M+6</td>
        <td>+10 pts digitalisation</td>
      </tr>
      <tr>
        <td>Phase 3</td>
        <td>Excellence opérationnelle</td>
        <td>M+12</td>
        <td>Score global ≥70</td>
      </tr>
    </table>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">21</div>
    </div>
  </div>

  <!-- Page 22: Recommendations 1 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>10. Recommandations Détaillées</h2>
    <h3>Recommandations par Dimension</h3>
    <div class="dimension-detail">
      <h3 style="color: ${financierLevel.color};">Dimension Financière</h3>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">Optimiser la structure de coûts pour améliorer la marge brute</li>
        <li style="margin-bottom: 10px;">Augmenter la productivité par ETP via l'automatisation</li>
        <li style="margin-bottom: 10px;">Mettre en place un contrôle de gestion rigoureux</li>
      </ul>
    </div>
    <div class="dimension-detail">
      <h3 style="color: ${operationnelLevel.color};">Dimension Opérationnelle</h3>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">Optimiser la gestion des plannings et des rendez-vous</li>
        <li style="margin-bottom: 10px;">Réduire les temps d'attente et améliorer le flux patient</li>
        <li style="margin-bottom: 10px;">Mettre en place des indicateurs de suivi en temps réel</li>
      </ul>
    </div>
    <div class="dimension-detail">
      <h3 style="color: ${commercialLevel.color};">Dimension Commerciale</h3>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">Développer la présence digitale (site web, réseaux sociaux)</li>
        <li style="margin-bottom: 10px;">Implémenter un système de prise de RDV en ligne</li>
        <li style="margin-bottom: 10px;">Créer un programme de fidélité attractif</li>
      </ul>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">22</div>
    </div>
  </div>

  <!-- Page 23: Recommendations 2 -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>10. Recommandations Détaillées (fin)</h2>
    <div class="dimension-detail">
      <h3 style="color: ${strategiqueLevel.color};">Dimension Stratégique</h3>
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 10px;">Diversifier l'offre de services pour augmenter le panier moyen</li>
        <li style="margin-bottom: 10px;">Élaborer un plan stratégique à 3-5 ans</li>
        <li style="margin-bottom: 10px;">Identifier les opportunités de développement et d'innovation</li>
      </ul>
    </div>
    <h3>Ressources Recommandées</h3>
    <div class="card">
      <div class="metric-row">
        <span class="metric-label">Budget formation</span>
        <span class="metric-value">2-3% du CA</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Budget digital</span>
        <span class="metric-value">3-5% du CA</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Temps de mise en œuvre</span>
        <span class="metric-value">12-18 mois</span>
      </div>
    </div>
    <h3>Points de Vigilance</h3>
    <div class="card" style="background: #fef3c7; border-left-color: #f59e0b;">
      <ul style="padding-left: 20px;">
        <li style="margin-bottom: 8px;">Ne pas négliger la qualité de service pendant la transformation</li>
        <li style="margin-bottom: 8px;">Impliquer les équipes dans les changements</li>
        <li style="margin-bottom: 8px;">Mesurer régulièrement les progrès</li>
      </ul>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">23</div>
    </div>
  </div>

  <!-- Page 24: Conclusion -->
  <div class="page">
    <div class="header">
      <div class="logo">Audit<span>Score</span></div>
      <div class="date">${date}</div>
    </div>
    <h2>11. Conclusion et Prochaines Étapes</h2>
    <div class="card" style="text-align: center; padding: 40px;">
      <div class="score-circle" style="margin: 0 auto 30px;">
        <div class="score-value">${formatDecimal(scores.global)}</div>
        <div class="score-label">${globalLevel.label}</div>
      </div>
      <h3 style="margin-bottom: 20px;">Score Global : ${formatDecimal(scores.global)}/100</h3>
      <p style="color: #64748b; max-width: 500px; margin: 0 auto;">
        ${data?.nom || 'Votre entreprise'} présente un profil ${globalLevel.label.toLowerCase()} 
        avec des axes d'amélioration identifiés et des points forts à capitaliser.
      </p>
    </div>
    <h3>Prochaines Étapes</h3>
    <div class="dimension-detail">
      <ol style="padding-left: 20px;">
        <li style="margin-bottom: 16px;">
          <strong>Semaine 1</strong> : Présentation des résultats à l'équipe dirigeante
        </li>
        <li style="margin-bottom: 16px;">
          <strong>Semaine 2-3</strong> : Priorisation des actions et allocation des ressources
        </li>
        <li style="margin-bottom: 16px;">
          <strong>Mois 1</strong> : Lancement des premières actions quick wins
        </li>
        <li style="margin-bottom: 16px;">
          <strong>Mois 3</strong> : Point d'étape et ajustement du plan
        </li>
        <li style="margin-bottom: 16px;">
          <strong>Mois 6</strong> : Audit intermédiaire de suivi
        </li>
      </ol>
    </div>
    <div class="card" style="text-align: center; background: linear-gradient(135deg, #6366f120, #6366f140);">
      <p style="font-size: 18px; font-weight: 600; color: #6366f1;">
        Merci pour votre confiance !
      </p>
      <p style="color: #64748b; margin-top: 10px;">
        AuditScore • Scoring 4D paramétré • ${new Date().getFullYear()}
      </p>
    </div>
    <div class="footer">
      <span>Rapport confidentiel - ${data?.nom || 'Entreprise'}</span>
      <div class="page-number">24</div>
    </div>
  </div>

</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { auditData, scores } = body;

    // Validate required fields
    if (!auditData) {
      return new Response(
        JSON.stringify({ error: 'Missing auditData in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!scores) {
      return new Response(
        JSON.stringify({ error: 'Missing scores in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate scores have required properties with defaults
    const validatedScores: Scores = {
      global: toNumber(scores?.global) ?? 0,
      financier: toNumber(scores?.financier) ?? 0,
      operationnel: toNumber(scores?.operationnel) ?? 0,
      commercial: toNumber(scores?.commercial) ?? 0,
      strategique: toNumber(scores?.strategique) ?? 0,
    };

    console.log('Generating PDF report for:', auditData?.nom || 'Unknown company');
    
    const htmlContent = generateHTMLReport(auditData, validatedScores);

    // Return HTML content that can be converted to PDF on the client side
    return new Response(
      JSON.stringify({ html: htmlContent }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
