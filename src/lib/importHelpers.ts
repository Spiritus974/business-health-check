/**
 * Data Import Helpers
 * Validation, parsing, and hashing utilities for JSON/Excel data import
 */

import { AuditDataV2, AuditWarning } from '@/types/audit';
import { validateAndMapSector, SECTOR_LABELS, AllowedSector } from './sectorValidation';

// ============= Types =============

export interface ImportValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportWarning[];
  parsedData: Partial<AuditDataV2> | null;
}

export interface ImportError {
  field: string;
  message: string;
}

export interface ImportWarning {
  field: string;
  message: string;
}

export interface ImportMeta {
  hash: string;
  timestamp: number;
  origin: 'declaratif_client' | 'excel_champ_valeur';
}

export interface ImportHistoryEntry {
  hash: string;
  timestamp: number;
}

// ============= Constants =============

const IMPORT_STORAGE_KEY = 'audit_import_history';
const MAX_IMPORTS_PER_24H = 3;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============= SHA-256 Hash =============

export async function sha256Hash(content: string): Promise<string> {
  const normalized = content.trim().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getShortHash(hash: string): string {
  return hash.substring(0, 8);
}

// ============= Anti-Fraud Checks =============

export function getImportHistory(): ImportHistoryEntry[] {
  try {
    const stored = localStorage.getItem(IMPORT_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ImportHistoryEntry[];
  } catch {
    return [];
  }
}

function saveImportHistory(history: ImportHistoryEntry[]): void {
  localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(history));
}

export function cleanOldImports(): void {
  const now = Date.now();
  const history = getImportHistory().filter(
    entry => now - entry.timestamp < DUPLICATE_WINDOW_MS
  );
  saveImportHistory(history);
}

export function checkImportLimits(hash: string): { allowed: boolean; reason?: string } {
  cleanOldImports();
  const history = getImportHistory();
  const now = Date.now();
  
  // Check for duplicate hash in 24h
  const isDuplicate = history.some(entry => entry.hash === hash);
  if (isDuplicate) {
    return { 
      allowed: false, 
      reason: 'Ces données ont déjà été importées dans les dernières 24 heures.' 
    };
  }
  
  // Check max imports per 24h
  if (history.length >= MAX_IMPORTS_PER_24H) {
    return { 
      allowed: false, 
      reason: `Limite atteinte : maximum ${MAX_IMPORTS_PER_24H} imports par 24 heures.` 
    };
  }
  
  return { allowed: true };
}

export function recordImport(hash: string): void {
  cleanOldImports();
  const history = getImportHistory();
  history.push({ hash, timestamp: Date.now() });
  saveImportHistory(history);
}

// ============= Key Normalization =============

export function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============= Value Parsing =============

export function parseValue(value: string): number | string | undefined {
  if (!value || value.trim() === '') return undefined;
  
  const cleaned = value
    .trim()
    .replace(/\s/g, '') // Remove spaces (e.g., "1 200 000" → "1200000")
    .replace(/€/g, '')  // Remove € symbol
    .replace(/%/g, '')  // Remove % symbol
    .replace(/,/g, '.'); // French decimal → standard
  
  const num = parseFloat(cleaned);
  if (!isNaN(num)) return num;
  
  return value.trim();
}

// ============= Excel Field Mapping =============

const FIELD_SYNONYMS: Record<string, string[]> = {
  // META
  'meta.companyName': ['nom entreprise', 'entreprise', 'raison sociale', 'nom', 'societe', 'company'],
  'meta.sector': ['secteur', 'type detablissement', 'activite', 'sector', 'type etablissement'],
  'meta.year': ['annee', 'exercice', 'year'],
  
  // FINANCE
  'finance.caAnnuel': ['ca annuel', 'chiffre daffaires', 'chiffre affaires', 'ca', 'revenue', 'caannuel'],
  'finance.resultatNet': ['resultat net', 'resultatnet', 'net income', 'benefice'],
  'finance.tresorerie': ['tresorerie', 'cash', 'liquidites'],
  'finance.dettesFinancieres': ['dettes financieres', 'dettes bancaires', 'dette bancaire', 'dettes', 'debt'],
  'finance.fondsPropres': ['fonds propres', 'capitaux propres', 'equity'],
  
  // COSTS
  'costs.chargesRH': ['charges rh', 'chargesrh', 'charges rh pct', 'hr costs'],
  'costs.cogs': ['cogs', 'cout marchandises', 'couts marchandises', 'cogs pct'],
  'costs.chargesFixes': ['charges fixes', 'chargesfixes', 'fixed costs'],
  
  // OPERATIONS
  'operations.effectifETP': ['effectif etp', 'etp', 'effectif', 'fte', 'salaries'],
  'operations.tauxOccupation': ['taux doccupation', 'taux occupation', 'occupation', 'occupancy'],
  'operations.qualiteRetours': ['qualite retours', 'taux retour', 'retours'],
  
  // COMMERCIAL
  'commercial.digitalisation': ['digitalisation', 'digital', 'digital pct'],
  'commercial.satisfactionClient': ['satisfaction client', 'nps', 'satisfaction', 'csat'],
  
  // RH
  'rh.absenteisme': ['absenteisme', 'absenteeism', 'absences'],
  'rh.turnover': ['turnover', 'rotation personnel', 'rotation'],
};

export function mapFieldToPath(fieldName: string): string | null {
  const normalizedField = normalizeKey(fieldName);
  
  for (const [path, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    if (synonyms.some(syn => normalizeKey(syn) === normalizedField)) {
      return path;
    }
  }
  
  return null;
}

// ============= Excel Parsing =============

export interface ExcelParseResult {
  fields: { original: string; mapped: string | null; value: number | string | undefined }[];
  missingRequired: string[];
  data: Record<string, unknown>;
}

export function parseExcelChampValeur(input: string): ExcelParseResult {
  const lines = input.trim().split('\n');
  const fields: ExcelParseResult['fields'] = [];
  const data: Record<string, unknown> = {};
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Split by tab first, then by multiple spaces
    let parts = line.split('\t');
    if (parts.length < 2) {
      parts = line.split(/\s{2,}/);
    }
    if (parts.length < 2) continue;
    
    const fieldName = parts[0].trim();
    const valueStr = parts.slice(1).join(' ').trim();
    const value = parseValue(valueStr);
    const mapped = mapFieldToPath(fieldName);
    
    fields.push({ original: fieldName, mapped, value });
    
    if (mapped && value !== undefined) {
      // Set nested path
      const pathParts = mapped.split('.');
      let current: Record<string, unknown> = data;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]] as Record<string, unknown>;
      }
      current[pathParts[pathParts.length - 1]] = value;
    }
  }
  
  // Check required fields
  const requiredPaths = [
    'meta.companyName',
    'meta.sector',
    'meta.year',
    'finance.caAnnuel',
    'finance.resultatNet',
    'finance.tresorerie',
    'finance.dettesFinancieres',
    'finance.fondsPropres',
  ];
  
  const missingRequired = requiredPaths.filter(path => {
    const pathParts = path.split('.');
    let current: unknown = data;
    for (const part of pathParts) {
      if (current === undefined || current === null) return true;
      current = (current as Record<string, unknown>)[part];
    }
    return current === undefined || current === null;
  });
  
  return { fields, missingRequired, data };
}

