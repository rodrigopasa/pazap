import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  PlusIcon, 
  UploadIcon, 
  UsersIcon, 
  CalendarPlusIcon,
  ChevronRightIcon 
} from "lucide-react";

interface QuickActionsProps {
  onQuickSend: () => void;
}

export function QuickActions({ onQuickSend }: QuickActionsProps) {
  const actions = [
    {
      title: "Nova Mensagem",
      description: "Envio individual ou em massa",
      icon: PlusIcon,
      iconBg: "bg-whatsapp-100",
      iconColor: "text-whatsapp-600",
      onClick: onQuickSend,
    },
    {
      title: "Upload CSV",
      description: "Importar lista de contatos",
      icon: UploadIcon,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      href: "/messages",
    },
    {
      title: "Criar Grupo",
      description: "Novo grupo WhatsApp",
      icon: UsersIcon,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      href: "/groups",
    },
    {
      title: "Agendar Campanha",
      description: "Programa envio futuro",
      icon: CalendarPlusIcon,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      href: "/campaigns",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const ActionButton = (
            <button 
              className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              onClick={action.onClick}
            >
              <div className="flex items-center">
                <div className={`w-8 h-8 ${action.iconBg} rounded-lg flex items-center justify-center mr-3`}>
                  <action.icon className={`${action.iconColor} h-4 w-4`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{action.title}</p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
            </button>
          );

          if (action.href) {
            return (
              <Link key={index} href={action.href}>
                <a className="block">
                  {ActionButton}
                </a>
              </Link>
            );
          }

          return (
            <div key={index}>
              {ActionButton}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
