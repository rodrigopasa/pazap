import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionCardProps {
  session: {
    id: number;
    name: string;
    phone?: string;
    status: string;
    isActive: boolean;
  };
}

export function SessionCard({ session }: SessionCardProps) {
  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return "bg-red-400";
    switch (status) {
      case "connected":
        return "bg-green-400 animate-pulse";
      case "connecting":
        return "bg-yellow-400 animate-pulse";
      case "qr_needed":
        return "bg-blue-400 animate-pulse";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: string, isActive: boolean) => {
    if (!isActive) return "Desconectada";
    switch (status) {
      case "connected":
        return "Conectada";
      case "connecting":
        return "Conectando";
      case "qr_needed":
        return "QR Necessário";
      default:
        return "Desconectada";
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
      <div className="flex items-center">
        <div className={cn(
          "w-3 h-3 rounded-full mr-3",
          getStatusColor(session.status, session.isActive)
        )} />
        <div>
          <p className="text-sm font-medium text-gray-900">{session.name}</p>
          <p className="text-xs text-gray-500">
            {session.phone || getStatusText(session.status, session.isActive)}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-whatsapp-600 hover:text-whatsapp-700">
        <SettingsIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