// ============= JSON Validation =============

export interface JsonImportData {
  meta?: {
    companyName?: unknown;
    sector?: unknown;
    year?: unknown;
  };
  finance?: {
    caAnnuel?: unknown;
    resultatNet?: unknown;
    tresorerie?: unknown;
    dettesFinancieres?: unknown;
    fondsPropres?: unknown;
  };
  costs?: {
    chargesRH?: unknown;
    cogs?: unknown;
    chargesFixes?: unknown;
  };
  operations?: {
    effectifETP?: unknown;
    tauxOccupation?: unknown;
    qualiteRetours?: unknown;
  };
  commercial?: {
    digitalisation?: unknown;
    satisfactionClient?: unknown;
  };
  rh?: {
    absenteisme?: unknown;
    turnover?: unknown;
  };
}

export function validateJsonImport(jsonString: string): ImportValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  
  // Step 1: Parse JSON
  let data: JsonImportData;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    errors.push({ field: 'json', message: 'Format JSON invalide. Vérifiez la syntaxe.' });
    return { isValid: false, errors, warnings, parsedData: null };
  }
  
  // Step 2: Check required fields
  const requiredFields = [
    { path: 'meta.companyName', label: 'Nom entreprise' },
    { path: 'meta.sector', label: 'Secteur' },
    { path: 'meta.year', label: 'Année' },
    { path: 'finance.caAnnuel', label: 'CA Annuel' },
    { path: 'finance.resultatNet', label: 'Résultat Net' },
    { path: 'finance.tresorerie', label: 'Trésorerie' },
    { path: 'finance.dettesFinancieres', label: 'Dettes Financières' },
    { path: 'finance.fondsPropres', label: 'Fonds Propres' },
  ];
  
  for (const { path, label } of requiredFields) {
    const value = getNestedValue(data, path);
    if (value === undefined || value === null || value === '') {
      errors.push({ field: path, message: `Champ obligatoire manquant : ${label}` });
    }
  }
  
  // Step 3: Type validation
  const numericFields = [
    'meta.year',
    'finance.caAnnuel',
    'finance.resultatNet',
    'finance.tresorerie',
    'finance.dettesFinancieres',
    'finance.fondsPropres',
    'costs.chargesRH',
    'costs.cogs',
    'costs.chargesFixes',
    'operations.effectifETP',
    'operations.tauxOccupation',
    'operations.qualiteRetours',
    'commercial.digitalisation',
    'commercial.satisfactionClient',
    'rh.absenteisme',
    'rh.turnover',
  ];
  
  for (const path of numericFields) {
    const value = getNestedValue(data, path);
    if (value !== undefined && value !== null && typeof value !== 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push({ field: path, message: `${path} doit être un nombre` });
      }
    }
  }
  
  // Step 4: Critical value validation
  const caAnnuel = Number(getNestedValue(data, 'finance.caAnnuel'));
  if (!isNaN(caAnnuel) && caAnnuel <= 0) {
    errors.push({ field: 'finance.caAnnuel', message: 'Le CA annuel doit être strictement positif' });
  }
  
  const tauxOccupation = Number(getNestedValue(data, 'operations.tauxOccupation'));
  if (!isNaN(tauxOccupation) && tauxOccupation > 100) {
    errors.push({ field: 'operations.tauxOccupation', message: 'Le taux d\'occupation ne peut pas dépasser 100%' });
  }
  
  // Step 5: Sector validation
  const rawSector = getNestedValue(data, 'meta.sector');
  const sectorResult = validateAndMapSector(rawSector as string | undefined);
  if (sectorResult.warning) {
    warnings.push({ field: 'meta.sector', message: sectorResult.warning });
  }
  
  // Step 6: Business warnings (non-blocking)
  const tresorerie = Number(getNestedValue(data, 'finance.tresorerie'));
  if (!isNaN(tresorerie) && tresorerie < -1000000) {
    warnings.push({ field: 'finance.tresorerie', message: 'Trésorerie très négative (< -1M€)' });
  }
  
  const turnover = Number(getNestedValue(data, 'rh.turnover'));
  if (!isNaN(turnover) && turnover > 60) {
    warnings.push({ field: 'rh.turnover', message: 'Turnover exceptionnellement élevé (> 60%)' });
  }
  
  const chargesRH = Number(getNestedValue(data, 'costs.chargesRH'));
  if (!isNaN(chargesRH) && chargesRH > 80) {
    warnings.push({ field: 'costs.chargesRH', message: 'Charges RH très élevées (> 80% du CA)' });
  }
  
  // Check BFR > CA (if calculable)
  // BFR approximation: créances + stocks - dettes fournisseurs
  // For now, skip BFR check as we don't have all needed fields
  
  // Step 7: Convert to AuditDataV2
  if (errors.length === 0) {
    const parsedData = convertToAuditDataV2(data, sectorResult.canonicalSector);
    return { isValid: true, errors, warnings, parsedData };
  }
  
  return { isValid: false, errors, warnings, parsedData: null };
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function convertToAuditDataV2(data: JsonImportData, canonicalSector?: AllowedSector): Partial<AuditDataV2> {
  const safeNum = (val: unknown): number | undefined => {
    if (val === undefined || val === null) return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  };
  
  const safeStr = (val: unknown): string => {
    return String(val ?? '');
  };

  // Use validated sector or fallback
  const sector = canonicalSector || 'autre';
  
  return {
    businessName: safeStr(data.meta?.companyName),
    sector: SECTOR_LABELS[sector], // Use human-readable label
    auditDate: new Date().toISOString().split('T')[0],
    dataOrigin: 'client_declarative',
    finance: {
      annualRevenue: safeNum(data.finance?.caAnnuel) ?? 0,
      grossMarginPercent: 70, // Default, will be calculated if possible
      netMarginPercent: undefined,
      cashRunwayMonths: undefined,
    },
    costs: {
      hrCostsPercent: safeNum(data.costs?.chargesRH) ?? 50,
      cogsPercent: safeNum(data.costs?.cogs),
      fixedCostsPercent: safeNum(data.costs?.chargesFixes),
    },
    ops: {
      occupancyRatePercent: safeNum(data.operations?.tauxOccupation) ?? 80,
      productivity: {
        fte: safeNum(data.operations?.effectifETP) ?? 1,
        revenuePerFte: undefined,
      },
      quality: data.operations?.qualiteRetours !== undefined ? {
        returnRatePercent: safeNum(data.operations?.qualiteRetours),
      } : undefined,
    },
    hr: (data.rh?.absenteisme !== undefined || data.rh?.turnover !== undefined) ? {
      absenteeismRatePercent: safeNum(data.rh?.absenteisme),
      turnoverRatePercent: safeNum(data.rh?.turnover),
    } : undefined,
    commercial: {
      digitalizationPercent: safeNum(data.commercial?.digitalisation) ?? 50,
      loyaltyPercent: undefined,
      satisfaction: data.commercial?.satisfactionClient !== undefined ? {
        csatPercent: safeNum(data.commercial?.satisfactionClient),
      } : undefined,
    },
    nbServices: 1,
  };
}

