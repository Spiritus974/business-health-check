// Re-export types from centralized location
export type { AuditData, AuditDataV1, AuditDataV2, Scores, ScoreLevel, ScoreLevelType, AuditWarning } from '@/types/audit';
export { defaultAuditData, defaultAuditDataV1, defaultAuditDataV2, isAuditDataV2, normalizeToV2, convertV1ToV2, convertV2ToV1 } from '@/types/audit';

// Use V2 scoring by default
export { computeScoresV2 as computeScores4D, getScoreLevel } from './scoringV2';
