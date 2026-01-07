import { useState, useEffect, useCallback, useRef } from 'react';
import { SensorData } from '@/lib/airQuality';
import { toDate } from '../utils/dateUtils';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = "https://air-quality-companion.onrender.com"; 

export const useSensorData = () => {
  const [currentData, setCurrentData] = useState<SensorData>({
    pm25: 0,
    pm10: 0,
    timestamp: new Date(),
    lat: 45.4642,
    lng: 9.1900
  });
  
  const [history, setHistory] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/data`);
        if (!response.ok) throw new Error('Errore fetch storico');
        const data = await response.json();
        
        const formattedHistory: SensorData[] = data.map((item: any) => ({
          pm25: Number(item.pm25),
          pm10: Number(item.pm10),
          lat: Number(item.lat),
          lng: Number(item.lon), 
          timestamp: toDate(item.timestamp)
        }));

        setHistory(formattedHistory);
        if (formattedHistory.length > 0) {
          setCurrentData(formattedHistory[formattedHistory.length - 1]);
        }
      } catch (error) {
        console.error("Impossibile caricare lo storico:", error);
      }
    };
    fetchHistory();
  }, []);
  
  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('new-data', (payload: any) => {
      const newData: SensorData = {
        pm25: Number(payload.pm25),
        pm10: Number(payload.pm10),
        lat: Number(payload.lat),
        lng: Number(payload.lon), 
        timestamp: toDate(payload.timestamp)
      };

      setCurrentData(newData);
      setHistory(prev => [...prev, newData].slice(-500));
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  // Esportiamo il socketRef così useGPSTracking può usarlo se necessario, 
  // o lo gestiamo globalmente. In questo caso, usiamo una connessione socket condivisa.
  return { currentData, history, isConnected, socket: socketRef.current };
};

// --- GPS TRACKING HOOK AGGIORNATO ---
export const useGPSTracking = (socket: Socket | null) => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastEmitRef = useRef<number>(0);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalizzazione non supportata');
      return;
    }
    
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        
        setPosition(coords);
        setError(null);

        // --- INVIO DATI AL SERVER ---
        // Throttling: inviamo la posizione al server solo ogni 3 secondi per non sovraccaricare
        const now = Date.now();
        if (socket && socket.connected && now - lastEmitRef.current > 3000) {
          // Inviamo un evento 'update-gps'. 
          // NOTA: Il tuo backend deve essere istruito a ricevere questo evento 
          // e fare il broadcast di 'new-data' o un evento dedicato.
          socket.emit('update-location', {
            lat: coords.lat,
            lon: coords.lng, // il backend usa 'lon'
            timestamp: new Date().toISOString()
          });
          lastEmitRef.current = now;
        }
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [socket]); // socket come dipendenza
  
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);
  
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);
  
  return { position, error, isTracking, startTracking, stopTracking };
};