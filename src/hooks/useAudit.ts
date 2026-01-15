import { useAuditContext } from '@/contexts/AuditContext';

// Re-export the context hook for convenience
export const useAudit = useAuditContext;

// Export individual selectors for more granular access
export function useAuditData() {
  const { auditData } = useAuditContext();
  return auditData;
}

export function useScores() {
  const { scores } = useAuditContext();
  return scores;
}

export function useBusinessName() {
  const { businessName } = useAuditContext();
  return businessName;
}

export function useAuditActions() {
  const { submitAudit, resetAudit, setIsPdfGenerating } = useAuditContext();
  return { submitAudit, resetAudit, setIsPdfGenerating };
}

export function useAuditStatus() {
  const { isCalculating, isPdfGenerating } = useAuditContext();
  return { isCalculating, isPdfGenerating };
}
