import { useState, useEffect, useCallback, useRef } from 'react';
import { SensorData } from '@/lib/airQuality';

// Simulated sensor data hook - in production, replace with WebSocket connection
export const useSensorData = () => {
  const [currentData, setCurrentData] = useState<SensorData>({
    pm25: 18,
    pm10: 25,
    timestamp: new Date(),
    lat: 45.4642,
    lng: 9.1900
  });
  
  const [history, setHistory] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  
  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newPm25 = Math.max(5, Math.min(80, currentData.pm25 + (Math.random() - 0.5) * 10));
      const newPm10 = Math.max(10, Math.min(120, newPm25 * 1.3 + (Math.random() - 0.5) * 15));
      
      // Simulate slight GPS movement
      const newLat = currentData.lat! + (Math.random() - 0.5) * 0.0005;
      const newLng = currentData.lng! + (Math.random() - 0.5) * 0.0005;
      
      const newData: SensorData = {
        pm25: Math.round(newPm25 * 10) / 10,
        pm10: Math.round(newPm10 * 10) / 10,
        timestamp: new Date(),
        lat: newLat,
        lng: newLng
      };
      
      setCurrentData(newData);
      setHistory(prev => {
        const updated = [...prev, newData];
        // Keep last 500 values
        return updated.slice(-500);
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [currentData]);
  
  // Initialize with some history
  useEffect(() => {
    const initialHistory: SensorData[] = [];
    const now = Date.now();
    
    for (let i = 60; i >= 0; i--) {
      const pm25 = 15 + Math.random() * 30;
      initialHistory.push({
        pm25: Math.round(pm25 * 10) / 10,
        pm10: Math.round((pm25 * 1.3 + Math.random() * 10) * 10) / 10,
        timestamp: new Date(now - i * 60000),
        lat: 45.4642 + (Math.random() - 0.5) * 0.01,
        lng: 9.1900 + (Math.random() - 0.5) * 0.01
      });
    }
    
    setHistory(initialHistory);
  }, []);
  
  return { currentData, history, isConnected };
};

// GPS tracking hook
export const useGPSTracking = () => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalizzazione non supportata');
      return;
    }
    
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setError(null);
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
  }, []);
  
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
