import { AuditDataV2, AuditWarning, normalizeToV2, AuditData } from '@/types/audit';

/**
 * Compute coherence warnings for audit data
 * Returns warnings based on data consistency checks
 */
export function getAuditWarnings(data: AuditData): AuditWarning[] {
  const v2 = normalizeToV2(data);
  const warnings: AuditWarning[] = [];

  // Rule 1: COGS + Gross Margin should be ~100%
  if (v2.costs.cogsPercent !== undefined) {
    const total = v2.finance.grossMarginPercent + v2.costs.cogsPercent;
    if (Math.abs(total - 100) > 8) {
      warnings.push({
        type: 'warning',
        message: `Incohérence : Marge brute (${v2.finance.grossMarginPercent}%) + COGS (${v2.costs.cogsPercent}%) = ${total}% (devrait être proche de 100%)`,
        field: 'cogsPercent',
      });
    }
  }

  // Rule 2: Net margin cannot exceed gross margin
  if (v2.finance.netMarginPercent !== undefined && v2.finance.netMarginPercent > v2.finance.grossMarginPercent) {
    warnings.push({
      type: 'warning',
      message: `Incohérence : La marge nette (${v2.finance.netMarginPercent}%) ne peut pas dépasser la marge brute (${v2.finance.grossMarginPercent}%)`,
      field: 'netMarginPercent',
    });
  }

  // Rule 3: Total costs exceeding 115% of revenue
  const totalCosts = 
    v2.costs.hrCostsPercent + 
    (v2.costs.cogsPercent ?? 0) + 
    (v2.costs.fixedCostsPercent ?? 0);
  
  if (totalCosts > 115) {
    warnings.push({
      type: 'warning',
      message: `Structure de coûts élevée : RH (${v2.costs.hrCostsPercent}%) + COGS (${v2.costs.cogsPercent ?? 0}%) + Fixes (${v2.costs.fixedCostsPercent ?? 0}%) = ${totalCosts}% du CA`,
      field: 'costs',
    });
  }

  // Rule 4: Very high occupancy rate warning
  if (v2.ops.occupancyRatePercent > 95) {
    warnings.push({
      type: 'warning',
      message: `Taux d'occupation très élevé (${v2.ops.occupancyRatePercent}%) : risque de surcharge et qualité de service impactée`,
      field: 'occupancyRatePercent',
    });
  }

  // Rule 5: Critical absenteeism
  if (v2.hr?.absenteeismRatePercent !== undefined && v2.hr.absenteeismRatePercent > 15) {
    warnings.push({
      type: 'critical',
      message: `Taux d'absentéisme critique (${v2.hr.absenteeismRatePercent}%) : risque RH majeur à traiter en priorité`,
      field: 'absenteeismRatePercent',
    });
  }

  // Rule 6: Critical turnover
  if (v2.hr?.turnoverRatePercent !== undefined && v2.hr.turnoverRatePercent > 40) {
    warnings.push({
      type: 'critical',
      message: `Turnover critique (${v2.hr.turnoverRatePercent}%) : instabilité des équipes, coûts de recrutement élevés`,
      field: 'turnoverRatePercent',
    });
  }

  // Rule 7: High return rate
  if (v2.ops.quality?.returnRatePercent !== undefined && v2.ops.quality.returnRatePercent > 10) {
    warnings.push({
      type: 'warning',
      message: `Taux de retours/erreurs élevé (${v2.ops.quality.returnRatePercent}%) : impact sur la satisfaction client`,
      field: 'returnRatePercent',
    });
  }

  // Rule 8: Low runway warning
  if (v2.finance.cashRunwayMonths !== undefined && v2.finance.cashRunwayMonths < 3) {
    warnings.push({
      type: 'critical',
      message: `Trésorerie critique : runway de ${v2.finance.cashRunwayMonths} mois seulement`,
      field: 'cashRunwayMonths',
    });
  }

  // Rule 9: Very low NPS
  if (v2.commercial.satisfaction?.nps !== undefined && v2.commercial.satisfaction.nps < 0) {
    warnings.push({
      type: 'warning',
      message: `NPS négatif (${v2.commercial.satisfaction.nps}) : plus de détracteurs que de promoteurs`,
      field: 'nps',
    });
  }

  // Rule 10: Low CSAT
  if (v2.commercial.satisfaction?.csatPercent !== undefined && v2.commercial.satisfaction.csatPercent < 70) {
    warnings.push({
      type: 'warning',
      message: `Satisfaction client faible (CSAT: ${v2.commercial.satisfaction.csatPercent}%) : risque de churn élevé`,
      field: 'csatPercent',
    });
  }

  return warnings;
}

/**
 * Get CSS classes for warning display
 */
export function getWarningStyles(warning: AuditWarning): { bg: string; border: string; icon: string } {
  if (warning.type === 'critical') {
    return {
      bg: 'bg-destructive/10',
      border: 'border-destructive',
      icon: '🚨',
    };
  }
  return {
    bg: 'bg-warning/10',
    border: 'border-warning',
    icon: '⚠️',
  };
}
