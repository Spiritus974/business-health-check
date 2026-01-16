import { AuditWarning } from '@/types/audit';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface WarningsDisplayProps {
  warnings: AuditWarning[];
}

export function WarningsDisplay({ warnings }: WarningsDisplayProps) {
  if (warnings.length === 0) return null;

  const criticalWarnings = warnings.filter(w => w.type === 'critical');
  const regularWarnings = warnings.filter(w => w.type === 'warning');

  return (
    <div className="space-y-3 mb-6">
      {criticalWarnings.length > 0 && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <h4 className="font-semibold text-destructive flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" />
            Alertes Critiques
          </h4>
          <ul className="space-y-1">
            {criticalWarnings.map((warning, i) => (
              <li key={i} className="text-sm text-destructive/90">
                🚨 {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {regularWarnings.length > 0 && (
        <div className="bg-warning/10 border border-warning rounded-lg p-4">
          <h4 className="font-semibold text-warning flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            Points d'Attention
          </h4>
          <ul className="space-y-1">
            {regularWarnings.map((warning, i) => (
              <li key={i} className="text-sm text-warning/90">
                ⚠️ {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
