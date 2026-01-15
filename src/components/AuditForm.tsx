import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { AuditData, defaultAuditData } from '@/types/audit';
import { getAllSectors, getSectorVariants } from '@/lib/benchmarks';
import { Building2, TrendingUp, Users, Wifi, Heart, BarChart3, Briefcase } from 'lucide-react';

interface AuditFormProps {
  onSubmit: (data: AuditData) => void;
}

export function AuditForm({ onSubmit }: AuditFormProps) {
  const [formData, setFormData] = useState<AuditData>(defaultAuditData);
  const sectors = getAllSectors();
  const variants = getSectorVariants(formData.secteur);

  const handleSectorChange = (sector: string) => {
    const newVariants = getSectorVariants(sector);
    setFormData({
      ...formData,
      secteur: sector,
      variant: newVariants[0]?.id || undefined
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in bg-card rounded-2xl p-8 shadow-soft border border-border/50">
      <h2 className="font-display font-bold text-2xl text-foreground mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary text-primary-foreground">
          <BarChart3 className="w-5 h-5" />
        </div>
        Données de l'audit
      </h2>
      
      <div className="space-y-6">
        {/* Business Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nom" className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Nom de l'entreprise
            </Label>
            <Input
              id="nom"
              placeholder="Clinique Dubois"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="secteur" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              Secteur
            </Label>
            <Select value={formData.secteur} onValueChange={handleSectorChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {variants.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="variant">Type d'établissement</Label>
            <Select value={formData.variant} onValueChange={(v) => setFormData({ ...formData, variant: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Financial Metrics */}
        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Indicateurs Financiers
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="caannuel">CA Annuel (€)</Label>
              <Input
                id="caannuel"
                type="number"
                value={formData.caannuel}
                onChange={(e) => setFormData({ ...formData, caannuel: Number(e.target.value) })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="margebrutepct">Marge brute (%)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[formData.margebrutepct]}
                  onValueChange={([v]) => setFormData({ ...formData, margebrutepct: v })}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-sm text-muted-foreground">{formData.margebrutepct}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="chargesrhpct">Charges RH (%)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[formData.chargesrhpct]}
                  onValueChange={([v]) => setFormData({ ...formData, chargesrhpct: v })}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-sm text-muted-foreground">{formData.chargesrhpct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            Indicateurs Opérationnels
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effectifetp">Effectif (ETP)</Label>
              <Input
                id="effectifetp"
                type="number"
                step="0.5"
                value={formData.effectifetp}
                onChange={(e) => setFormData({ ...formData, effectifetp: Number(e.target.value) })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tauxoccupation">Taux d'occupation (%)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[formData.tauxoccupation * 100]}
                  onValueChange={([v]) => setFormData({ ...formData, tauxoccupation: v / 100 })}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-sm text-muted-foreground">{Math.round(formData.tauxoccupation * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Metrics */}
        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-accent" />
            Indicateurs Commerciaux
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="digitalpct">Digitalisation (%)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[formData.digitalpct]}
                  onValueChange={([v]) => setFormData({ ...formData, digitalpct: v })}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-sm text-muted-foreground">{formData.digitalpct}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fidelisationpct">Fidélisation clients (%)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[formData.fidelisationpct]}
                  onValueChange={([v]) => setFormData({ ...formData, fidelisationpct: v })}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-sm text-muted-foreground">{formData.fidelisationpct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Metrics */}
        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-accent" />
            Indicateurs Stratégiques
          </h3>
          
          <div className="space-y-2">
            <Label htmlFor="nbservices">Nombre de services/produits</Label>
            <Input
              id="nbservices"
              type="number"
              min="1"
              max="20"
              value={formData.nbservices}
              onChange={(e) => setFormData({ ...formData, nbservices: Number(e.target.value) })}
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold">
          Calculer le Score
        </Button>
      </div>
    </form>
  );
}
