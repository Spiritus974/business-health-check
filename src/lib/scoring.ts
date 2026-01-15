// Re-export types from centralized location
export type { AuditData, Scores, ScoreLevel, ScoreLevelType } from '@/types/audit';
export { defaultAuditData } from '@/types/audit';

import { getBenchmarks } from './benchmarks';
import type { AuditData, Scores, ScoreLevel } from '@/types/audit';

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return { level: 'excellent', label: 'Excellent' };
  if (score >= 60) return { level: 'bon', label: 'Bon' };
  if (score >= 40) return { level: 'critique', label: 'À améliorer' };
  return { level: 'danger', label: 'Critique' };
}

export function computeScores4D(data: AuditData): Scores {
  const benchmarks = getBenchmarks(data.secteur, data.variant);
  
  // Financier (marge_brute, ca_etp, charges_rh)
  const mb = data.margebrutepct / 100;
  const caEtp = data.caannuel / Math.max(data.effectifetp, 0.1);
  const rh = data.chargesrhpct / 100;
  
  let scoreFinancier = 0;
  
  // Marge brute scoring
  if (mb >= benchmarks.marge_brute.thresholds.excellent) {
    scoreFinancier += 25;
  } else if (mb >= benchmarks.marge_brute.thresholds.bon) {
    scoreFinancier += 20;
  } else if (mb >= benchmarks.marge_brute.thresholds.crit) {
    scoreFinancier += 10;
  }
  
  // CA/ETP scoring
  if (caEtp >= benchmarks.ca_etp.thresholds.excellent) {
    scoreFinancier += 25;
  } else if (caEtp >= benchmarks.ca_etp.thresholds.bon) {
    scoreFinancier += 20;
  } else if (caEtp >= benchmarks.ca_etp.thresholds.crit) {
    scoreFinancier += 10;
  }
  
  // Charges RH scoring (inverse)
  if (rh <= benchmarks.charges_rh.thresholds.excellent) {
    scoreFinancier += 25;
  } else if (rh <= benchmarks.charges_rh.thresholds.bon) {
    scoreFinancier += 20;
  } else if (rh <= benchmarks.charges_rh.thresholds.crit) {
    scoreFinancier += 10;
  }
  
  // Add base points for having data
  scoreFinancier += 25;
  scoreFinancier = Math.min(100, Math.max(0, scoreFinancier));
  
  // Opérationnel (taux_occupation)
  const tauxOccupation = data.tauxoccupation;
  let scoreOperationnel = 0;
  if (tauxOccupation >= 0.95) {
    scoreOperationnel = 100;
  } else if (tauxOccupation >= 0.85) {
    scoreOperationnel = 80;
  } else if (tauxOccupation >= 0.75) {
    scoreOperationnel = 60;
  } else if (tauxOccupation >= 0.60) {
    scoreOperationnel = 40;
  } else {
    scoreOperationnel = Math.max(0, tauxOccupation * 66);
  }
  
  // Commercial (digital_pct, fidelisation)
  const dp = data.digitalpct;
  const fid = data.fidelisationpct;
  let scoreCommercial = 0;
  
  if (dp >= benchmarks.digital_pct.thresholds.excellent) {
    scoreCommercial += 50;
  } else if (dp >= benchmarks.digital_pct.thresholds.bon) {
    scoreCommercial += 40;
  } else if (dp >= benchmarks.digital_pct.thresholds.crit) {
    scoreCommercial += 20;
  }
  
  if (fid >= benchmarks.fidelisation.thresholds.excellent) {
    scoreCommercial += 50;
  } else if (fid >= benchmarks.fidelisation.thresholds.bon) {
    scoreCommercial += 40;
  } else if (fid >= benchmarks.fidelisation.thresholds.crit) {
    scoreCommercial += 20;
  }
  
  scoreCommercial = Math.min(100, Math.max(0, scoreCommercial));
  
  // Stratégique (nb_services)
  const nbServices = data.nbservices;
  let scoreStrategique = 40 + nbServices * 10;
  scoreStrategique = Math.min(100, Math.max(0, scoreStrategique));
  
  // Score global pondéré
  const scoreGlobal = Math.round(
    (scoreFinancier * 0.35 +
    scoreOperationnel * 0.25 +
    scoreCommercial * 0.20 +
    scoreStrategique * 0.20) * 10
  ) / 10;
  
  return {
    global: scoreGlobal,
    financier: Math.round(scoreFinancier * 10) / 10,
    operationnel: Math.round(scoreOperationnel * 10) / 10,
    commercial: Math.round(scoreCommercial * 10) / 10,
    strategique: Math.round(scoreStrategique * 10) / 10
  };
}
