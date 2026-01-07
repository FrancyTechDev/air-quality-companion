import { useState, useEffect } from "react";
import { SensorData } from "@/lib/airQuality";

export const useSensorData = () => {
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch iniziale + aggiornamenti ogni 5 secondi
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("https://air-quality-companion.onrender.com/data");
        if (!res.ok) throw new Error("Errore fetch dati");
        const data: any[] = await res.json();

        if (data.length > 0) {
          const latest = data[data.length - 1];
          const formatted: SensorData = {
            pm25: latest.pm25,
            pm10: latest.pm10,
            timestamp: new Date(latest.timestamp),
            lat: latest.lat,
            lng: latest.lon,
          };
          setCurrentData(formatted);
          setHistory(data.map(d => ({
            pm25: d.pm25,
            pm10: d.pm10,
            timestamp: new Date(d.timestamp),
            lat: d.lat,
            lng: d.lon,
          })));
          setIsConnected(true);
        }
      } catch (err) {
        console.error("Errore fetch dati:", err);
        setIsConnected(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  return { currentData, history, isConnected };
};
