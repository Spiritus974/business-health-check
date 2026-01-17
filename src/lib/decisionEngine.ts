/**
 * Decision Engine - Deterministic business logic for decision support
 * All rules are explicit and traceable - no hidden logic
 */

import { AuditData, AuditWarning, normalizeToV2 } from '@/types/audit';
import { Scores } from '@/types/audit';

// ============= Types =============

export type PriorityLevel = 'CRITIQUE' | 'ÉLEVÉ' | 'MODÉRÉ' | 'FAIBLE';

export interface DecisionOutput {
  priorityLevel: PriorityLevel;
  topRisks: string[];
  topLevers: string[];
  quickWins: string[];
  structuralActions: string[];
  decisionSummary: string;
}

interface RiskRule {
  id: string;
  condition: (data: ReturnType<typeof normalizeToV2>, scores: Scores) => boolean;
  risk: string;
  lever: string;
  category: 'financial' | 'operational' | 'hr' | 'commercial' | 'strategic';
  severity: 'critical' | 'high' | 'medium' | 'low';
  quickWin?: string;
  structuralAction?: string;
}

// ============= Explicit Rules (all visible in code) =============

const RISK_RULES: RiskRule[] = [
  // === FINANCIAL RISKS ===
  {
    id: 'runway_critical',
    condition: (data) => data.finance.cashRunwayMonths !== undefined && data.finance.cashRunwayMonths < 3,
    risk: 'Risque de continuité : trésorerie critique (moins de 3 mois)',
    lever: 'Sécuriser la trésorerie avant toute autre action',
    category: 'financial',
    severity: 'critical',
    structuralAction: 'Renégocier les délais de paiement et optimiser le BFR',
  },
  {
    id: 'runway_warning',
    condition: (data) => data.finance.cashRunwayMonths !== undefined && data.finance.cashRunwayMonths >= 3 && data.finance.cashRunwayMonths < 6,
    risk: 'Trésorerie tendue : vigilance sur le cash',
    lever: 'Mettre en place un suivi hebdomadaire de trésorerie',
    category: 'financial',
    severity: 'high',
    quickWin: 'Relancer les créances clients en retard',
  },
  {
    id: 'low_gross_margin',
    condition: (data, scores) => scores.financier < 45,
    risk: 'Marge brute insuffisante pour absorber les aléas',
    lever: 'Réviser la politique tarifaire et les coûts d\'achat',
    category: 'financial',
    severity: 'high',
    structuralAction: 'Analyser la structure de coûts par activité/produit',
  },
  {
    id: 'negative_net_margin',
    condition: (data) => data.finance.netMarginPercent !== undefined && data.finance.netMarginPercent < 0,
    risk: 'Résultat net négatif : modèle économique déficitaire',
    lever: 'Identifier les centres de coûts à optimiser en priorité',
    category: 'financial',
    severity: 'critical',
    structuralAction: 'Plan de redressement avec objectifs chiffrés',
  },

  // === HR RISKS ===
  {
    id: 'hr_cost_high',
    condition: (data) => data.costs.hrCostsPercent > 50 && (data.hr?.absenteeismRatePercent ?? 0) > 8,
    risk: 'Risque humain majeur : coûts RH élevés combinés à un absentéisme important',
    lever: 'Rééquilibrer la structure RH avant toute action commerciale',
    category: 'hr',
    severity: 'critical',
    structuralAction: 'Audit social et plan QVT ciblé',
  },
  {
    id: 'high_absenteeism',
    condition: (data) => (data.hr?.absenteeismRatePercent ?? 0) > 8 && (data.hr?.absenteeismRatePercent ?? 0) <= 15,
    risk: 'Absentéisme élevé : signal de dysfonctionnement organisationnel',
    lever: 'Analyser les causes d\'absentéisme par service/poste',
    category: 'hr',
    severity: 'high',
    quickWin: 'Entretiens individuels pour identifier les irritants',
  },
  {
    id: 'critical_absenteeism',
    condition: (data) => (data.hr?.absenteeismRatePercent ?? 0) > 15,
    risk: 'Absentéisme critique : désengagement généralisé',
    lever: 'Lancer un diagnostic social approfondi',
    category: 'hr',
    severity: 'critical',
    structuralAction: 'Plan de transformation RH avec accompagnement externe',
  },
  {
    id: 'high_turnover',
    condition: (data) => (data.hr?.turnoverRatePercent ?? 0) > 25 && (data.hr?.turnoverRatePercent ?? 0) <= 40,
    risk: 'Turnover élevé : perte de compétences et coûts de recrutement',
    lever: 'Renforcer la politique de fidélisation des talents',
    category: 'hr',
    severity: 'high',
    quickWin: 'Entretiens de sortie systématiques pour comprendre les départs',
  },
  {
    id: 'critical_turnover',
    condition: (data) => (data.hr?.turnoverRatePercent ?? 0) > 40,
    risk: 'Turnover critique : instabilité des équipes',
    lever: 'Réviser la politique salariale et les conditions de travail',
    category: 'hr',
    severity: 'critical',
    structuralAction: 'Benchmark salarial et plan de rétention',
  },

  // === OPERATIONAL RISKS ===
  {
    id: 'low_occupancy',
    condition: (data) => data.ops.occupancyRatePercent < 65,
    risk: 'Inefficacité structurelle : sous-utilisation des capacités',
    lever: 'Améliorer le taux d\'occupation avant d\'investir en marketing',
    category: 'operational',
    severity: 'high',
    quickWin: 'Optimiser le planning et réduire les créneaux vides',
    structuralAction: 'Revoir le dimensionnement de l\'équipe',
  },
  {
    id: 'very_high_occupancy',
    condition: (data) => data.ops.occupancyRatePercent > 95,
    risk: 'Saturation opérationnelle : risque qualité et épuisement',
    lever: 'Anticiper les capacités avant que la qualité ne se dégrade',
    category: 'operational',
    severity: 'medium',
    quickWin: 'Identifier les pics d\'activité et lisser la charge',
  },
  {
    id: 'low_productivity',
    condition: (data, scores) => scores.operationnel < 50,
    risk: 'Productivité insuffisante : CA/ETP sous les benchmarks sectoriels',
    lever: 'Optimiser les processus et réduire les temps improductifs',
    category: 'operational',
    severity: 'high',
    structuralAction: 'Cartographie des processus et identification des goulots',
  },
  {
    id: 'quality_issues',
    condition: (data) => (data.ops.quality?.returnRatePercent ?? 0) > 5,
    risk: 'Problèmes qualité récurrents : impact sur la satisfaction client',
    lever: 'Mettre en place des contrôles qualité systématiques',
    category: 'operational',
    severity: 'medium',
    quickWin: 'Analyser les causes des 5 derniers incidents majeurs',
  },

  // === COMMERCIAL RISKS ===
  {
    id: 'low_digitalization',
    condition: (data) => data.commercial.digitalizationPercent < 40,
    risk: 'Risque commercial moyen terme : retard digital significatif',
    lever: 'Prioriser la digitalisation des interactions client',
    category: 'commercial',
    severity: 'high',
    quickWin: 'Mettre en place un outil de prise de RDV en ligne',
    structuralAction: 'Plan de transformation digitale sur 12 mois',
  },
  {
    id: 'moderate_digitalization',
    condition: (data) => data.commercial.digitalizationPercent >= 40 && data.commercial.digitalizationPercent < 60,
    risk: 'Digitalisation partielle : opportunités non exploitées',
    lever: 'Compléter les outils digitaux existants',
    category: 'commercial',
    severity: 'medium',
    quickWin: 'Automatiser les rappels clients (email/SMS)',
  },
  {
    id: 'low_loyalty',
    condition: (data) => (data.commercial.loyaltyPercent ?? 100) < 60,
    risk: 'Fidélisation faible : coût d\'acquisition élevé',
    lever: 'Mettre en place un programme de fidélisation structuré',
    category: 'commercial',
    severity: 'high',
    quickWin: 'Offre de bienvenue pour les nouveaux clients récurrents',
  },
  {
    id: 'low_satisfaction',
    condition: (data) => (data.commercial.satisfaction?.csatPercent ?? 100) < 75,
    risk: 'Satisfaction client insuffisante : risque de churn',
    lever: 'Identifier et traiter les irritants clients prioritaires',
    category: 'commercial',
    severity: 'high',
    quickWin: 'Enquête satisfaction flash auprès des 20 derniers clients',
  },
  {
    id: 'negative_nps',
    condition: (data) => (data.commercial.satisfaction?.nps ?? 50) < 0,
    risk: 'NPS négatif : plus de détracteurs que de promoteurs',
    lever: 'Plan d\'action ciblé sur les détracteurs',
    category: 'commercial',
    severity: 'high',
    structuralAction: 'Refonte de l\'expérience client end-to-end',
  },

  // === STRATEGIC RISKS ===
  {
    id: 'dimension_imbalance',
    condition: (_, scores) => {
      const dims = [scores.financier, scores.operationnel, scores.commercial, scores.strategique];
      return Math.max(...dims) - Math.min(...dims) > 30;
    },
    risk: 'Déséquilibre fort entre les dimensions : fragilité du modèle',
    lever: 'Rééquilibrer les investissements entre les 4 axes',
    category: 'strategic',
    severity: 'medium',
    structuralAction: 'Plan d\'action différencié par dimension',
  },
  {
    id: 'low_diversification',
    condition: (data) => (data.nbServices ?? 1) <= 2,
    risk: 'Dépendance à une offre limitée : vulnérabilité commerciale',
    lever: 'Identifier des opportunités de diversification de l\'offre',
    category: 'strategic',
    severity: 'medium',
    structuralAction: 'Étude de marché pour nouvelles lignes de services',
  },
];

