import { useEffect } from 'react';
import { useDownloadPdf } from './useAudit';

export function useKeyboardShortcuts() {
  const { downloadPdf, isPdfGenerating } = useDownloadPdf();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P or Cmd+P for PDF download
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault(); // Block browser print dialog
        if (!isPdfGenerating) {
          downloadPdf();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [downloadPdf, isPdfGenerating]);
}
