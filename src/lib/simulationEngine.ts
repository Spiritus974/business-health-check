// ============ Simulation Engine - Deterministic Decision Support ============

import { AuditDataV2, Scores, normalizeToV2 } from '@/types/audit';
import { 
  SimulationType, 
  SimulationResult, 
  SimulationInput,
  ConfidenceLevel 
} from '@/types/simulation';

// ============ Helper Functions ============

function safeNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M €`;
  if (value >= 1000) return `${Math.round(value / 1000)}k €`;
  return `${Math.round(value)} €`;
}

// ============ Confidence Level Calculation ============

function calculateConfidence(
  dataCompleteness: number,
  simulationType: SimulationType
): ConfidenceLevel {
  // RH simulations are inherently less precise
  if (simulationType === 'RH') {
    return dataCompleteness >= 0.8 ? 'MOYEN' : 'FAIBLE';
  }
  
  if (dataCompleteness >= 0.9) return 'BON';
  if (dataCompleteness >= 0.7) return 'MOYEN';
  return 'FAIBLE';
}

// ============ Data Completeness Check ============

function checkDataCompleteness(data: AuditDataV2, requiredFields: string[]): number {
  let filled = 0;
  
  for (const field of requiredFields) {
    const parts = field.split('.');
    let value: unknown = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }
    
    if (value !== undefined && value !== null) {
      filled++;
    }
  }
  
  return filled / requiredFields.length;
}

// ============ Simulation Calculators ============

export function simulateTresorerie(
  data: AuditDataV2,
  inputs: Record<string, number>
): SimulationResult | null {
  const caAnnuel = safeNumber(data.finance?.annualRevenue);
  const chargesRhPct = safeNumber(data.costs?.hrCostsPercent);
  const chargesFixes = caAnnuel * (chargesRhPct / 100) / 12; // Estimate if not available
  
  if (caAnnuel === 0) return null;
  
  const delaiClient = inputs.delai_client || 0;
  const delaiFournisseur = inputs.delai_fournisseur || 0;
  const reductionCharges = inputs.reduction_charges || 0;
  
  // Skip if no changes
  if (delaiClient === 0 && delaiFournisseur === 0 && reductionCharges === 0) {
    return null;
  }
  
  // Deterministic calculation with conservative bounds
  const caMensuel = caAnnuel / 12;
  const caJournalier = caAnnuel / 365;
  
  // Impact délai client (conservative: 60-80% of theoretical gain)
  const gainDelaiClient = Math.abs(delaiClient) * caJournalier;
  const gainDelaiClientMin = gainDelaiClient * 0.6;
  const gainDelaiClientMax = gainDelaiClient * 0.8;
  
  // Impact délai fournisseur (conservative: 50-70%)
  const gainDelaiFournisseur = delaiFournisseur * (caMensuel * 0.3) / 30;
  const gainDelaiFournisseurMin = gainDelaiFournisseur * 0.5;
  const gainDelaiFournisseurMax = gainDelaiFournisseur * 0.7;
  
  // Impact charges fixes
  const gainChargesFixes = chargesFixes * Math.abs(reductionCharges) / 100 * 12;
  const gainChargesFixesMin = gainChargesFixes * 0.7;
  const gainChargesFixesMax = gainChargesFixes * 0.9;
  
  const totalMin = gainDelaiClientMin + gainDelaiFournisseurMin + gainChargesFixesMin;
  const totalMax = gainDelaiClientMax + gainDelaiFournisseurMax + gainChargesFixesMax;
  
  // Calculate runway impact in days
  const burnMensuel = chargesFixes > 0 ? chargesFixes : caMensuel * 0.4;
  const runwayGainMin = Math.round((totalMin / burnMensuel) * 30);
  const runwayGainMax = Math.round((totalMax / burnMensuel) * 30);
  
  const inputsList: SimulationInput[] = [];
  const hypotheses: string[] = [];
  const effects: string[] = [];
  
  if (delaiClient !== 0) {
    inputsList.push({
      id: 'delai_client',
      label: 'Réduction délai client',
      value: delaiClient,
      unit: 'jours',
      description: `Passage de délai client à J${Math.abs(delaiClient)} plus tôt`
    });
    hypotheses.push(`Réduction effective du DSO de ${Math.abs(delaiClient)} jours`);
    effects.push('Amélioration du BFR');
  }
  
  if (delaiFournisseur !== 0) {
    inputsList.push({
      id: 'delai_fournisseur',
      label: 'Allongement délai fournisseur',
      value: delaiFournisseur,
      unit: 'jours',
      description: `Négociation de +${delaiFournisseur} jours`
    });
    hypotheses.push(`Négociation réussie avec les fournisseurs clés`);
  }
  
  if (reductionCharges !== 0) {
    inputsList.push({
      id: 'reduction_charges',
      label: 'Réduction charges fixes',
      value: reductionCharges,
      unit: '%',
      description: `Réduction de ${Math.abs(reductionCharges)}%`
    });
    hypotheses.push(`Réduction effective des charges fixes de ${Math.abs(reductionCharges)}%`);
    effects.push('Réduction du point mort');
  }
  
  hypotheses.push('Maintien du niveau d\'activité actuel');
  hypotheses.push('Pas de détérioration de la relation client/fournisseur');
  
  const completeness = checkDataCompleteness(data, [
    'finance.caAnnuel',
    'finance.chargesFixesMensuelles',
    'finance.tresorerieNette'
  ]);
  
  return {
    id: `tresorerie_${Date.now()}`,
    type: 'TRESORERIE',
    title: 'Simulation trésorerie',
    description: `Impact estimé sur la trésorerie annuelle`,
    inputs: inputsList,
    impactMin: Math.round(totalMin),
    impactMax: Math.round(totalMax),
    impactUnit: '€',
    impactLabel: `${formatCurrency(totalMin)} à ${formatCurrency(totalMax)} / an (soit +${runwayGainMin} à +${runwayGainMax} jours de runway)`,
    secondaryEffects: effects,
    hypotheses,
    confidenceLevel: calculateConfidence(completeness, 'TRESORERIE'),
    priority: 1
  };
}

export function simulateRentabilite(
  data: AuditDataV2,
  inputs: Record<string, number>
): SimulationResult | null {
  const caAnnuel = safeNumber(data.finance?.annualRevenue);
  const margeBrute = safeNumber(data.finance?.grossMarginPercent);
  const chargesRh = safeNumber(data.costs?.hrCostsPercent);
  
  if (caAnnuel === 0) return null;
  
  const hausseMarge = inputs.marge_brute || 0;
  const reductionCogs = inputs.reduction_cogs || 0;
  const reductionRh = inputs.reduction_rh || 0;
  
  if (hausseMarge === 0 && reductionCogs === 0 && reductionRh === 0) {
    return null;
  }
  
  // Impact marge brute (direct: 1 point = 1% du CA)
  const gainMargeMin = (hausseMarge / 100) * caAnnuel * 0.7;
  const gainMargeMax = (hausseMarge / 100) * caAnnuel * 0.9;
  
  // Impact COGS (sur la partie hors marge)
  const cogs = caAnnuel * (1 - margeBrute / 100);
  const gainCogsMin = cogs * Math.abs(reductionCogs) / 100 * 0.6;
  const gainCogsMax = cogs * Math.abs(reductionCogs) / 100 * 0.85;
  
  // Impact RH
  const chargesRhAnnuel = caAnnuel * (chargesRh / 100);
  const gainRhMin = chargesRhAnnuel * Math.abs(reductionRh) / 100 * 0.5;
  const gainRhMax = chargesRhAnnuel * Math.abs(reductionRh) / 100 * 0.75;
  
  const totalMin = gainMargeMin + gainCogsMin + gainRhMin;
  const totalMax = gainMargeMax + gainCogsMax + gainRhMax;
  
  const inputsList: SimulationInput[] = [];
  const hypotheses: string[] = [];
  const effects: string[] = [];
  
  if (hausseMarge !== 0) {
    inputsList.push({
      id: 'marge_brute',
      label: 'Augmentation marge brute',
      value: hausseMarge,
      unit: 'points',
      description: `+${hausseMarge} point(s) de marge`
    });
    hypotheses.push(`Augmentation effective de la marge de ${hausseMarge} point(s)`);
    effects.push('Renforcement de la capacité d\'autofinancement');
  }
  
  if (reductionCogs !== 0) {
    inputsList.push({
      id: 'reduction_cogs',
      label: 'Réduction COGS',
      value: reductionCogs,
      unit: '%',
      description: `${reductionCogs}% sur les coûts directs`
    });
    hypotheses.push(`Négociation achats ou optimisation processus réussie`);
  }
  
  if (reductionRh !== 0) {
    inputsList.push({
      id: 'reduction_rh',
      label: 'Réduction charges RH',
      value: reductionRh,
      unit: '%',
      description: `${reductionRh}% sur les charges de personnel`
    });
    hypotheses.push(`Optimisation sans dégradation de la qualité de service`);
    effects.push('Vigilance sur le climat social');
  }
  
  hypotheses.push('Maintien du volume d\'activité');
  hypotheses.push('Pas d\'impact négatif sur la qualité');
  
  const completeness = checkDataCompleteness(data, [
    'finance.caAnnuel',
    'finance.margeBrutePct',
    'costs.chargesRhPct'
  ]);
  
  return {
    id: `rentabilite_${Date.now()}`,
    type: 'RENTABILITE',
    title: 'Simulation rentabilité',
    description: 'Impact estimé sur le résultat net annuel',
    inputs: inputsList,
    impactMin: Math.round(totalMin),
    impactMax: Math.round(totalMax),
    impactUnit: '€',
    impactLabel: `+${formatCurrency(totalMin)} à +${formatCurrency(totalMax)} / an`,
    secondaryEffects: effects,
    hypotheses,
    confidenceLevel: calculateConfidence(completeness, 'RENTABILITE'),
    priority: 2
  };
}

export function simulateActivite(
  data: AuditDataV2,
  inputs: Record<string, number>
): SimulationResult | null {
  const caAnnuel = safeNumber(data.finance?.annualRevenue);
  const tauxOccupation = safeNumber(data.ops?.occupancyRatePercent);
  
  if (caAnnuel === 0) return null;
  
  const hausseOccupation = inputs.taux_occupation || 0;
  const hausseProductivite = inputs.ca_par_etp || 0;
  
  if (hausseOccupation === 0 && hausseProductivite === 0) {
    return null;
  }
  
  // Impact occupation (proportionnel mais avec décote de réalisation)
  const gainOccupationTheorique = (hausseOccupation / 100) * caAnnuel;
  const gainOccupationMin = gainOccupationTheorique * 0.5;
  const gainOccupationMax = gainOccupationTheorique * 0.75;
  
  // Impact productivité
  const gainProductiviteTheorique = (hausseProductivite / 100) * caAnnuel;
  const gainProductiviteMin = gainProductiviteTheorique * 0.6;
  const gainProductiviteMax = gainProductiviteTheorique * 0.85;
  
  const totalMin = gainOccupationMin + gainProductiviteMin;
  const totalMax = gainOccupationMax + gainProductiviteMax;
  
  const inputsList: SimulationInput[] = [];
  const hypotheses: string[] = [];
  const effects: string[] = [];
  
  if (hausseOccupation !== 0) {
    inputsList.push({
      id: 'taux_occupation',
      label: 'Hausse taux d\'occupation',
      value: hausseOccupation,
      unit: 'points',
      description: `+${hausseOccupation} points d'occupation`
    });
    hypotheses.push(`Amélioration du planning de ${hausseOccupation} points`);
    hypotheses.push(`Demande suffisante pour absorber la capacité libérée`);
    effects.push('Effet positif potentiel sur la marge (économies d\'échelle)');
  }
  
  if (hausseProductivite !== 0) {
    inputsList.push({
      id: 'ca_par_etp',
      label: 'Hausse CA par ETP',
      value: hausseProductivite,
      unit: '%',
      description: `+${hausseProductivite}% de productivité`
    });
    hypotheses.push(`Gains de productivité de ${hausseProductivite}% réalisables`);
    effects.push('Vigilance sur la charge de travail');
  }
  
  hypotheses.push('Pas de saturation de la demande');
  
  const completeness = checkDataCompleteness(data, [
    'finance.caAnnuel',
    'ops.tauxOccupation',
    'productivity.effectifETP'
  ]);
  
  return {
    id: `activite_${Date.now()}`,
    type: 'ACTIVITE',
    title: 'Simulation activité',
    description: 'Impact estimé sur le chiffre d\'affaires annuel',
    inputs: inputsList,
    impactMin: Math.round(totalMin),
    impactMax: Math.round(totalMax),
    impactUnit: '€',
    impactLabel: `+${formatCurrency(totalMin)} à +${formatCurrency(totalMax)} / an`,
    secondaryEffects: effects,
    hypotheses,
    confidenceLevel: calculateConfidence(completeness, 'ACTIVITE'),
    priority: 3
  };
}

