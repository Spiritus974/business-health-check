import { AuditForm } from '@/components/AuditForm';
import { GlobalScoreDisplay } from '@/components/GlobalScoreDisplay';
import { ScoreCard } from '@/components/ScoreCard';
import { RadarChartDisplay } from '@/components/RadarChart';
import { PDFDownloadButton } from '@/components/PDFDownloadButton';
import { useAudit } from '@/hooks/useAudit';
import { TrendingUp, Users, ShoppingCart, Target, BarChart3 } from 'lucide-react';

const Index = () => {
  const { scores, auditData, businessName, submitAudit } = useAudit();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display font-bold text-xl text-foreground">
              Audit<span className="text-accent">Score</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in">
            <h2 className="font-display font-bold text-4xl md:text-5xl text-foreground mb-4">
              Évaluez la performance de votre entreprise
            </h2>
            <p className="text-lg text-muted-foreground">
              Scoring 4D basé sur les benchmarks sectoriels pour identifier vos forces et axes d'amélioration
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <AuditForm onSubmit={submitAudit} />
          </div>
        </div>
      </section>

      {/* Results */}
      {scores && (
        <section id="results" className="py-16 bg-secondary/30">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="space-y-8">
              {/* Global Score */}
              <div className="flex flex-col items-center gap-4">
                <GlobalScoreDisplay score={scores.global} businessName={businessName} />
                {auditData && <PDFDownloadButton auditData={auditData} scores={scores} />}
              </div>
              
              {/* Dimension Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ScoreCard 
                  title="Financier" 
                  score={scores.financier} 
                  icon={<TrendingUp className="w-5 h-5" />}
                  delay={0}
                />
                <ScoreCard 
                  title="Opérationnel" 
                  score={scores.operationnel} 
                  icon={<Users className="w-5 h-5" />}
                  delay={100}
                />
                <ScoreCard 
                  title="Commercial" 
                  score={scores.commercial} 
                  icon={<ShoppingCart className="w-5 h-5" />}
                  delay={200}
                />
                <ScoreCard 
                  title="Stratégique" 
                  score={scores.strategique} 
                  icon={<Target className="w-5 h-5" />}
                  delay={300}
                />
              </div>
              
              {/* Radar Chart */}
              <div className="max-w-2xl mx-auto">
                <RadarChartDisplay scores={scores} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Scoring 4D paramétré • Benchmarks sectoriels v2.1 • {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
