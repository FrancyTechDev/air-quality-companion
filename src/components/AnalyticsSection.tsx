import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, Clock, Download } from 'lucide-react';
import { SensorData, getAirQualityInfo } from '@/lib/airQuality';
import { format } from 'date-fns';

interface AnalyticsSectionProps {
  history: SensorData[];
  currentData: SensorData;
}

const AnalyticsSection = ({ history, currentData }: AnalyticsSectionProps) => {
  // 1. Calcolo dati per i grafici con formattazione oraria sicura
  const chartData = useMemo(() => {
    return history.slice(-30).map((d, i) => {
      // Assicura che il timestamp sia un oggetto Date valido per il fuso orario locale
      const dateObj = new Date(d.timestamp);
      return {
        time: format(dateObj, 'HH:mm'), // Formato ore:minuti per il grafico
        fullDate: dateObj, // Manteniamo l'oggetto completo se servisse
        pm25: d.pm25,
        pm10: d.pm10,
        index: i
      };
    });
  }, [history]);

  // 2. Calcolo medie
  const averages = useMemo(() => {
    if (history.length === 0) return { pm25: 0, pm10: 0 };
    const sum = history.reduce(
      (acc, d) => ({ pm25: acc.pm25 + d.pm25, pm10: acc.pm10 + d.pm10 }),
      { pm25: 0, pm10: 0 }
    );
    return {
      pm25: Math.round(sum.pm25 / history.length * 10) / 10,
      pm10: Math.round(sum.pm10 / history.length * 10) / 10
    };
  }, [history]);

  // 3. Funzione per scaricare i dati CSV
  const handleDownload = () => {
    if (!history || history.length === 0) return;

    // Intestazioni CSV
    const headers = ['Data', 'Ora', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)'];
    
    // Righe CSV
    const rows = history.map(d => {
      const date = new Date(d.timestamp);
      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm:ss'),
        d.pm25,
        d.pm10
      ].join(',');
    });

    // Unione contenuto
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Creazione Blob e Link per il download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `air_quality_history_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const airQuality = getAirQualityInfo(currentData.pm25);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header con pulsante Download */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gradient">Analytics Dashboard</h2>
            <p className="text-sm text-muted-foreground">Analisi storica della qualità dell'aria</p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg hover:bg-secondary/20 border-border bg-card/50 text-foreground"
          title="Scarica storico dati"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-4 glass-panel">
          <p className="mb-1 text-xs text-muted-foreground">PM2.5 Attuale</p>
          <p className="text-2xl font-bold" style={{ color: airQuality.color }}>
            {currentData.pm25}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">µg/m³</p>
        </div>
        <div className="p-4 glass-panel">
          <p className="mb-1 text-xs text-muted-foreground">PM10 Attuale</p>
          <p className="text-2xl font-bold text-secondary">
            {currentData.pm10}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">µg/m³</p>
        </div>
        <div className="p-4 glass-panel">
          <p className="mb-1 text-xs text-muted-foreground">Media PM2.5</p>
          <p className="text-2xl font-bold text-foreground">
            {averages.pm25}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">µg/m³</p>
        </div>
        <div className="p-4 glass-panel">
          <p className="mb-1 text-xs text-muted-foreground">Media PM10</p>
          <p className="text-2xl font-bold text-foreground">
            {averages.pm10}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">µg/m³</p>
        </div>
      </div>

      {/* Real-time Chart */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">PM2.5 Real-time</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Ultimi 30 punti</span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(190, 95%, 50%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(190, 95%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="pm25"
              stroke="hsl(190, 95%, 50%)"
              strokeWidth={2}
              fill="url(#pm25Gradient)"
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison Chart */}
      <div className="chart-container">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold">Confronto PM2.5 vs PM10</h3>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="pm25"
              name="PM2.5"
              stroke="hsl(190, 95%, 50%)"
              strokeWidth={2}
              dot={false}
              animationDuration={500}
            />
            <Line
              type="monotone"
              dataKey="pm10"
              name="PM10"
              stroke="hsl(260, 60%, 55%)"
              strokeWidth={2}
              dot={false}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default AnalyticsSection;