export function simulateCommercial(
  data: AuditDataV2,
  inputs: Record<string, number>
): SimulationResult | null {
  const caAnnuel = safeNumber(data.finance?.annualRevenue);
  // Estimate panier moyen if not available
  const panierMoyen = caAnnuel / 1000;
  
  if (caAnnuel === 0) return null;
  
  const hausseConversion = inputs.taux_conversion || 0;
  const haussePanier = inputs.panier_moyen || 0;
  
  if (hausseConversion === 0 && haussePanier === 0) {
    return null;
  }
  
  // Impact conversion (très variable selon secteur)
  const gainConversionTheorique = (hausseConversion / 100) * caAnnuel;
  const gainConversionMin = gainConversionTheorique * 0.3;
  const gainConversionMax = gainConversionTheorique * 0.6;
  
  // Impact panier moyen
  const gainPanierTheorique = (haussePanier / 100) * caAnnuel;
  const gainPanierMin = gainPanierTheorique * 0.5;
  const gainPanierMax = gainPanierTheorique * 0.8;
  
  const totalMin = gainConversionMin + gainPanierMin;
  const totalMax = gainConversionMax + gainPanierMax;
  
  // Sensibilité volume
  const nbTransactions = caAnnuel / panierMoyen;
  let sensibilite = 'modérée';
  if (nbTransactions > 10000) sensibilite = 'élevée';
  else if (nbTransactions < 500) sensibilite = 'faible';
  
  const inputsList: SimulationInput[] = [];
  const hypotheses: string[] = [];
  const effects: string[] = [];
  
  if (hausseConversion !== 0) {
    inputsList.push({
      id: 'taux_conversion',
      label: 'Hausse taux de conversion',
      value: hausseConversion,
      unit: 'points',
      description: `+${hausseConversion} point(s) de conversion`
    });
    hypotheses.push(`Amélioration du parcours client et de l'argumentaire`);
    hypotheses.push(`Trafic entrant maintenu ou en hausse`);
  }
  
  if (haussePanier !== 0) {
    inputsList.push({
      id: 'panier_moyen',
      label: 'Hausse panier moyen',
      value: haussePanier,
      unit: '%',
      description: `+${haussePanier}% sur le panier moyen`
    });
    hypotheses.push(`Stratégie d'upsell/cross-sell effective`);
    effects.push('Meilleure marge unitaire possible');
  }
  
  effects.push(`Sensibilité au volume : ${sensibilite}`);
  
  const completeness = checkDataCompleteness(data, [
    'finance.caAnnuel',
    'commercial.panierMoyen',
    'commercial.digitalPct'
  ]);
  
  return {
    id: `commercial_${Date.now()}`,
    type: 'COMMERCIAL',
    title: 'Simulation commerciale',
    description: 'Impact estimé sur le chiffre d\'affaires',
    inputs: inputsList,
    impactMin: Math.round(totalMin),
    impactMax: Math.round(totalMax),
    impactUnit: '€',
    impactLabel: `+${formatCurrency(totalMin)} à +${formatCurrency(totalMax)} / an`,
    secondaryEffects: effects,
    hypotheses,
    confidenceLevel: calculateConfidence(completeness, 'COMMERCIAL'),
    priority: 4
  };
}

