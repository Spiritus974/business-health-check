import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  validateJsonImport, 
  sha256Hash, 
  checkImportLimits, 
  recordImport,
  getShortHash,
  ImportValidationResult 
} from '@/lib/importHelpers';
import { AuditDataV2 } from '@/types/audit';
import { CheckCircle2, XCircle, AlertTriangle, FileJson, Loader2 } from 'lucide-react';

interface ImportJsonPanelProps {
  onImport: (data: Partial<AuditDataV2>, meta: { hash: string; timestamp: number; origin: 'declaratif_client' }) => void;
  disabled?: boolean;
}

export function ImportJsonPanel({ onImport, disabled }: ImportJsonPanelProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hash, setHash] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!jsonInput.trim()) {
      setValidationResult(null);
      setImportError('Veuillez coller un JSON à valider.');
      return;
    }

    setIsValidating(true);
    setImportError(null);

    try {
      // Compute hash
      const contentHash = await sha256Hash(jsonInput);
      setHash(contentHash);

      // Check import limits
      const limitCheck = checkImportLimits(contentHash);
      if (!limitCheck.allowed) {
        setImportError(limitCheck.reason!);
        setValidationResult(null);
        setIsValidating(false);
        return;
      }

      // Validate JSON
      const result = validateJsonImport(jsonInput);
      setValidationResult(result);
    } catch (error) {
      setImportError('Erreur lors de la validation.');
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = () => {
    if (!validationResult?.isValid || !validationResult.parsedData || !hash) return;

    const timestamp = Date.now();
    recordImport(hash);
    
    onImport(validationResult.parsedData, {
      hash,
      timestamp,
      origin: 'declaratif_client',
    });
  };

  const exampleJson = `{
  "meta": {
    "companyName": "Clinique Vétérinaire Dupont",
    "sector": "Veterinaire",
    "year": 2024
  },
  "finance": {
    "caAnnuel": 850000,
    "resultatNet": 68000,
    "tresorerie": 45000,
    "dettesFinancieres": 120000,
    "fondsPropres": 180000
  },
  "costs": {
    "chargesRH": 52,
    "cogs": 28
  },
  "operations": {
    "effectifETP": 6,
    "tauxOccupation": 82
  },
  "commercial": {
    "digitalisation": 75
  },
  "rh": {
    "turnover": 15
  }
}`;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-primary" />
          Import JSON
        </CardTitle>
        <CardDescription>
          Collez directement vos données au format JSON structuré
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder={exampleJson}
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setValidationResult(null);
              setImportError(null);
            }}
            className="min-h-[300px] font-mono text-sm"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Les données importées sont déclaratives et n'ont pas fait l'objet d'une vérification externe. 
            L'audit constitue une aide à la décision.
          </p>
        </div>

        {/* Validation Button */}
        <Button 
          onClick={handleValidate} 
          disabled={disabled || isValidating || !jsonInput.trim()}
          className="w-full"
          variant="outline"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validation en cours...
            </>
          ) : (
            'Valider le JSON'
          )}
        </Button>

        {/* Import Error */}
        {importError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-3">
            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Erreurs bloquantes ({validationResult.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {validationResult.errors.map((err, i) => (
                      <li key={i} className="text-sm">{err.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <Alert className="border-warning bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Alertes de cohérence ({validationResult.warnings.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {validationResult.warnings.map((warn, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{warn.message}</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Ces alertes seront signalées dans le rapport.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Success */}
            {validationResult.isValid && (
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Données valides</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Les données sont prêtes à être analysées.
                  {hash && (
                    <span className="block text-xs mt-1">
                      ID Import : {getShortHash(hash)}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!validationResult.isValid || disabled}
              className="w-full"
            >
              Importer dans l'audit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