// ============= Priority Determination =============

function determinePriorityLevel(scores: Scores, triggeredRules: RiskRule[]): PriorityLevel {
  // Rule 1: Global score < 40 → CRITIQUE
  if (scores.global < 40) {
    return 'CRITIQUE';
  }

  // Rule 2: Any critical severity rule triggered → CRITIQUE
  if (triggeredRules.some(r => r.severity === 'critical')) {
    return 'CRITIQUE';
  }

  // Rule 3: Global score < 50 OR 2+ high severity rules → ÉLEVÉ
  if (scores.global < 50 || triggeredRules.filter(r => r.severity === 'high').length >= 2) {
    return 'ÉLEVÉ';
  }

  // Rule 4: Global score < 60 OR any high severity rule → MODÉRÉ
  if (scores.global < 60 || triggeredRules.some(r => r.severity === 'high')) {
    return 'MODÉRÉ';
  }

  // Rule 5: Otherwise → FAIBLE
  return 'FAIBLE';
}

// ============= Summary Generation =============

function generateDecisionSummary(
  priorityLevel: PriorityLevel,
  topRisks: string[],
  topLevers: string[],
  scores: Scores
): string {
  const riskCount = topRisks.length;

  switch (priorityLevel) {
    case 'CRITIQUE':
      return `Situation critique nécessitant une action immédiate. ${riskCount} risque${riskCount > 1 ? 's' : ''} majeur${riskCount > 1 ? 's' : ''} identifié${riskCount > 1 ? 's' : ''}. Priorité : stabiliser avant d'optimiser.`;
    case 'ÉLEVÉ':
      return `Plusieurs zones de fragilité identifiées (score global : ${scores.global}/100). Actions correctives recommandées sous 30 jours.`;
    case 'MODÉRÉ':
      return `Performance globale satisfaisante avec des axes d'amélioration ciblés. Plan d'action à 3 mois recommandé.`;
    case 'FAIBLE':
      return `Situation maîtrisée. Maintenir la vigilance et poursuivre l'optimisation continue des performances.`;
  }
}

