import { useSensorData, useGPSTracking } from "@/hooks/useAirQuality"; // Assicurati del percorso corretto
import MapSection from "@/components/MapSection";
import { Button } from "@/components/ui/button"; // Se usi Shadcn
import { LocateFixed, LocateOff } from "lucide-react";

const Index = () => {
  // 1. Inizializza i dati e ottieni il riferimento al socket
  const { currentData, history, isConnected, socket } = useSensorData();

  // 2. Passa il socket al tracker GPS
  const { isTracking, startTracking, stopTracking } = useGPSTracking(socket, currentData.pm25);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Pulsante per attivare il GPS dal telefono */}
        <div className="flex justify-end">
          <Button 
            variant={isTracking ? "destructive" : "default"}
            onClick={isTracking ? stopTracking : startTracking}
            className="gap-2 shadow-lg"
          >
            {isTracking ? <LocateOff size={18} /> : <LocateFixed size={18} />}
            {isTracking ? "Spegni GPS Mobile" : "Attiva GPS Mobile"}
          </Button>
        </div>

        {/* Mappa */}
        <MapSection 
          currentData={currentData} 
          history={history} 
          isConnected={isConnected} 
        />

        {/* Altri componenti della dashboard... */}
      </div>
    </div>
  );
};

export default Index;