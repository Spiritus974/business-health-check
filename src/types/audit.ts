// ============= Audit Types =============

export interface AuditData {
  nom: string;
  secteur: string;
  variant?: string;
  margebrutepct: number;
  caannuel: number;
  effectifetp: number;
  chargesrhpct: number;
  digitalpct: number;
  fidelisationpct: number;
  tauxoccupation: number;
  nbservices: number;
}

export interface Scores {
  global: number;
  financier: number;
  operationnel: number;
  commercial: number;
  strategique: number;
}

export type ScoreLevelType = 'excellent' | 'bon' | 'critique' | 'danger';

export interface ScoreLevel {
  level: ScoreLevelType;
  label: string;
}

export interface AuditState {
  auditData: AuditData | null;
  scores: Scores | null;
  businessName: string;
  isCalculating: boolean;
  isPdfGenerating: boolean;
}

export interface AuditActions {
  submitAudit: (data: AuditData) => void;
  resetAudit: () => void;
  setIsPdfGenerating: (value: boolean) => void;
  downloadPdf: () => Promise<void>;
}

export interface AuditContextType extends AuditState, AuditActions {}

// ============= Benchmark Types =============

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

// ============= Default Values =============

export const defaultAuditData: AuditData = {
  nom: '',
  secteur: 'Veterinaire',
  variant: 'veto_standard',
  margebrutepct: 68,
  caannuel: 450000,
  effectifetp: 4.5,
  chargesrhpct: 52,
  digitalpct: 85,
  fidelisationpct: 88,
  tauxoccupation: 0.85,
  nbservices: 5
};

export const initialAuditState: AuditState = {
  auditData: null,
  scores: null,
  businessName: '',
  isCalculating: false,
  isPdfGenerating: false
};
