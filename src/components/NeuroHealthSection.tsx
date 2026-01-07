import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Shield, Activity } from 'lucide-react';
import { NeuroHealthRisk } from '@/lib/airQuality';

interface NeuroHealthSectionProps {
  risk: NeuroHealthRisk;
}

const NeuroHealthSection = ({ risk }: NeuroHealthSectionProps) => {
  const getRiskColor = (level: NeuroHealthRisk['level']) => {
    switch (level) {
      case 'low': return 'text-air-excellent';
      case 'moderate': return 'text-air-moderate';
      case 'high': return 'text-air-unhealthy';
      case 'critical': return 'text-air-dangerous';
    }
  };

  const getRiskLabel = (level: NeuroHealthRisk['level']) => {
    switch (level) {
      case 'low': return 'Basso';
      case 'moderate': return 'Moderato';
      case 'high': return 'Alto';
      case 'critical': return 'Critico';
    }
  };

  const getRiskIcon = (level: NeuroHealthRisk['level']) => {
    switch (level) {
      case 'low': return Shield;
      case 'moderate': return Activity;
      case 'high': return AlertTriangle;
      case 'critical': return AlertTriangle;
    }
  };

  const RiskIcon = getRiskIcon(risk.level);

  return (
    <motion.div
      className="glass-panel-purple p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-2xl bg-accent/20">
          <Brain className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gradient-neuro">NeuroHealth Monitor</h2>
          <p className="text-sm text-muted-foreground">Analisi impatto neurologico PM2.5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Level */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Livello di Rischio</span>
            <RiskIcon className={`w-5 h-5 ${getRiskColor(risk.level)}`} />
          </div>
          <div className={`text-3xl font-bold ${getRiskColor(risk.level)}`}>
            {getRiskLabel(risk.level)}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Indice di rischio</span>
              <span className="font-medium">{Math.round(risk.percentage)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: risk.level === 'low' 
                    ? 'hsl(var(--air-excellent))' 
                    : risk.level === 'moderate'
                    ? 'hsl(var(--air-moderate))'
                    : risk.level === 'high'
                    ? 'hsl(var(--air-unhealthy))'
                    : 'hsl(var(--air-dangerous))'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${risk.percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Exposure Stats */}
        <div className="glass-panel p-5">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Esposizione Media</span>
                <span className="text-lg font-semibold">{risk.cumulativeExposure.toFixed(1)} µg/m³</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Media cumulativa PM2.5
              </p>
            </div>
            
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Tempo Sopra Soglia</span>
                <span className="text-lg font-semibold text-air-unhealthy">
                  {risk.timeAboveThreshold.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo con PM2.5 &gt; 35 µg/m³
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {risk.level === 'high' || risk.level === 'critical' ? (
        <motion.div
          className="mt-6 p-4 rounded-xl bg-air-dangerous/10 border border-air-dangerous/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-air-dangerous animate-pulse" />
            <div>
              <p className="font-medium text-air-dangerous">Attenzione: Rischio Elevato</p>
              <p className="text-sm text-muted-foreground">
                Esposizione prolungata può causare effetti neurologici. Consigliato ridurre l'esposizione.
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
};

export default NeuroHealthSection;
