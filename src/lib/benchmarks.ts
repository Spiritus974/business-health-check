export interface ThresholdSet {
  crit: number;
  bon: number;
  excellent: number;
}

export interface MetricDefinition {
  unit: 'ratio' | 'ratio_inverse' | 'amount' | 'percentage';
  thresholds: ThresholdSet;
}

export interface SectorVariant {
  id: string;
  description: string;
  metrics: Record<string, MetricDefinition>;
}

export interface Sector {
  default_variant: string;
  variants: Record<string, SectorVariant>;
}

export interface ParamSecteur {
  version: string;
  last_update: string;
  currency: string;
  score_scale: string;
  sectors: Record<string, Sector>;
}

export const PARAM_SECTEUR: ParamSecteur = {
  version: "2.1",
  last_update: "2026-01-15",
  currency: "EUR",
  score_scale: "0-100",
  sectors: {
    Veterinaire: {
      default_variant: "veto_standard",
      variants: {
        veto_standard: {
          id: "veto_standard",
          description: "Clinique vétérinaire standard urbaine",
          metrics: {
            marge_brute: { unit: "ratio", thresholds: { crit: 0.55, bon: 0.70, excellent: 0.75 } },
            ca_etp: { unit: "amount", thresholds: { crit: 70000, bon: 100000, excellent: 130000 } },
            charges_rh: { unit: "ratio_inverse", thresholds: { crit: 0.70, bon: 0.55, excellent: 0.50 } },
            digital_pct: { unit: "percentage", thresholds: { crit: 30, bon: 80, excellent: 95 } },
            fidelisation: { unit: "percentage", thresholds: { crit: 60, bon: 85, excellent: 92 } }
          }
        },
        veto_rurale: {
          id: "veto_rurale",
          description: "Cabinet vétérinaire rural/mixte",
          metrics: {
            marge_brute: { unit: "ratio", thresholds: { crit: 0.50, bon: 0.65, excellent: 0.72 } },
            ca_etp: { unit: "amount", thresholds: { crit: 60000, bon: 85000, excellent: 110000 } },
            charges_rh: { unit: "ratio_inverse", thresholds: { crit: 0.65, bon: 0.52, excellent: 0.45 } },
            digital_pct: { unit: "percentage", thresholds: { crit: 20, bon: 60, excellent: 80 } },
            fidelisation: { unit: "percentage", thresholds: { crit: 65, bon: 88, excellent: 95 } }
          }
        }
      }
    },
    Restaurant: {
      default_variant: "resto_traditionnel",
      variants: {
        resto_traditionnel: {
          id: "resto_traditionnel",
          description: "Restaurant traditionnel urbain",
          metrics: {
            marge_brute: { unit: "ratio", thresholds: { crit: 0.60, bon: 0.72, excellent: 0.78 } },
            ca_etp: { unit: "amount", thresholds: { crit: 45000, bon: 65000, excellent: 85000 } },
            charges_rh: { unit: "ratio_inverse", thresholds: { crit: 0.45, bon: 0.35, excellent: 0.30 } },
            digital_pct: { unit: "percentage", thresholds: { crit: 40, bon: 75, excellent: 90 } },
            fidelisation: { unit: "percentage", thresholds: { crit: 50, bon: 75, excellent: 85 } }
          }
        },
        resto_rapide: {
          id: "resto_rapide",
          description: "Restauration rapide / Fast-food",
          metrics: {
            marge_brute: { unit: "ratio", thresholds: { crit: 0.55, bon: 0.68, excellent: 0.75 } },
            ca_etp: { unit: "amount", thresholds: { crit: 55000, bon: 80000, excellent: 100000 } },
            charges_rh: { unit: "ratio_inverse", thresholds: { crit: 0.40, bon: 0.30, excellent: 0.25 } },
            digital_pct: { unit: "percentage", thresholds: { crit: 60, bon: 85, excellent: 98 } },
            fidelisation: { unit: "percentage", thresholds: { crit: 35, bon: 60, excellent: 75 } }
          }
        }
      }
    },
    Commerce: {
      default_variant: "commerce_detail",
      variants: {
        commerce_detail: {
          id: "commerce_detail",
          description: "Commerce de détail standard",
          metrics: {
            marge_brute: { unit: "ratio", thresholds: { crit: 0.35, bon: 0.45, excellent: 0.55 } },
            ca_etp: { unit: "amount", thresholds: { crit: 80000, bon: 120000, excellent: 160000 } },
            charges_rh: { unit: "ratio_inverse", thresholds: { crit: 0.25, bon: 0.18, excellent: 0.14 } },
            digital_pct: { unit: "percentage", thresholds: { crit: 50, bon: 80, excellent: 95 } },
            fidelisation: { unit: "percentage", thresholds: { crit: 40, bon: 65, excellent: 80 } }
          }
        }
      }
    },
    Services: {
      default_variant: "services_conseil",
      variants: {
        services_conseil: {
          id: "services_conseil",
          description: "Cabinet de conseil / Services B2B",
          metrics: {
            marge_brute: { unit: "ratio", thresholds: { crit: 0.65, bon: 0.80, excellent: 0.88 } },
            ca_etp: { unit: "amount", thresholds: { crit: 100000, bon: 150000, excellent: 200000 } },
            charges_rh: { unit: "ratio_inverse", thresholds: { crit: 0.60, bon: 0.50, excellent: 0.40 } },
            digital_pct: { unit: "percentage", thresholds: { crit: 70, bon: 90, excellent: 98 } },
            fidelisation: { unit: "percentage", thresholds: { crit: 70, bon: 88, excellent: 95 } }
          }
        }
      }
    }
  }
};

export function getBenchmarks(secteur: string, variant?: string): Record<string, MetricDefinition> {
  const sectors = PARAM_SECTEUR.sectors;
  if (!(secteur in sectors)) {
    throw new Error(`Secteur '${secteur}' non trouvé dans PARAM_SECTEUR`);
  }
  
  const sect = sectors[secteur];
  const varId = variant || sect.default_variant;
  if (!(varId in sect.variants)) {
    throw new Error(`Variant '${varId}' non trouvé pour '${secteur}'`);
  }
  
  return sect.variants[varId].metrics;
}

export function getSectorVariants(secteur: string): SectorVariant[] {
  const sectors = PARAM_SECTEUR.sectors;
  if (!(secteur in sectors)) {
    return [];
  }
  return Object.values(sectors[secteur].variants);
}

export function getAllSectors(): string[] {
  return Object.keys(PARAM_SECTEUR.sectors);
}