export function simulateRH(
  data: AuditDataV2,
  inputs: Record<string, number>
): SimulationResult | null {
  const caAnnuel = safeNumber(data.finance?.annualRevenue);
  const chargesRh = safeNumber(data.costs?.hrCostsPercent);
  const effectif = safeNumber(data.ops?.productivity?.fte, 1);
  
  if (caAnnuel === 0) return null;
  
  const baisseTurnover = inputs.turnover || 0;
  const baisseAbsenteisme = inputs.absenteisme || 0;
  
  if (baisseTurnover === 0 && baisseAbsenteisme === 0) {
    return null;
  }
  
  const chargesRhAnnuel = caAnnuel * (chargesRh / 100);
  const coutParEtp = chargesRhAnnuel / effectif;
  
  // Impact turnover (coût de remplacement = 3-6 mois de salaire)
  const coutRecrutement = coutParEtp * 0.4; // 4 mois moyen
  const reductionDeparts = effectif * (Math.abs(baisseTurnover) / 100);
  const gainTurnoverMin = reductionDeparts * coutRecrutement * 0.4;
  const gainTurnoverMax = reductionDeparts * coutRecrutement * 0.7;
  
  // Impact absentéisme (productivité perdue)
  const joursParAn = 220;
  const joursRecuperes = effectif * joursParAn * (Math.abs(baisseAbsenteisme) / 100);
  const valeurJour = caAnnuel / (effectif * joursParAn);
  const gainAbsenteismeMin = joursRecuperes * valeurJour * 0.3;
  const gainAbsenteismeMax = joursRecuperes * valeurJour * 0.5;
  
  const totalMin = gainTurnoverMin + gainAbsenteismeMin;
  const totalMax = gainTurnoverMax + gainAbsenteismeMax;
  
  const inputsList: SimulationInput[] = [];
  const hypotheses: string[] = [];
  const effects: string[] = [];
  
  if (baisseTurnover !== 0) {
    inputsList.push({
      id: 'turnover',
      label: 'Baisse turnover',
      value: baisseTurnover,
      unit: 'points',
      description: `${baisseTurnover} points de turnover`
    });
    hypotheses.push(`Actions de fidélisation effectives (formation, management, rémunération)`);
    effects.push('Préservation des compétences clés');
    effects.push('Réduction des coûts de recrutement');
  }
  
  if (baisseAbsenteisme !== 0) {
    inputsList.push({
      id: 'absenteisme',
      label: 'Baisse absentéisme',
      value: baisseAbsenteisme,
      unit: 'points',
      description: `${baisseAbsenteisme} point(s) d'absentéisme`
    });
    hypotheses.push(`Amélioration des conditions de travail et prévention`);
    effects.push('Meilleure continuité de service');
  }
  
  hypotheses.push('Estimation indirecte — impact réel variable selon contexte');
  effects.push('⚠️ Impact qualitatif > impact financier direct');
  
  const completeness = checkDataCompleteness(data, [
    'finance.caAnnuel',
    'costs.chargesRhPct',
    'productivity.effectifETP',
    'quality.turnoverAnnuel',
    'quality.tauxAbsenteisme'
  ]);
  
  return {
    id: `rh_${Date.now()}`,
    type: 'RH',
    title: 'Simulation RH',
    description: 'Impact indirect estimé (ordre de grandeur)',
    inputs: inputsList,
    impactMin: Math.round(totalMin),
    impactMax: Math.round(totalMax),
    impactUnit: '€',
    impactLabel: `+${formatCurrency(totalMin)} à +${formatCurrency(totalMax)} / an (estimation indirecte)`,
    secondaryEffects: effects,
    hypotheses,
    confidenceLevel: calculateConfidence(completeness, 'RH'),
    priority: 5
  };
}

