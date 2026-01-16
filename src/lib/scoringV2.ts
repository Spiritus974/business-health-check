import { getBenchmarks } from './benchmarks';
import type { AuditData, AuditDataV2, Scores, ScoreLevel } from '@/types/audit';
import { normalizeToV2, isAuditDataV2 } from '@/types/audit';

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return { level: 'excellent', label: 'Excellent' };
  if (score >= 60) return { level: 'bon', label: 'Bon' };
  if (score >= 40) return { level: 'critique', label: 'À améliorer' };
  return { level: 'danger', label: 'Critique' };
}

interface ScoreContribution {
  score: number;
  weight: number;
}

/**
 * Compute V2 scores with support for optional fields
 * Redistributes weights when optional fields are missing
 */
export function computeScoresV2(data: AuditData): Scores {
  const v2 = normalizeToV2(data);
  const benchmarks = getBenchmarks(v2.sector, v2.variant);

  // =====================
  // FINANCIER (35% base weight)
  // =====================
  const financierContributions: ScoreContribution[] = [];
  
  // Marge brute (mandatory) - base weight 40%
  const mbRatio = v2.finance.grossMarginPercent / 100;
  let mbScore = 0;
  if (mbRatio >= benchmarks.marge_brute.thresholds.excellent) {
    mbScore = 100;
  } else if (mbRatio >= benchmarks.marge_brute.thresholds.bon) {
    mbScore = 80;
  } else if (mbRatio >= benchmarks.marge_brute.thresholds.crit) {
    mbScore = 50;
  } else {
    mbScore = Math.max(0, mbRatio * 100 * 0.9);
  }
  financierContributions.push({ score: mbScore, weight: 40 });

  // CA/ETP (computed) - base weight 30%
  const caEtp = v2.finance.annualRevenue / Math.max(v2.ops.productivity.fte, 0.1);
  let caEtpScore = 0;
  if (caEtp >= benchmarks.ca_etp.thresholds.excellent) {
    caEtpScore = 100;
  } else if (caEtp >= benchmarks.ca_etp.thresholds.bon) {
    caEtpScore = 80;
  } else if (caEtp >= benchmarks.ca_etp.thresholds.crit) {
    caEtpScore = 50;
  } else {
    caEtpScore = Math.max(0, (caEtp / benchmarks.ca_etp.thresholds.crit) * 50);
  }
  financierContributions.push({ score: caEtpScore, weight: 30 });

  // Charges RH (mandatory) - base weight 20%
  const rhRatio = v2.costs.hrCostsPercent / 100;
  let rhScore = 0;
  if (rhRatio <= benchmarks.charges_rh.thresholds.excellent) {
    rhScore = 100;
  } else if (rhRatio <= benchmarks.charges_rh.thresholds.bon) {
    rhScore = 80;
  } else if (rhRatio <= benchmarks.charges_rh.thresholds.crit) {
    rhScore = 50;
  } else {
    rhScore = Math.max(0, 40 - (rhRatio - benchmarks.charges_rh.thresholds.crit) * 100);
  }
  financierContributions.push({ score: rhScore, weight: 20 });

  // Marge nette (optional) - weight 5% if present
  if (v2.finance.netMarginPercent !== undefined) {
    let netScore = 0;
    if (v2.finance.netMarginPercent >= 15) netScore = 100;
    else if (v2.finance.netMarginPercent >= 10) netScore = 80;
    else if (v2.finance.netMarginPercent >= 5) netScore = 60;
    else if (v2.finance.netMarginPercent >= 0) netScore = 40;
    else netScore = 20;
    financierContributions.push({ score: netScore, weight: 5 });
  }

  // Runway (optional) - weight 5% if present
  if (v2.finance.cashRunwayMonths !== undefined) {
    let runwayScore = 0;
    if (v2.finance.cashRunwayMonths >= 12) runwayScore = 100;
    else if (v2.finance.cashRunwayMonths >= 6) runwayScore = 80;
    else if (v2.finance.cashRunwayMonths >= 3) runwayScore = 50;
    else runwayScore = 20;
    financierContributions.push({ score: runwayScore, weight: 5 });
  }

  const scoreFinancier = calculateWeightedScore(financierContributions);

  // =====================
  // OPÉRATIONNEL (25% base weight)
  // =====================
  const opsContributions: ScoreContribution[] = [];

  // Taux d'occupation (mandatory) - base weight 60%
  const occRate = v2.ops.occupancyRatePercent / 100;
  let occScore = 0;
  if (occRate >= 0.95) occScore = 100;
  else if (occRate >= 0.85) occScore = 80;
  else if (occRate >= 0.75) occScore = 60;
  else if (occRate >= 0.60) occScore = 40;
  else occScore = Math.max(0, occRate * 66);
  opsContributions.push({ score: occScore, weight: 60 });

  // Productivité CA/ETP (already computed, reuse) - weight 25%
  opsContributions.push({ score: caEtpScore, weight: 25 });

  // Quality metrics (optional) - weight 15% if present
  if (v2.ops.quality) {
    let qualityScore = 100;
    if (v2.ops.quality.returnRatePercent !== undefined) {
      if (v2.ops.quality.returnRatePercent <= 2) qualityScore = 100;
      else if (v2.ops.quality.returnRatePercent <= 5) qualityScore = 80;
      else if (v2.ops.quality.returnRatePercent <= 10) qualityScore = 50;
      else qualityScore = 20;
    }
    if (v2.ops.quality.incidentsPerMonth !== undefined) {
      let incidentScore = 100;
      if (v2.ops.quality.incidentsPerMonth <= 1) incidentScore = 100;
      else if (v2.ops.quality.incidentsPerMonth <= 3) incidentScore = 70;
      else if (v2.ops.quality.incidentsPerMonth <= 5) incidentScore = 50;
      else incidentScore = 20;
      qualityScore = (qualityScore + incidentScore) / 2;
    }
    opsContributions.push({ score: qualityScore, weight: 15 });
  }

  const scoreOperationnel = calculateWeightedScore(opsContributions);

  // =====================
  // COMMERCIAL (20% base weight)
  // =====================
  const commercialContributions: ScoreContribution[] = [];

  // Digitalisation (mandatory) - base weight 45%
  const dp = v2.commercial.digitalizationPercent;
  let dpScore = 0;
  if (dp >= benchmarks.digital_pct.thresholds.excellent) {
    dpScore = 100;
  } else if (dp >= benchmarks.digital_pct.thresholds.bon) {
    dpScore = 80;
  } else if (dp >= benchmarks.digital_pct.thresholds.crit) {
    dpScore = 50;
  } else {
    dpScore = Math.max(0, dp * 1.5);
  }
  commercialContributions.push({ score: dpScore, weight: 45 });

  // Fidélisation (optional in V2, was mandatory in V1) - weight 35%
  if (v2.commercial.loyaltyPercent !== undefined) {
    const fid = v2.commercial.loyaltyPercent;
    let fidScore = 0;
    if (fid >= benchmarks.fidelisation.thresholds.excellent) {
      fidScore = 100;
    } else if (fid >= benchmarks.fidelisation.thresholds.bon) {
      fidScore = 80;
    } else if (fid >= benchmarks.fidelisation.thresholds.crit) {
      fidScore = 50;
    } else {
      fidScore = Math.max(0, fid * 0.8);
    }
    commercialContributions.push({ score: fidScore, weight: 35 });
  }

  // Satisfaction CSAT (optional) - weight 10%
  if (v2.commercial.satisfaction?.csatPercent !== undefined) {
    const csat = v2.commercial.satisfaction.csatPercent;
    let csatScore = 0;
    if (csat >= 90) csatScore = 100;
    else if (csat >= 80) csatScore = 80;
    else if (csat >= 70) csatScore = 60;
    else csatScore = Math.max(0, csat * 0.8);
    commercialContributions.push({ score: csatScore, weight: 10 });
  }

  // NPS (optional) - weight 10%
  if (v2.commercial.satisfaction?.nps !== undefined) {
    const nps = v2.commercial.satisfaction.nps;
    let npsScore = 0;
    if (nps >= 50) npsScore = 100;
    else if (nps >= 30) npsScore = 80;
    else if (nps >= 0) npsScore = 60;
    else if (nps >= -20) npsScore = 40;
    else npsScore = 20;
    commercialContributions.push({ score: npsScore, weight: 10 });
  }

  const scoreCommercial = calculateWeightedScore(commercialContributions);

  // =====================
  // STRATÉGIQUE / RISQUE (20% base weight)
  // =====================
  const strategiqueContributions: ScoreContribution[] = [];

  // Nombre de services (mandatory) - base weight 40%
  const nbServices = v2.nbServices ?? 1;
  let servicesScore = 40 + nbServices * 10;
  servicesScore = Math.min(100, Math.max(0, servicesScore));
  strategiqueContributions.push({ score: servicesScore, weight: 40 });

  // Runway risk (optional) - weight 20%
  if (v2.finance.cashRunwayMonths !== undefined) {
    let runwayRisk = 100;
    if (v2.finance.cashRunwayMonths < 3) runwayRisk = 20;
    else if (v2.finance.cashRunwayMonths < 6) runwayRisk = 50;
    else if (v2.finance.cashRunwayMonths < 12) runwayRisk = 80;
    strategiqueContributions.push({ score: runwayRisk, weight: 20 });
  }

  // HR stability (optional) - weight 20%
  if (v2.hr) {
    let hrStability = 100;
    if (v2.hr.turnoverRatePercent !== undefined) {
      if (v2.hr.turnoverRatePercent > 40) hrStability = 20;
      else if (v2.hr.turnoverRatePercent > 25) hrStability = 50;
      else if (v2.hr.turnoverRatePercent > 15) hrStability = 70;
    }
    if (v2.hr.absenteeismRatePercent !== undefined) {
      let absScore = 100;
      if (v2.hr.absenteeismRatePercent > 15) absScore = 20;
      else if (v2.hr.absenteeismRatePercent > 10) absScore = 50;
      else if (v2.hr.absenteeismRatePercent > 5) absScore = 80;
      hrStability = (hrStability + absScore) / 2;
    }
    strategiqueContributions.push({ score: hrStability, weight: 20 });
  }

  // Dimension balance penalty - weight 20%
  const scores = [scoreFinancier, scoreOperationnel, scoreCommercial];
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const imbalance = maxScore - minScore;
  let balanceScore = 100;
  if (imbalance > 40) balanceScore = 50;
  else if (imbalance > 30) balanceScore = 70;
  else if (imbalance > 20) balanceScore = 85;
  strategiqueContributions.push({ score: balanceScore, weight: 20 });

  const scoreStrategique = calculateWeightedScore(strategiqueContributions);

  // =====================
  // GLOBAL SCORE
  // =====================
  // Apply small penalty for missing optional data (-2 max)
  let missingDataPenalty = 0;
  const optionalFields = [
    v2.finance.netMarginPercent,
    v2.finance.cashRunwayMonths,
    v2.costs.cogsPercent,
    v2.costs.fixedCostsPercent,
    v2.hr?.absenteeismRatePercent,
    v2.hr?.turnoverRatePercent,
    v2.ops.quality?.returnRatePercent,
    v2.commercial.satisfaction?.csatPercent,
    v2.commercial.satisfaction?.nps,
  ];
  const missingCount = optionalFields.filter(f => f === undefined).length;
  if (missingCount > 5) {
    missingDataPenalty = 2;
  } else if (missingCount > 3) {
    missingDataPenalty = 1;
  }

  const scoreGlobal = Math.round(
    (scoreFinancier * 0.35 +
    scoreOperationnel * 0.25 +
    scoreCommercial * 0.20 +
    scoreStrategique * 0.20 -
    missingDataPenalty) * 10
  ) / 10;

  return {
    global: Math.max(0, Math.min(100, scoreGlobal)),
    financier: Math.round(scoreFinancier * 10) / 10,
    operationnel: Math.round(scoreOperationnel * 10) / 10,
    commercial: Math.round(scoreCommercial * 10) / 10,
    strategique: Math.round(scoreStrategique * 10) / 10
  };
}

/**
 * Calculate weighted score with automatic weight redistribution
 */
function calculateWeightedScore(contributions: ScoreContribution[]): number {
  if (contributions.length === 0) return 0;
  
  const totalWeight = contributions.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = contributions.reduce((sum, c) => sum + c.score * c.weight, 0);
  
  return weightedSum / totalWeight;
}

// Re-export for compatibility
export { computeScoresV2 as computeScores4D };
