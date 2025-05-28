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

  const activeSessions = (sessions as any)?.filter((s: any) => s.status === 'connected').length || 0;
  const totalSessions = (sessions as any)?.length || 0;

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
        "fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-xl",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 whatsapp-gradient rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-smooth">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp Pro</h1>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Sistema Avançado</p>
              </div>
            </div>
          </div>

          {/* Session Status */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="whatsapp-gradient-soft dark:bg-gray-800 border border-green-200 dark:border-green-600 rounded-xl p-4 transition-smooth">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeSessions || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Sessões Ativas</p>
                </div>
                <div className="w-4 h-4 bg-emerald-400 rounded-full pulse-green shadow-lg"></div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {totalSessions || 0} total configuradas
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
                    "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-smooth relative overflow-hidden",
                    isActive
                      ? "whatsapp-gradient text-white shadow-lg scale-105"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  )}
                  onClick={onClose}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0 transition-smooth",
                      isActive ? "text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-green-600"
                    )}
                  />
                  {item.name}
                  {item.name === "Mensagens" && (stats as any)?.messages?.pending > 0 && (
                    <Badge variant="secondary" className="ml-auto bg-green-600 text-white text-xs">
                      {(stats as any).messages.pending}
                    </Badge>
                  )}
                  {item.name === "Respostas Automáticas" && (
                    <div className="ml-auto w-2 h-2 bg-green-400 rounded-full pulse-green"></div>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User profile */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 whatsapp-gradient rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-smooth">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Admin WhatsApp</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-xs text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
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