// ============ Priority Recommendation Engine ============

export function getPrioritizedScenarios(
  data: AuditDataV2,
  scores: Scores
): SimulationType[] {
  const priorities: { type: SimulationType; score: number }[] = [];
  
  // Score global < 60 → trésorerie prioritaire
  if (scores.global < 60) {
    priorities.push({ type: 'TRESORERIE', score: 100 });
  }
  
  // Score financier > 75 → rentabilité
  if (scores.financier > 75) {
    priorities.push({ type: 'RENTABILITE', score: 90 });
  } else if (scores.financier < 50) {
    priorities.push({ type: 'RENTABILITE', score: 85 });
  }
  
  // Score opérationnel bas → activité
  if (scores.operationnel < 60) {
    priorities.push({ type: 'ACTIVITE', score: 80 });
  }
  
  // Score commercial bas → commercial
  if (scores.commercial < 60) {
    priorities.push({ type: 'COMMERCIAL', score: 75 });
  }
  
  // Alertes RH (turnover/absentéisme élevé)
  const turnover = safeNumber(data.hr?.turnoverRatePercent);
  const absenteisme = safeNumber(data.hr?.absenteeismRatePercent);
  
  if (turnover > 15 || absenteisme > 5) {
    priorities.push({ type: 'RH', score: 70 });
  }
  
  // Default order if no specific priorities
  if (priorities.length === 0) {
    return ['TRESORERIE', 'RENTABILITE', 'ACTIVITE', 'COMMERCIAL', 'RH'];
  }
  
  // Sort by score and return types
  return priorities
    .sort((a, b) => b.score - a.score)
    .map(p => p.type);
}

// ============ Main Simulation Runner ============

export function runSimulation(
  type: SimulationType,
  data: AuditDataV2,
  inputs: Record<string, number>
): SimulationResult | null {
  switch (type) {
    case 'TRESORERIE':
      return simulateTresorerie(data, inputs);
    case 'RENTABILITE':
      return simulateRentabilite(data, inputs);
    case 'ACTIVITE':
      return simulateActivite(data, inputs);
    case 'COMMERCIAL':
      return simulateCommercial(data, inputs);
    case 'RH':
      return simulateRH(data, inputs);
    default:
      return null;
  }
}
