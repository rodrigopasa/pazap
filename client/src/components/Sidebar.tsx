import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  MessageSquare,
  Clock,
  Megaphone,
  Users,
  Cake,
  FileText,
  Activity,
  Smartphone,
  Settings,
  LogOut,
  Bell,
  Shield,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Sessões", href: "/sessions", icon: Smartphone },
  { name: "Mensagens", href: "/messages", icon: MessageSquare },
  { name: "Respostas Automáticas", href: "/auto-replies", icon: Bot },
  { name: "Agendamentos", href: "/schedules", icon: Clock },
  { name: "Controle de Envio", href: "/rate-limit", icon: Shield },
  { name: "Notificações", href: "/notifications", icon: Bell },
  { name: "Campanhas", href: "/campaigns", icon: Megaphone },
  { name: "Grupos", href: "/groups", icon: Users },
  { name: "Aniversários", href: "/birthdays", icon: Cake },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const activeSessions = sessions?.filter((s: any) => s.status === 'connected').length || 0;
  const totalSessions = sessions?.length || 0;

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div 
          className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-sidebar-background border-r border-sidebar-border transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 pazap-gradient rounded-xl flex items-center justify-center shadow-lg pulse-orange">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">PaZap</h1>
                <p className="text-xs text-sidebar-foreground/70">Sistema Avançado</p>
              </div>
            </div>
          </div>

          {/* Session Status */}
          <div className="p-4 border-b border-gray-200">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{activeSessions}</p>
                  <p className="text-xs text-gray-500">Sessões Ativas</p>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {totalSessions} total configuradas
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={onClose}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-4 w-4 flex-shrink-0",
                      isActive ? "text-green-500" : "text-gray-400"
                    )}
                  />
                  {item.name}
                  {item.name === "Mensagens" && (stats as any)?.messages?.pending > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {(stats as any).messages.pending}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User profile */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <Settings className="h-4 w-4 text-gray-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">Admin</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
