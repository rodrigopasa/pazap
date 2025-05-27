import { Card, CardContent } from "@/components/ui/card";
import { TrendingUpIcon, CheckCircleIcon, BellRing, ClockIcon } from "lucide-react";

interface StatsGridProps {
  stats?: {
    messagesTotal: number;
    messagesToday: number;
    successRate: number;
    activeCampaigns: number;
    queueLength: number;
    activeSessions: number;
  };
  isLoading: boolean;
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="animate-pulse">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg mr-5"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="mt-3 h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: "Mensagens Hoje",
      value: stats?.messagesToday?.toLocaleString() || "0",
      icon: TrendingUpIcon,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      trend: "+12%",
      trendText: "vs ontem",
      trendPositive: true,
    },
    {
      title: "Taxa de Sucesso",
      value: `${stats?.successRate || 0}%`,
      icon: CheckCircleIcon,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      showProgress: true,
      progressValue: stats?.successRate || 0,
    },
    {
      title: "Campanhas Ativas",
      value: stats?.activeCampaigns?.toString() || "0",
      icon: BellRing,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      subtitle: "3 agendadas",
    },
    {
      title: "Na Fila",
      value: stats?.queueLength?.toString() || "0",
      icon: ClockIcon,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      subtitle: "~45 min restantes",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((card, index) => (
        <Card key={index} className="overflow-hidden shadow-sm border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <card.icon className={`${card.iconColor} h-4 w-4`} />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                  <dd className="text-lg font-semibold text-gray-900">{card.value}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              {card.showProgress && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(card.progressValue, 100)}%` }}
                  ></div>
                </div>
              )}
              {card.trend && (
                <div className="flex items-center text-sm">
                  <span className={card.trendPositive ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {card.trend}
                  </span>
                  <span className="text-gray-500 ml-1">{card.trendText}</span>
                </div>
              )}
              {card.subtitle && (
                <div className="flex items-center text-sm">
                  <span className="text-blue-600 font-medium">{card.subtitle}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
