import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuditData, Scores } from '@/types/audit';
import { toast } from 'sonner';
import { useAuditStatus, useAuditActions } from '@/hooks/useAudit';
import html2pdf from 'html2pdf.js';

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

      // Create a temporary container for the HTML
      const container = document.createElement('div');
      container.innerHTML = data.html;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      // Configure PDF options
      const opt = {
        margin: 0,
        filename: `audit-${auditData.nom || 'rapport'}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generate and download PDF
      await html2pdf().set(opt).from(container).save();

      // Clean up
      document.body.removeChild(container);

      toast.success('Rapport PDF téléchargé avec succès !');
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
