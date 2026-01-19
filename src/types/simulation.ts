// ============ Simulation Types ============

export type ConfidenceLevel = 'FAIBLE' | 'MOYEN' | 'BON';

export type SimulationType = 
  | 'TRESORERIE' 
  | 'RENTABILITE' 
  | 'ACTIVITE' 
  | 'COMMERCIAL' 
  | 'RH';

export interface SimulationInput {
  id: string;
  label: string;
  value: number;
  unit: string;
  description: string;
}

export interface SimulationResult {
  id: string;
  type: SimulationType;
  title: string;
  description: string;
  inputs: SimulationInput[];
  impactMin: number;
  impactMax: number;
  impactUnit: '€' | '%' | 'jours';
  impactLabel: string;
  secondaryEffects: string[];
  hypotheses: string[];
  confidenceLevel: ConfidenceLevel;
  priority: number; // 1-5, lower = higher priority
}

export interface SimulationScenario {
  type: SimulationType;
  label: string;
  icon: string;
  description: string;
  inputs: SimulationInputOption[];
}

export interface SimulationInputOption {
  id: string;
  label: string;
  options: { value: number; label: string }[];
  unit: string;
  description: string;
}

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    type: 'TRESORERIE',
    label: 'Trésorerie / Runway',
    icon: '💰',
    description: 'Simulez l\'impact d\'actions sur votre trésorerie et votre capacité à opérer',
    inputs: [
      {
        id: 'delai_client',
        label: 'Réduction délai client',
        options: [
          { value: 0, label: 'Aucune' },
          { value: -15, label: '-15 jours' },
          { value: -30, label: '-30 jours' }
        ],
        unit: 'jours',
        description: 'Réduction du délai moyen de paiement client'
      },
      {
        id: 'delai_fournisseur',
        label: 'Allongement délai fournisseur',
        options: [
          { value: 0, label: 'Aucun' },
          { value: 15, label: '+15 jours' }
        ],
        unit: 'jours',
        description: 'Allongement négocié du délai de paiement fournisseur'
      },
      {
        id: 'reduction_charges',
        label: 'Réduction charges fixes',
        options: [
          { value: 0, label: 'Aucune' },
          { value: -5, label: '-5%' },
          { value: -10, label: '-10%' }
        ],
        unit: '%',
        description: 'Réduction des charges fixes mensuelles'
      }
    ]
  },
  {
    type: 'RENTABILITE',
    label: 'Rentabilité',
    icon: '📈',
    description: 'Simulez l\'impact sur votre résultat net annuel',
    inputs: [
      {
        id: 'marge_brute',
        label: 'Augmentation marge brute',
        options: [
          { value: 0, label: 'Aucune' },
          { value: 1, label: '+1 point' },
          { value: 2, label: '+2 points' },
          { value: 3, label: '+3 points' }
        ],
        unit: 'points',
        description: 'Amélioration de la marge brute en points de pourcentage'
      },
      {
        id: 'reduction_cogs',
        label: 'Réduction COGS',
        options: [
          { value: 0, label: 'Aucune' },
          { value: -3, label: '-3%' },
          { value: -5, label: '-5%' }
        ],
        unit: '%',
        description: 'Réduction des coûts des marchandises vendues'
      },
      {
        id: 'reduction_rh',
        label: 'Réduction charges RH',
        options: [
          { value: 0, label: 'Aucune' },
          { value: -5, label: '-5%' }
        ],
        unit: '%',
        description: 'Optimisation des charges de personnel'
      }
    ]
  },
  {
    type: 'ACTIVITE',
    label: 'Activité / Productivité',
    icon: '⚡',
    description: 'Simulez l\'impact d\'une amélioration de l\'efficacité opérationnelle',
    inputs: [
      {
        id: 'taux_occupation',
        label: 'Hausse taux d\'occupation',
        options: [
          { value: 0, label: 'Aucune' },
          { value: 5, label: '+5 points' },
          { value: 10, label: '+10 points' }
        ],
        unit: 'points',
        description: 'Amélioration du taux d\'occupation des ressources'
      },
      {
        id: 'ca_par_etp',
        label: 'Hausse CA par ETP',
        options: [
          { value: 0, label: 'Aucune' },
          { value: 5, label: '+5%' },
          { value: 10, label: '+10%' }
        ],
        unit: '%',
        description: 'Augmentation de la productivité par collaborateur'
      }
    ]
  },
  {
    type: 'COMMERCIAL',
    label: 'Commercial / Digital',
    icon: '🛒',
    description: 'Simulez l\'impact d\'actions commerciales et digitales',
    inputs: [
      {
        id: 'taux_conversion',
        label: 'Hausse taux de conversion',
        options: [
          { value: 0, label: 'Aucune' },
          { value: 1, label: '+1 point' },
          { value: 2, label: '+2 points' }
        ],
        unit: 'points',
        description: 'Amélioration du taux de transformation visiteurs/clients'
      },
      {
        id: 'panier_moyen',
        label: 'Hausse panier moyen',
        options: [
          { value: 0, label: 'Aucune' },
          { value: 5, label: '+5%' },
          { value: 10, label: '+10%' }
        ],
        unit: '%',
        description: 'Augmentation du montant moyen par transaction'
      }
    ]
  },
  {
    type: 'RH',
    label: 'Ressources Humaines',
    icon: '👥',
    description: 'Simulez l\'impact d\'améliorations RH (estimation indirecte)',
    inputs: [
      {
        id: 'turnover',
        label: 'Baisse turnover',
        options: [
          { value: 0, label: 'Aucune' },
          { value: -5, label: '-5 points' },
          { value: -10, label: '-10 points' }
        ],
        unit: 'points',
        description: 'Réduction du taux de rotation du personnel'
      },
      {
        id: 'absenteisme',
        label: 'Baisse absentéisme',
        options: [
          { value: 0, label: 'Aucune' },
          { value: -1, label: '-1 point' },
          { value: -2, label: '-2 points' }
        ],
        unit: 'points',
        description: 'Réduction du taux d\'absentéisme'
      }
    ]
  }
];

export const SIMULATION_DISCLAIMER = 
  "Les simulations proposées constituent des aides à la réflexion basées sur des hypothèses déclaratives. " +
  "Elles ne constituent ni des prévisions ni des engagements de résultat.";
