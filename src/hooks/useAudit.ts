import { useAuditContext } from '@/contexts/AuditContext';

// Main hook for common use cases
export function useAudit() {
  const { auditData, scores, warnings, businessName, isCalculating, submitAudit, resetAudit } = useAuditContext();
  return { auditData, scores, warnings, businessName, isCalculating, submitAudit, resetAudit };
}

// Export individual selectors for more granular access
export function useAuditData() {
  const { auditData } = useAuditContext();
  return auditData;
}

export function useScores() {
  const { scores } = useAuditContext();
  return scores;
}

export function useWarnings() {
  const { warnings } = useAuditContext();
  return warnings;
}

export function useBusinessName() {
  const { businessName } = useAuditContext();
  return businessName;
}

export function useAuditActions() {
  const { submitAudit, resetAudit, setIsPdfGenerating, downloadPdf, sendPdfEmail } = useAuditContext();
  return { submitAudit, resetAudit, setIsPdfGenerating, downloadPdf, sendPdfEmail };
}

export function useAuditStatus() {
  const { isCalculating, isPdfGenerating } = useAuditContext();
  return { isCalculating, isPdfGenerating };
}

export function useDownloadPdf() {
  const { downloadPdf, isPdfGenerating } = useAuditContext();
  return { downloadPdf, isPdfGenerating };
}

export function useSendPdfEmail() {
  const { sendPdfEmail, isPdfGenerating } = useAuditContext();
  return { sendPdfEmail, isPdfGenerating };
}
