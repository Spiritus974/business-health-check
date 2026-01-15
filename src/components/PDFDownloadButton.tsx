import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useDownloadPdf } from '@/hooks/useAudit';

export function PDFDownloadButton() {
  const { downloadPdf, isPdfGenerating } = useDownloadPdf();

  return (
    <Button 
      onClick={downloadPdf} 
      disabled={isPdfGenerating}
      className="bg-gradient-primary hover:opacity-90 transition-opacity"
    >
      {isPdfGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 mr-2" />
          Télécharger PDF (24 pages)
        </>
      )}
    </Button>
  );
}