// ============= Excel to AuditDataV2 Conversion =============

export function convertExcelDataToAuditV2(data: Record<string, unknown>, canonicalSector?: AllowedSector): Partial<AuditDataV2> {
  const meta = data.meta as Record<string, unknown> | undefined;
  const finance = data.finance as Record<string, unknown> | undefined;
  const costs = data.costs as Record<string, unknown> | undefined;
  const operations = data.operations as Record<string, unknown> | undefined;
  const commercial = data.commercial as Record<string, unknown> | undefined;
  const rh = data.rh as Record<string, unknown> | undefined;
  
  const safeNum = (val: unknown): number | undefined => {
    if (val === undefined || val === null) return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  };

  // Use validated sector or fallback
  const sector = canonicalSector || 'autre';
  
  return {
    businessName: String(meta?.companyName ?? ''),
    sector: SECTOR_LABELS[sector], // Use human-readable label
    auditDate: new Date().toISOString().split('T')[0],
    dataOrigin: 'client_declarative',
    finance: {
      annualRevenue: safeNum(finance?.caAnnuel) ?? 0,
      grossMarginPercent: 70,
      netMarginPercent: undefined,
      cashRunwayMonths: undefined,
    },
    costs: {
      hrCostsPercent: safeNum(costs?.chargesRH) ?? 50,
      cogsPercent: safeNum(costs?.cogs),
      fixedCostsPercent: safeNum(costs?.chargesFixes),
    },
    ops: {
      occupancyRatePercent: safeNum(operations?.tauxOccupation) ?? 80,
      productivity: {
        fte: safeNum(operations?.effectifETP) ?? 1,
        revenuePerFte: undefined,
      },
      quality: operations?.qualiteRetours !== undefined ? {
        returnRatePercent: safeNum(operations?.qualiteRetours),
      } : undefined,
    },
    hr: (rh?.absenteisme !== undefined || rh?.turnover !== undefined) ? {
      absenteeismRatePercent: safeNum(rh?.absenteisme),
      turnoverRatePercent: safeNum(rh?.turnover),
    } : undefined,
    commercial: {
      digitalizationPercent: safeNum(commercial?.digitalisation) ?? 50,
      loyaltyPercent: undefined,
      satisfaction: commercial?.satisfactionClient !== undefined ? {
        csatPercent: safeNum(commercial?.satisfactionClient),
      } : undefined,
    },
    nbServices: 1,
  };
}

