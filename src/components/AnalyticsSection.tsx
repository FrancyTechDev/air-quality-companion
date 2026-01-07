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
import { format, isValid } from 'date-fns';
import { it } from 'date-fns/locale';

interface AnalyticsSectionProps {
  history: SensorData[];
  currentData: SensorData;
}

const AnalyticsSection = ({ history, currentData }: AnalyticsSectionProps) => {
  
  // Funzione helper per gestire timestamp sia in secondi che in millisecondi
  const parseDate = (ts: string | number) => {
    if (!ts) return new Date();
    
    // Se è già un oggetto Date (caso raro ma possibile se i dati sono pre-processati)
    if (ts instanceof Date) return ts;

    // Se è un numero
    if (typeof ts === 'number') {
      // Se il numero è "piccolo" (es. < 100 miliardi), è probabile che siano SECONDI (Unix timestamp)
      // I millisecondi attuali sono circa 1.7 trilioni (13 cifre)
      if (ts < 100000000000) { 
        return new Date(ts * 1000);
      }
      return new Date(ts);
    }

    // Se è una stringa ISO, Date la gestisce
    return new Date(ts);
  };

  const chartData = useMemo(() => {
    return history.slice(-30).map((d, i) => {
      const dateObj = parseDate(d.timestamp);
      
      // Fallback se la data non è valida
      if (!isValid(dateObj)) {
        return {
          time: 'Err',
          fullDate: 'Data non valida',
          pm25: d.pm25,
          pm10: d.pm10,
          index: i
        };
      }

      return {
        time: dateObj.getTime(),
        fullDate: format(dateObj, "d MMM yyyy, HH:mm:ss", { locale: it }),
        pm25: d.pm25,
        pm10: d.pm10,
        index: i
      };
    });
  }, [history]);

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

  const handleDownload = () => {
    if (!history || history.length === 0) return;

    const headers = ['Data', 'Ora', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)'];
    
    const rows = history.map(d => {
      const date = parseDate(d.timestamp);
      if (!isValid(date)) return ['Data Errata', '-', d.pm25, d.pm10].join(',');

      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm:ss'),
        d.pm25,
        d.pm10
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `air_quality_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const airQuality = getAirQualityInfo(currentData.pm25);

  // Custom Tooltip per mostrare la data completa
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 border rounded-xl bg-card border-border shadow-xl">
          <p className="mb-2 text-sm font-medium text-foreground">
            {payload[0].payload.fullDate}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value}</span> µg/m³
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
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
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

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
              type="number"
              scale="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickMargin={10}
                tickFormatter={(timestamp) =>
                  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
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
            <Tooltip content={<CustomTooltip />} />
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