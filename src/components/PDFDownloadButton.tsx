import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuditData, Scores } from '@/types/audit';
import { toast } from 'sonner';
import { useAuditStatus, useAuditActions } from '@/hooks/useAudit';

interface PDFDownloadButtonProps {
  auditData: AuditData;
  scores: Scores;
}

export function PDFDownloadButton({ auditData, scores }: PDFDownloadButtonProps) {
  const { isPdfGenerating } = useAuditStatus();
  const { setIsPdfGenerating } = useAuditActions();

  const handleDownload = async () => {
    setIsPdfGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: { auditData, scores }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.html) {
        throw new Error('No HTML content received');
      }

      // Create a new window with the HTML content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked - please allow popups for this site');
      }

      printWindow.document.write(data.html);
      printWindow.document.close();

      // Wait for content to load then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

      toast.success('Rapport PDF généré avec succès !');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
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