// ============= Validation for Excel Data =============

export function validateExcelData(excelResult: ExcelParseResult): ImportValidationResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  
  // Check for required fields
  for (const missing of excelResult.missingRequired) {
    errors.push({ field: missing, message: `Champ obligatoire manquant : ${missing}` });
  }
  
  // Critical value checks
  const caAnnuel = getNestedValue(excelResult.data, 'finance.caAnnuel');
  if (caAnnuel !== undefined && Number(caAnnuel) <= 0) {
    errors.push({ field: 'finance.caAnnuel', message: 'Le CA annuel doit être strictement positif' });
  }
  
  const tauxOccupation = getNestedValue(excelResult.data, 'operations.tauxOccupation');
  if (tauxOccupation !== undefined && Number(tauxOccupation) > 100) {
    errors.push({ field: 'operations.tauxOccupation', message: 'Le taux d\'occupation ne peut pas dépasser 100%' });
  }
  
  // Sector validation
  const rawSector = getNestedValue(excelResult.data, 'meta.sector');
  const sectorResult = validateAndMapSector(rawSector as string | undefined);
  if (sectorResult.warning) {
    warnings.push({ field: 'meta.sector', message: sectorResult.warning });
  }
  
  // Business warnings
  const tresorerie = getNestedValue(excelResult.data, 'finance.tresorerie');
  if (tresorerie !== undefined && Number(tresorerie) < -1000000) {
    warnings.push({ field: 'finance.tresorerie', message: 'Trésorerie très négative (< -1M€)' });
  }
  
  const turnover = getNestedValue(excelResult.data, 'rh.turnover');
  if (turnover !== undefined && Number(turnover) > 60) {
    warnings.push({ field: 'rh.turnover', message: 'Turnover exceptionnellement élevé (> 60%)' });
  }
  
  const chargesRH = getNestedValue(excelResult.data, 'costs.chargesRH');
  if (chargesRH !== undefined && Number(chargesRH) > 80) {
    warnings.push({ field: 'costs.chargesRH', message: 'Charges RH très élevées (> 80% du CA)' });
  }
  
  if (errors.length === 0) {
    const parsedData = convertExcelDataToAuditV2(excelResult.data, sectorResult.canonicalSector);
    return { isValid: true, errors, warnings, parsedData };
  }
  
  return { isValid: false, errors, warnings, parsedData: null };
}