// ============= Main Engine Function =============

export function computeDecisionOutput(
  auditData: AuditData,
  scores: Scores,
  warnings: AuditWarning[]
): DecisionOutput {
  const v2 = normalizeToV2(auditData);

  // Evaluate all rules
  const triggeredRules = RISK_RULES.filter(rule => rule.condition(v2, scores));

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  triggeredRules.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Extract top 3 risks and levers
  const topRisks = triggeredRules.slice(0, 3).map(r => r.risk);
  const topLevers = triggeredRules.slice(0, 3).map(r => r.lever);

  // Collect quick wins and structural actions
  const quickWins = triggeredRules
    .filter(r => r.quickWin)
    .slice(0, 3)
    .map(r => r.quickWin as string);

  const structuralActions = triggeredRules
    .filter(r => r.structuralAction)
    .slice(0, 3)
    .map(r => r.structuralAction as string);

  // Determine priority level
  const priorityLevel = determinePriorityLevel(scores, triggeredRules);

  // Generate summary
  const decisionSummary = generateDecisionSummary(priorityLevel, topRisks, topLevers, scores);

  return {
    priorityLevel,
    topRisks,
    topLevers,
    quickWins,
    structuralActions,
    decisionSummary,
  };
}

// ============= Utility Functions =============

export function getPriorityColor(level: PriorityLevel): string {
  switch (level) {
    case 'CRITIQUE':
      return 'hsl(var(--destructive))';
    case 'ÉLEVÉ':
      return 'hsl(var(--warning))';
    case 'MODÉRÉ':
      return 'hsl(var(--accent))';
    case 'FAIBLE':
      return 'hsl(var(--success))';
  }
}

export function getPriorityBadgeClass(level: PriorityLevel): string {
  switch (level) {
    case 'CRITIQUE':
      return 'bg-destructive text-destructive-foreground';
    case 'ÉLEVÉ':
      return 'bg-warning text-warning-foreground';
    case 'MODÉRÉ':
      return 'bg-accent text-accent-foreground';
    case 'FAIBLE':
      return 'bg-success text-success-foreground';
  }
}

// Disclaimer to include in all outputs
export const DECISION_DISCLAIMER = 
  "Cette synthèse constitue une aide à la décision et ne remplace pas un jugement expert.";
