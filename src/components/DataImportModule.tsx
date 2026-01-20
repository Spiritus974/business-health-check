import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImportJsonPanel } from './ImportJsonPanel';
import { ImportExcelPanel } from './ImportExcelPanel';
import { AuditDataV2 } from '@/types/audit';
import { useAuditContext } from '@/contexts/AuditContext';
import { FileJson, FileSpreadsheet, Upload, AlertTriangle, RotateCcw } from 'lucide-react';

interface DataImportModuleProps {
  onImportComplete?: () => void;
}

export function DataImportModule({ onImportComplete }: DataImportModuleProps) {
  const { auditData, scores, resetAudit, importAuditFromData } = useAuditContext();
  const [activeTab, setActiveTab] = useState<'json' | 'excel'>('json');
  
  const hasExistingAudit = auditData !== null && scores !== null;

  const handleImport = (
    data: Partial<AuditDataV2>, 
    meta: { hash: string; timestamp: number; origin: 'declaratif_client' | 'excel_champ_valeur' }
  ) => {
    importAuditFromData(data as AuditDataV2, {
      dataOrigin: meta.origin,
      importHash: meta.hash,
      importTimestamp: meta.timestamp,
    });
    
    onImportComplete?.();
  };

  const handleReset = () => {
    resetAudit();
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent text-accent-foreground">
            <Upload className="w-5 h-5" />
          </div>
          Import Données Client
        </CardTitle>
        <CardDescription>
          Importez vos données financières par copier-coller (JSON ou Excel)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning if audit already exists */}
        {hasExistingAudit && (
          <Alert className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Audit en cours</AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-muted-foreground">
                Un audit est déjà en cours. Un nouvel import créera un nouvel audit.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset audit
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'json' | 'excel')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="excel" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel Champ/Valeur
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="json" className="mt-4">
            <ImportJsonPanel 
              onImport={handleImport}
              disabled={false}
            />
          </TabsContent>
          
          <TabsContent value="excel" className="mt-4">
            <ImportExcelPanel 
              onImport={handleImport}
              disabled={false}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
