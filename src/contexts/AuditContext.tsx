import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AuditContextType, AuditData, AuditState, Scores, initialAuditState } from '@/types/audit';
import { computeScores4D } from '@/lib/scoring';

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

  const contextValue: AuditContextType = {
    ...state,
    submitAudit,
    resetAudit,
    setIsPdfGenerating
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
