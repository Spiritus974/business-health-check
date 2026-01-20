// ============= Audit Types V2 =============

// V1 types (legacy compatibility)
export interface AuditDataV1 {
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

// V2 Types (new structure)
export type DataOrigin = 'manual' | 'client_declarative' | 'imported' | 'estimated';

export interface FinanceData {
  annualRevenue: number;
  grossMarginPercent: number;
  netMarginPercent?: number;
  cashRunwayMonths?: number;
}

export interface CostsData {
  hrCostsPercent: number;
  cogsPercent?: number;
  fixedCostsPercent?: number;
}

export interface ProductivityData {
  fte: number;
  revenuePerFte?: number;
}

export interface QualityData {
  returnRatePercent?: number;
  incidentsPerMonth?: number;
}

export interface OpsData {
  occupancyRatePercent: number;
  productivity: ProductivityData;
  quality?: QualityData;
}

export interface HRData {
  absenteeismRatePercent?: number;
  turnoverRatePercent?: number;
}

export interface SatisfactionData {
  csatPercent?: number;
  nps?: number;
}

export interface CommercialData {
  digitalizationPercent: number;
  loyaltyPercent?: number;
  satisfaction?: SatisfactionData;
}

export interface AuditDataV2 {
  businessName: string;
  sector: string;
  variant?: string;
  auditDate: string;
  dataOrigin: DataOrigin;
  finance: FinanceData;
  costs: CostsData;
  ops: OpsData;
  hr?: HRData;
  commercial: CommercialData;
  nbServices?: number;
}

// Warning types
export interface AuditWarning {
  type: 'warning' | 'critical';
  message: string;
  field?: string;
}

// Union type for both V1 and V2
export type AuditData = AuditDataV1 | AuditDataV2;

// Type guard to check if data is V2
export function isAuditDataV2(data: AuditData): data is AuditDataV2 {
  return 'finance' in data && 'ops' in data && 'commercial' in data;
}

// Convert V1 to V2 for unified processing
export function convertV1ToV2(v1: AuditDataV1): AuditDataV2 {
  return {
    businessName: v1.nom,
    sector: v1.secteur,
    variant: v1.variant,
    auditDate: new Date().toISOString().split('T')[0],
    dataOrigin: 'manual',
    finance: {
      annualRevenue: v1.caannuel,
      grossMarginPercent: v1.margebrutepct,
    },
    costs: {
      hrCostsPercent: v1.chargesrhpct,
    },
    ops: {
      occupancyRatePercent: v1.tauxoccupation * 100,
      productivity: {
        fte: v1.effectifetp,
        revenuePerFte: v1.caannuel / Math.max(v1.effectifetp, 0.1),
      },
    },
    commercial: {
      digitalizationPercent: v1.digitalpct,
      loyaltyPercent: v1.fidelisationpct,
    },
    nbServices: v1.nbservices,
  };
}

// Convert V2 to V1 for backward compatibility with existing code
export function convertV2ToV1(v2: AuditDataV2): AuditDataV1 {
  return {
    nom: v2.businessName,
    secteur: v2.sector,
    variant: v2.variant,
    margebrutepct: v2.finance.grossMarginPercent,
    caannuel: v2.finance.annualRevenue,
    effectifetp: v2.ops.productivity.fte,
    chargesrhpct: v2.costs.hrCostsPercent,
    digitalpct: v2.commercial.digitalizationPercent,
    fidelisationpct: v2.commercial.loyaltyPercent ?? 0,
    tauxoccupation: v2.ops.occupancyRatePercent / 100,
    nbservices: v2.nbServices ?? 1,
  };
}

// Normalize to V2 for processing
export function normalizeToV2(data: AuditData): AuditDataV2 {
  if (isAuditDataV2(data)) {
    return data;
  }
  return convertV1ToV2(data);
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

// Decision engine output type
export type PriorityLevel = 'CRITIQUE' | 'ÉLEVÉ' | 'MODÉRÉ' | 'FAIBLE';
export type ImpactType = 'CA' | 'MARGE' | 'TRÉSORERIE' | 'COÛTS';
export type ConfidenceLevel = 'FAIBLE' | 'MOYEN' | 'BON';

export interface QuantifiedRecommendation {
  lever: string;
  impactType: ImpactType;
  estimatedImpactMin: number;
  estimatedImpactMax: number;
  unit: '€' | '%';
  assumptions: string[];
  confidenceLevel: ConfidenceLevel;
}

export interface DecisionOutput {
  priorityLevel: PriorityLevel;
  topRisks: string[];
  topLevers: string[];
  quickWins: string[];
  structuralActions: string[];
  decisionSummary: string;
  quantifiedRecommendations: QuantifiedRecommendation[];
}

// Import-related types
export interface ImportMeta {
  dataOrigin: 'declaratif_client' | 'excel_champ_valeur';
  importHash: string;
  importTimestamp: number;
}

export interface ImportWarningEntry {
  field: string;
  message: string;
}

export interface AuditState {
  auditData: AuditData | null;
  scores: Scores | null;
  warnings: AuditWarning[];
  decision: DecisionOutput | null;
  businessName: string;
  isCalculating: boolean;
  isPdfGenerating: boolean;
  // Import-related state
  importMeta: ImportMeta | null;
  importWarnings: ImportWarningEntry[];
}

export interface AuditActions {
  submitAudit: (data: AuditData) => void;
  resetAudit: () => void;
  setIsPdfGenerating: (value: boolean) => void;
  downloadPdf: () => Promise<void>;
  sendPdfEmail: (email: string) => Promise<void>;
  importAuditFromData: (data: AuditDataV2, meta: ImportMeta) => void;
}

export interface AuditContextType extends AuditState, AuditActions {}

// ============= Default Values =============

export const defaultAuditDataV1: AuditDataV1 = {
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

export const defaultAuditDataV2: AuditDataV2 = {
  businessName: '',
  sector: 'Veterinaire',
  variant: 'veto_standard',
  auditDate: new Date().toISOString().split('T')[0],
  dataOrigin: 'manual',
  finance: {
    annualRevenue: 450000,
    grossMarginPercent: 68,
    netMarginPercent: undefined,
    cashRunwayMonths: undefined,
  },
  costs: {
    hrCostsPercent: 52,
    cogsPercent: undefined,
    fixedCostsPercent: undefined,
  },
  ops: {
    occupancyRatePercent: 85,
    productivity: {
      fte: 4.5,
      revenuePerFte: undefined,
    },
    quality: undefined,
  },
  hr: undefined,
  commercial: {
    digitalizationPercent: 85,
    loyaltyPercent: 88,
    satisfaction: undefined,
  },
  nbServices: 5,
};

// Keep legacy export for backward compatibility
export const defaultAuditData = defaultAuditDataV1;

export const initialAuditState: AuditState = {
  auditData: null,
  scores: null,
  warnings: [],
  decision: null,
  businessName: '',
  isCalculating: false,
  isPdfGenerating: false,
  importMeta: null,
  importWarnings: [],
};
