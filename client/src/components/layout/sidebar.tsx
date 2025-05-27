import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3Icon, 
  SmartphoneIcon, 
  SendIcon, 
  ClockIcon, 
  BellRing, 
  UsersIcon, 
  CakeIcon, 
  FileTextIcon, 
  ListIcon,
  UserIcon,
  LogOutIcon
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3Icon },
  { name: "Sessões", href: "/sessions", icon: SmartphoneIcon },
  { name: "Envio de Mensagens", href: "/messages", icon: SendIcon },
  { name: "Agendamentos", href: "/schedules", icon: ClockIcon },
  { name: "Campanhas", href: "/campaigns", icon: BellRing },
  { name: "Grupos", href: "/groups", icon: UsersIcon },
  { name: "Aniversários", href: "/birthdays", icon: CakeIcon },
  { name: "Relatórios", href: "/reports", icon: FileTextIcon },
  { name: "Logs", href: "/logs", icon: ListIcon },
];

export function Sidebar() {
  const [location] = useLocation();

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const activeSessions = sessions?.filter((s: any) => s.isActive) || [];
  const totalSessions = sessions?.length || 0;

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r border-gray-200">
        {/* Logo and Brand */}
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-whatsapp-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.403"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">WhatsApp Manager</h1>
              <p className="text-xs text-gray-500">Sistema Avançado</p>
            </div>
          </div>
        </div>

        {/* Session Status Card */}
        <div className="mt-6 mx-4 p-3 bg-whatsapp-50 rounded-lg border border-whatsapp-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{activeSessions.length}</p>
              <p className="text-xs text-gray-500">Sessões Ativas</p>
            </div>
            <div className={cn(
              "w-2 h-2 rounded-full",
              activeSessions.length > 0 ? "bg-green-400 animate-pulse" : "bg-gray-300"
            )} />
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {totalSessions} total configuradas
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-whatsapp-100 text-whatsapp-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}>
                  <item.icon className={cn(
                    "mr-3 flex-shrink-0 h-4 w-4",
                    isActive ? "text-whatsapp-500" : "text-gray-400"
                  )} />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Settings and User Profile */}
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-gray-600" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-700">Admin</p>
              <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
                <LogOutIcon className="h-3 w-3 mr-1" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
