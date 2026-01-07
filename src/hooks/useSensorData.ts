import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// CONFIGURAZIONE
const SERVER_URL = "https://air-quality-companion.onrender.com"; 
const GPS_EMIT_INTERVAL_MS = 3000; // Invia posizione max ogni 3 secondi

// Tipi dati
export interface SensorData {
  pm25: number;
  pm10: number;
  timestamp: Date;
  lat?: number; // Opzionale perché potrebbe arrivare dal GPS mobile
  lng?: number;
}

// --- HOOK PRINCIPALE: GESTIONE DATI & CONNESSIONE ---
export const useSensorData = () => {
  const [currentData, setCurrentData] = useState<SensorData>({
    pm25: 0,
    pm10: 0,
    timestamp: new Date(),
    lat: 45.4642, // Fallback Milano
    lng: 9.1900
  });
  
  const [history, setHistory] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Usiamo un ref per il socket per mantenerlo tra i render senza ricrearlo
  const socketRef = useRef<Socket | null>(null);

  // 1. Fetch dello storico iniziale (REST API)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/data`);
        if (!response.ok) throw new Error('Errore fetch storico');
        
        const data = await response.json();
        
        // Mapping e sanitizzazione dati
        const formattedHistory: SensorData[] = data.map((item: any) => ({
          pm25: Number(item.pm25),
          pm10: Number(item.pm10),
          lat: Number(item.lat || item.latitude),
          lng: Number(item.lon || item.longitude), 
          timestamp: new Date(item.timestamp)
        })).filter((d: SensorData) => !isNaN(d.pm25)); // Filtra dati corrotti

        setHistory(formattedHistory);
        
        // Imposta l'ultimo dato valido come corrente
        if (formattedHistory.length > 0) {
          setCurrentData(formattedHistory[formattedHistory.length - 1]);
        }
      } catch (error) {
        console.error("⚠️ Impossibile caricare lo storico:", error);
      }
    };

    fetchHistory();
  }, []);
  
  // 2. Connessione Socket.IO (Real-Time Receiver)
  useEffect(() => {
    // Inizializzazione Socket
    socketRef.current = io(SERVER_URL, {
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log("🟢 Socket connesso:", socketRef.current?.id);
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log("🔴 Socket disconnesso");
      setIsConnected(false);
    });

    // Ascolta 'new-data'. Questo evento ora viene emesso dal server 
    // SIA quando l'ESP32 manda dati, SIA quando il telefono manda GPS.
    socketRef.current.on('new-data', (payload: any) => {
      const newData: SensorData = {
        pm25: Number(payload.pm25),
        pm10: Number(payload.pm10),
        lat: Number(payload.lat || payload.latitude),
        lng: Number(payload.lon || payload.lng || payload.longitude), 
        timestamp: new Date(payload.timestamp || Date.now())
      };

      setCurrentData(newData);

      setHistory(prev => {
        const updated = [...prev, newData];
        return updated.slice(-500); // Mantieni storico leggero
      });
    });
    
    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  // Ritorniamo anche il socket così l'hook del GPS può usarlo per INVIARE dati
  return { currentData, history, isConnected, socket: socketRef.current };
};

// --- HOOK SECONDARIO: TRASMETTITORE GPS ---
// Accetta il socket e i dati attuali per poterli allegare alla posizione
export const useGPSTracking = (socket: Socket | null, currentPm25: number) => {
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
    console.log("🛰️ Avvio tracking GPS...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        
        // Aggiorna stato locale (per UI feedback sul telefono)
        setPosition(coords);
        setError(null);

        // --- LOGICA DI TRASMISSIONE (Phone -> Server) ---
        const now = Date.now();
        
        // Invia solo se: c'è un socket, è connesso, ed è passato abbastanza tempo
        if (socket && socket.connected && (now - lastEmitRef.current > GPS_EMIT_INTERVAL_MS)) {
          console.log("📡 Invio posizione al server...", coords);
          
          socket.emit('update-location', {
            lat: coords.lat,
            lon: coords.lng, // backend usa 'lon' solitamente
            pm25: currentPm25, // Allega la qualità dell'aria attuale alla posizione!
            timestamp: new Date().toISOString()
          });
          
          lastEmitRef.current = now;
        }
      },
      (err) => {
        console.error("⚠️ Errore GPS:", err.message);
        setError(err.message);
      },
      {
        enableHighAccuracy: true, // Fondamentale per vedere piccoli spostamenti
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [socket, currentPm25]); // Dipendenze
  
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    console.log("🛑 Tracking GPS fermato");
  }, []);
  
  // Cleanup automatico se il componente viene smontato
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);
  
  return { position, error, isTracking, startTracking, stopTracking };
};