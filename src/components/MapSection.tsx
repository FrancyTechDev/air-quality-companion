import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Radio, Wind } from 'lucide-react';
import { SensorData, getMarkerColor, getAirQualityInfo } from '@/lib/airQuality';

// --- UTILS PER IL CALCOLO DELLA DISTANZA (Haversine Formula) ---
// Calcola la distanza in metri tra due coordinate in modo scientifico
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Raggio della Terra in metri
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2) ** 2;
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface MapSectionProps {
  currentData: SensorData;
  history: SensorData[];
  isConnected: boolean;
}

const MapSection = ({ currentData, history, isConnected }: MapSectionProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Refs per elementi persistenti standard
  const currentMarkerRef = useRef<L.CircleMarker | null>(null);
  const pulseMarkerRef = useRef<L.CircleMarker | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);

  // --- ARCHITETTURA PARTICLES ---
  // Non usiamo lo state per evitare re-render inutili.
  // Memorizziamo i marker attivi per pulirli all'unmount.
  const particlesRef = useRef<L.CircleMarker[]>([]);
  
  // Ref per logica di rilascio (Throttle spaziale/temporale)
  const lastDropTimeRef = useRef<number>(0);
  const lastDropPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const airQuality = getAirQualityInfo(currentData.pm25);

  // 1. Inizializzazione Mappa (Eseguito una sola volta)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Setup base della mappa
    mapRef.current = L.map(mapContainerRef.current, {
      center: [currentData.lat || 45.4642, currentData.lng || 9.19],
      zoom: 16, // Zoom leggermente più stretto per apprezzare i dettagli
      zoomControl: false,
      preferCanvas: true // Ottimizzazione performance rendering
    });

    // Dark tile layer professionale
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    setMapReady(true);

    // Cleanup all'unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      // Pulisci eventuali timeout o riferimenti residui
      particlesRef.current = [];
    };
  }, []);

  // 2. Gestione Aggiornamenti Dati (Marker Corrente + Logica Particles)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Coordinate attuali (con fallback se i dati sono sporchi all'avvio)
    const lat = currentData.lat || 45.4642;
    const lng = currentData.lng || 9.19;
    const color = getMarkerColor(currentData.pm25);

    // --- A. GESTIONE MARKER CORRENTE (PULSATING) ---
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([lat, lng]);
      currentMarkerRef.current.setStyle({ color, fillColor: color });
    } else {
      // Main Position Dot
      currentMarkerRef.current = L.circleMarker([lat, lng], {
        radius: 8, // Leggermente più piccolo, più preciso
        fillColor: color,
        color: '#ffffff', // Bordo bianco per contrasto sulla dark map
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).addTo(mapRef.current);

      // Pulse Effect Ring
      pulseMarkerRef.current = L.circleMarker([lat, lng], {
        radius: 15,
        fillColor: color,
        color: color,
        weight: 0,
        opacity: 0,
        fillOpacity: 0.2
      }).addTo(mapRef.current);
    }

    // Aggiorna posizione del pulse marker
    if (pulseMarkerRef.current) {
        pulseMarkerRef.current.setLatLng([lat, lng]);
        pulseMarkerRef.current.setStyle({ fillColor: color, color: color });
    }

    // --- B. LOGICA "PARTICLES" (CAMPIONAMENTO SPAZIO-TEMPORALE) ---
    const now = Date.now();
    const DROP_INTERVAL_MS = 5000; // Minimo 5 secondi tra i drop
    const MIN_DISTANCE_METERS = 5; // Minimo 5 metri di spostamento
    const PARTICLE_TTL_MS = 120000; // 2 Minuti di vita per ogni particella

    const shouldDropParticle = () => {
      // Se è il primo punto in assoluto
      if (!lastDropPosRef.current) return true;

      // 1. Controllo Tempo
      const timeElapsed = now - lastDropTimeRef.current;
      if (timeElapsed < DROP_INTERVAL_MS) return false;

      // 2. Controllo Distanza
      const dist = calculateDistanceMeters(
        lastDropPosRef.current.lat,
        lastDropPosRef.current.lng,
        lat,
        lng
      );
      
      return dist >= MIN_DISTANCE_METERS;
    };

    if (shouldDropParticle()) {
      // Creazione Particle
      const particle = L.circleMarker([lat, lng], {
        radius: 4, // Molto piccolo, discreto
        color: color,
        fillColor: color,
        weight: 0, // Nessun bordo
        fillOpacity: 0.6, // Semi-trasparente
        className: 'leaflet-particle-fade' // Hook per eventuale CSS
      }).addTo(mapRef.current);

      // Aggiungi ai riferimenti
      particlesRef.current.push(particle);
      
      // Aggiorna riferimenti logici
      lastDropTimeRef.current = now;
      lastDropPosRef.current = { lat, lng };

      // IMPOSTA IL DECADIMENTO (TTL)
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.removeLayer(particle);
          // Rimuoviamo anche dall'array ref per pulizia memoria (opzionale ma buona pratica)
          particlesRef.current = particlesRef.current.filter(p => p !== particle);
        }
      }, PARTICLE_TTL_MS);
    }

    // --- C. AGGIORNAMENTO PATH (STORICO) ---
    // Manteniamo la linea per continuità visiva, ma le particelle danno il dettaglio della qualità
    const pathCoords = history
      .filter(d => d.lat && d.lng)
      .map(d => [d.lat!, d.lng!] as [number, number]);

    if (pathCoords.length > 1) {
      if (pathRef.current) {
        pathRef.current.setLatLngs(pathCoords);
      } else {
        pathRef.current = L.polyline(pathCoords, {
          color: 'rgba(255, 255, 255, 0.2)', // Molto sottile e trasparente, focus sulle particelle
          weight: 2,
          dashArray: '4, 8', // Tratteggiata per sembrare "tecnica"
          opacity: 0.5,
          smoothFactor: 1
        }).addTo(mapRef.current);
      }
    }

    // Pan fluido alla posizione corrente
    mapRef.current.panTo([lat, lng], { animate: true, duration: 1.0 });

  }, [currentData, history, mapReady]);

  // Gestione animazione pulse separata (più leggera)
  useEffect(() => {
    if (!mapReady) return;
    
    let frameId: number;
    let start = performance.now();
    
    const animate = (time: number) => {
      const elapsed = time - start;
      const cycle = 2000; // 2 secondi per ciclo
      const progress = (elapsed % cycle) / cycle;
      
      if (pulseMarkerRef.current) {
        // Scala raggio da 8 a 25
        const currentRadius = 8 + (progress * 17);
        // Opacità da 0.4 a 0
        const currentOpacity = 0.4 * (1 - progress);
        
        pulseMarkerRef.current.setRadius(currentRadius);
        pulseMarkerRef.current.setStyle({ fillOpacity: currentOpacity });
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [mapReady]);

  return (
    <motion.div
      className="map-container bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header Tecnico */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Live Tracking</h2>
            <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground">
                    SAMPLES: {history.length}
                </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            isConnected 
              ? 'bg-green-500/10 border-green-500/20 text-green-500' 
              : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}>
            <Radio className={`w-3 h-3 ${isConnected ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-bold">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          
          {/* AQI Badge */}
          <div className={`px-3 py-1.5 rounded-full border ${airQuality.badgeClass} flex items-center gap-2`}>
            <Wind className="w-3 h-3" />
            <span className="text-xs font-bold">{airQuality.label}</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative group">
        <div ref={mapContainerRef} className="h-[400px] lg:h-[500px] w-full z-0" />
        
        {/* Overlay Dati Tecnici (HUD style) */}
        <div className="absolute bottom-4 left-4 right-4 z-[400] grid grid-cols-3 gap-2 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-lg text-center">
                <div className="text-[10px] text-gray-400 uppercase">Latitudine</div>
                <div className="font-mono text-xs text-white">{currentData.lat?.toFixed(5) || 'N/A'}</div>
            </div>
            <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-lg text-center">
                <div className="text-[10px] text-gray-400 uppercase">Longitudine</div>
                <div className="font-mono text-xs text-white">{currentData.lng?.toFixed(5) || 'N/A'}</div>
            </div>
            <div className="bg-black/80 backdrop-blur-md border border-white/10 p-2 rounded-lg text-center">
                <div className="text-[10px] text-gray-400 uppercase">Particelle</div>
                <div className="font-mono text-xs text-primary">{particlesRef.current.length} ACTV</div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MapSection;