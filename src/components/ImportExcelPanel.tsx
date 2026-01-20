import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  parseExcelChampValeur,
  validateExcelData,
  sha256Hash, 
  checkImportLimits, 
  recordImport,
  getShortHash,
  ImportValidationResult,
  ExcelParseResult
} from '@/lib/importHelpers';
import { AuditDataV2 } from '@/types/audit';
import { CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet, Loader2, Check, X } from 'lucide-react';

interface ImportExcelPanelProps {
  onImport: (data: Partial<AuditDataV2>, meta: { hash: string; timestamp: number; origin: 'excel_champ_valeur' }) => void;
  disabled?: boolean;
}

export function ImportExcelPanel({ onImport, disabled }: ImportExcelPanelProps) {
  const [excelInput, setExcelInput] = useState('');
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hash, setHash] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!excelInput.trim()) {
      setParseResult(null);
      setValidationResult(null);
      setImportError('Veuillez coller des données à valider.');
      return;
    }

    setIsValidating(true);
    setImportError(null);

    try {
      // Compute hash
      const contentHash = await sha256Hash(excelInput);
      setHash(contentHash);

      // Check import limits
      const limitCheck = checkImportLimits(contentHash);
      if (!limitCheck.allowed) {
        setImportError(limitCheck.reason!);
        setParseResult(null);
        setValidationResult(null);
        setIsValidating(false);
        return;
      }

      // Parse Excel format
      const parsed = parseExcelChampValeur(excelInput);
      setParseResult(parsed);

      // Validate parsed data
      const result = validateExcelData(parsed);
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
      origin: 'excel_champ_valeur',
    });
  };

  const exampleExcel = `Nom entreprise	Clinique Vétérinaire Dupont
Secteur	Veterinaire
Année	2024
CA Annuel	850 000 €
Résultat Net	68 000 €
Trésorerie	45 000 €
Dettes Financières	120 000 €
Fonds Propres	180 000 €
Charges RH (%)	52
Effectif (ETP)	6
Taux d'occupation (%)	82
Digitalisation (%)	75
Turnover (%)	15`;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Import Excel (Champ / Valeur)
        </CardTitle>
        <CardDescription>
          Copiez 2 colonnes depuis Excel : Champ (colonne A) et Valeur (colonne B)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder={exampleExcel}
            value={excelInput}
            onChange={(e) => {
              setExcelInput(e.target.value);
              setParseResult(null);
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
          disabled={disabled || isValidating || !excelInput.trim()}
          className="w-full"
          variant="outline"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Conversion en cours...
            </>
          ) : (
            'Convertir & Valider'
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

        {/* Parse Results - Field Mapping */}
        {parseResult && (
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-3">Champs détectés</h4>
              <div className="space-y-2">
                {parseResult.fields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {field.mapped ? (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-muted-foreground truncate">{field.original}</span>
                    <span className="text-muted-foreground">→</span>
                    {field.mapped ? (
                      <Badge variant="secondary" className="text-xs">
                        {field.mapped}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">non reconnu</span>
                    )}
                    {field.value !== undefined && (
                      <span className="ml-auto text-foreground font-medium">
                        {typeof field.value === 'number' ? field.value.toLocaleString('fr-FR') : field.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Required Fields */}
            {parseResult.missingRequired.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Champs obligatoires manquants</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {parseResult.missingRequired.map((field, i) => (
                      <li key={i} className="text-sm">{field}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
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
