import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Radio } from 'lucide-react';
import { SensorData, getMarkerColor, getAirQualityInfo } from '@/lib/airQuality';

interface MapSectionProps {
  currentData: SensorData;
  history: SensorData[];
  isConnected: boolean;
}

const MapSection = ({ currentData, history, isConnected }: MapSectionProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const airQuality = getAirQualityInfo(currentData.pm25);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current, {
      center: [currentData.lat || 45.4642, currentData.lng || 9.19],
      zoom: 15,
      zoomControl: false
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(mapRef.current);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker and path
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const lat = currentData.lat || 45.4642;
    const lng = currentData.lng || 9.19;
    const color = getMarkerColor(currentData.pm25);

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setStyle({ color, fillColor: color });
    } else {
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 12,
        fillColor: color,
        color: color,
        weight: 3,
        opacity: 1,
        fillOpacity: 0.6
      }).addTo(mapRef.current);

      // Add pulsing effect
      const pulseMarker = L.circleMarker([lat, lng], {
        radius: 20,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.3,
        fillOpacity: 0.1
      }).addTo(mapRef.current);

      // Animate pulse
      let growing = true;
      setInterval(() => {
        const currentRadius = pulseMarker.getRadius();
        if (growing) {
          pulseMarker.setRadius(currentRadius + 0.5);
          if (currentRadius >= 30) growing = false;
        } else {
          pulseMarker.setRadius(currentRadius - 0.5);
          if (currentRadius <= 15) growing = true;
        }
      }, 50);
    }

    // Update path
    const pathCoords = history
      .filter(d => d.lat && d.lng)
      .map(d => [d.lat!, d.lng!] as [number, number]);

    if (pathCoords.length > 1) {
      if (pathRef.current) {
        pathRef.current.setLatLngs(pathCoords);
      } else {
        pathRef.current = L.polyline(pathCoords, {
          color: 'hsl(190, 95%, 50%)',
          weight: 3,
          opacity: 0.7,
          smoothFactor: 1
        }).addTo(mapRef.current);
      }
    }

    // Pan to current position
    mapRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
  }, [currentData, history, mapReady]);

  return (
    <motion.div
      className="map-container"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Mappa Live</h2>
            <p className="text-sm text-muted-foreground">Tracciamento in tempo reale</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="w-4 h-4 text-air-excellent" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-air-excellent rounded-full animate-ping" />
            </div>
            <span className="text-sm font-medium text-air-excellent">LIVE</span>
          </div>
          
          {/* Air quality badge */}
          <span className={airQuality.badgeClass}>
            {airQuality.label}
          </span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="h-[400px] lg:h-[500px]" />

      {/* Footer stats */}
      <div className="p-4 border-t border-border grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Latitudine</p>
          <p className="font-mono text-sm">{currentData.lat?.toFixed(4) || '--'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Longitudine</p>
          <p className="font-mono text-sm">{currentData.lng?.toFixed(4) || '--'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Punti Tracciati</p>
          <p className="font-mono text-sm">{history.length}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default MapSection;
