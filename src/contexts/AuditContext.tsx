import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AuditContextType, AuditData, AuditState, initialAuditState } from '@/types/audit';
import { computeScores4D } from '@/lib/scoring';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

const AuditContext = createContext<AuditContextType | undefined>(undefined);

interface AuditProviderProps {
  children: ReactNode;
}

export function AuditProvider({ children }: AuditProviderProps) {
  const [state, setState] = useState<AuditState>(initialAuditState);

  const submitAudit = useCallback((data: AuditData) => {
    setState(prev => ({ ...prev, isCalculating: true }));
    
    // Compute scores
    const computedScores = computeScores4D(data);
    
    setState({
      auditData: data,
      scores: computedScores,
      businessName: data.nom || 'Entreprise',
      isCalculating: false,
      isPdfGenerating: false
    });

    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const resetAudit = useCallback(() => {
    setState(initialAuditState);
  }, []);

  const setIsPdfGenerating = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isPdfGenerating: value }));
  }, []);

  const downloadPdf = useCallback(async () => {
    if (!state.auditData || !state.scores) {
      toast.error('Veuillez d\'abord effectuer un audit');
      return;
    }

    setState(prev => ({ ...prev, isPdfGenerating: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: { auditData: state.auditData, scores: state.scores }
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
        filename: `audit-${state.auditData.nom || 'rapport'}-${new Date().toISOString().split('T')[0]}.pdf`,
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
      setState(prev => ({ ...prev, isPdfGenerating: false }));
    }
  }, [state.auditData, state.scores]);

  const contextValue: AuditContextType = {
    ...state,
    submitAudit,
    resetAudit,
    setIsPdfGenerating,
    downloadPdf
  };

  return (
    <AuditContext.Provider value={contextValue}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAuditContext(): AuditContextType {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAuditContext must be used within an AuditProvider');
  }
  return context;
}
