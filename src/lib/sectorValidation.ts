/**
 * Sector Validation and Mapping
 * Controlled list of allowed sectors with synonym mapping
 */

// ============= Canonical Sectors (V1) =============

export const ALLOWED_SECTORS = [
  'veterinaire',
  'clinique_veterinaire',
  'osteopathe',
  'kinesitherapeute',
  'therapeute',
  'sante_liberale_autre',
  'commerce',
  'services',
  'btp',
  'industrie',
  'restauration',
  'autre',
] as const;

export type AllowedSector = typeof ALLOWED_SECTORS[number];

// ============= Sector Labels (for display) =============

export const SECTOR_LABELS: Record<AllowedSector, string> = {
  veterinaire: 'Vétérinaire',
  clinique_veterinaire: 'Clinique Vétérinaire',
  osteopathe: 'Ostéopathe',
  kinesitherapeute: 'Kinésithérapeute',
  therapeute: 'Thérapeute / Bien-être',
  sante_liberale_autre: 'Santé Libérale (autre)',
  commerce: 'Commerce',
  services: 'Services',
  btp: 'BTP / Construction',
  industrie: 'Industrie',
  restauration: 'Restauration',
  autre: 'Autre secteur',
};

// ============= Synonym Mapping =============

const SECTOR_SYNONYMS: Record<string, AllowedSector> = {
  // Vétérinaire
  'veterinaire': 'veterinaire',
  'veto': 'veterinaire',
  'veterinary': 'veterinaire',
  'animal': 'veterinaire',
  'clinique veterinaire': 'clinique_veterinaire',
  'clinique veto': 'clinique_veterinaire',
  'hopital veterinaire': 'clinique_veterinaire',
  
  // Ostéopathe
  'osteopathe': 'osteopathe',
  'osteo': 'osteopathe',
  'osteopathie': 'osteopathe',
  'osteopath': 'osteopathe',
  
  // Kinésithérapeute
  'kinesitherapeute': 'kinesitherapeute',
  'kine': 'kinesitherapeute',
  'kinetherapeute': 'kinesitherapeute',
  'masseur kinesitherapeute': 'kinesitherapeute',
  'masseur kine': 'kinesitherapeute',
  'physiotherapeute': 'kinesitherapeute',
  'physio': 'kinesitherapeute',
  
  // Thérapeute
  'therapeute': 'therapeute',
  'therapie': 'therapeute',
  'praticien bien etre': 'therapeute',
  'praticien bien-etre': 'therapeute',
  'bien etre': 'therapeute',
  'bien-etre': 'therapeute',
  'psychologue': 'therapeute',
  'psychotherapeute': 'therapeute',
  'sophrologie': 'therapeute',
  'sophrologue': 'therapeute',
  'naturopathe': 'therapeute',
  'naturopathie': 'therapeute',
  'hypnotherapeute': 'therapeute',
  'hypnose': 'therapeute',
  'acupuncteur': 'therapeute',
  'acupuncture': 'therapeute',
  
  // Santé libérale autre
  'sante liberale autre': 'sante_liberale_autre',
  'sante liberale': 'sante_liberale_autre',
  'professionnel de sante': 'sante_liberale_autre',
  'medecin': 'sante_liberale_autre',
  'dentiste': 'sante_liberale_autre',
  'infirmier': 'sante_liberale_autre',
  'infirmiere': 'sante_liberale_autre',
  'pharmacien': 'sante_liberale_autre',
  'sage femme': 'sante_liberale_autre',
  'orthophoniste': 'sante_liberale_autre',
  'podologue': 'sante_liberale_autre',
  'dieteticien': 'sante_liberale_autre',
  
  // Commerce
  'commerce': 'commerce',
  'commerce de detail': 'commerce',
  'retail': 'commerce',
  'boutique': 'commerce',
  'magasin': 'commerce',
  'epicerie': 'commerce',
  'supermarche': 'commerce',
  
  // Services
  'services': 'services',
  'service': 'services',
  'conseil': 'services',
  'consulting': 'services',
  'cabinet conseil': 'services',
  'agence': 'services',
  'prestataire': 'services',
  'b2b': 'services',
  
  // BTP
  'btp': 'btp',
  'construction': 'btp',
  'batiment': 'btp',
  'travaux publics': 'btp',
  'artisan': 'btp',
  'plombier': 'btp',
  'electricien': 'btp',
  'maconnerie': 'btp',
  'menuiserie': 'btp',
  'peintre': 'btp',
  'couvreur': 'btp',
  
  // Industrie
  'industrie': 'industrie',
  'industriel': 'industrie',
  'manufacture': 'industrie',
  'usine': 'industrie',
  'production': 'industrie',
  'fabrication': 'industrie',
  
  // Restauration
  'restauration': 'restauration',
  'restaurant': 'restauration',
  'resto': 'restauration',
  'cafe': 'restauration',
  'bar': 'restauration',
  'brasserie': 'restauration',
  'traiteur': 'restauration',
  'fast food': 'restauration',
  'snack': 'restauration',
  'pizzeria': 'restauration',
  'boulangerie': 'restauration',
  'patisserie': 'restauration',
  
  // Autre
  'autre': 'autre',
  'other': 'autre',
  'divers': 'autre',
  'non specifie': 'autre',
};

// ============= Normalization =============

export function normalizeForSectorMatch(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============= Sector Validation =============

export interface SectorValidationResult {
  isValid: boolean;
  canonicalSector: AllowedSector;
  label: string;
  isFallback: boolean;
  warning?: string;
}

export function validateAndMapSector(rawValue: string | undefined | null): SectorValidationResult {
  // Empty or missing → error (handled separately, return fallback here)
  if (!rawValue || rawValue.trim() === '') {
    return {
      isValid: false,
      canonicalSector: 'autre',
      label: SECTOR_LABELS.autre,
      isFallback: true,
      warning: 'Secteur non renseigné',
    };
  }

  const normalized = normalizeForSectorMatch(rawValue);

  // Direct match in allowed sectors
  if (ALLOWED_SECTORS.includes(normalized as AllowedSector)) {
    return {
      isValid: true,
      canonicalSector: normalized as AllowedSector,
      label: SECTOR_LABELS[normalized as AllowedSector],
      isFallback: false,
    };
  }

  // Check synonyms
  const mappedSector = SECTOR_SYNONYMS[normalized];
  if (mappedSector) {
    return {
      isValid: true,
      canonicalSector: mappedSector,
      label: SECTOR_LABELS[mappedSector],
      isFallback: false,
    };
  }

  // Partial match attempt
  for (const [synonym, sector] of Object.entries(SECTOR_SYNONYMS)) {
    if (normalized.includes(synonym) || synonym.includes(normalized)) {
      return {
        isValid: true,
        canonicalSector: sector,
        label: SECTOR_LABELS[sector],
        isFallback: false,
      };
    }
  }

  // Fallback to "autre" with warning
  return {
    isValid: true,
    canonicalSector: 'autre',
    label: SECTOR_LABELS.autre,
    isFallback: true,
    warning: `Secteur non reconnu ("${rawValue}"), analyse réalisée sans benchmark sectoriel précis`,
  };
}

// ============= Get all sectors for dropdown =============

export function getAllAllowedSectors(): { value: AllowedSector; label: string }[] {
  return ALLOWED_SECTORS.map(sector => ({
    value: sector,
    label: SECTOR_LABELS[sector],
  }));
}
