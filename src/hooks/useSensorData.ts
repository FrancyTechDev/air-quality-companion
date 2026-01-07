import { useState, useEffect } from 'react';
import { SensorData } from '@/lib/airQuality';

const SERVER_URL = 'https://air-quality-companion.onrender.com/data';

export const useSensorData = () => {
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch dati dal backend ogni 5 secondi
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const res = await fetch(SERVER_URL);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();

        // Prendi l'ultimo elemento come currentData
        const lastEntry = data[data.length - 1];

        if (lastEntry) {
          const newData: SensorData = {
            pm25: lastEntry.pm25,
            pm10: lastEntry.pm10,
            timestamp: new Date(lastEntry.timestamp),
            lat: lastEntry.lat,
            lng: lastEntry.lon,
          };

          setCurrentData(newData);

          setHistory(prev => {
            const updated = [...prev, newData];
            return updated.slice(-500); // tieni ultimi 500 valori
          });

          setIsConnected(true);
        }
      } catch (err) {
        console.error('Errore fetch dati:', err);
        setIsConnected(false);
      }
    };

    fetchData();
    interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

  return { currentData, history, isConnected };
};
