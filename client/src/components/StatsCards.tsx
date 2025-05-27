import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, CheckCircle, Megaphone, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Mensagens Hoje",
      value: stats?.messages?.messagesToday || 0,
      icon: MessageSquare,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      change: "+12%",
      changeText: "vs ontem"
    },
    {
      title: "Taxa de Sucesso",
      value: `${stats?.messages?.successRate || 0}%`,
      icon: CheckCircle,
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
      progress: stats?.messages?.successRate || 0
    },
    {
      title: "Campanhas Ativas",
      value: stats?.campaigns?.active || 0,
      icon: Megaphone,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-100",
      subtitle: "3 agendadas"
    },
    {
      title: "Na Fila",
      value: stats?.messages?.pending || 0,
      icon: Clock,
      iconColor: "text-orange-600",
      bgColor: "bg-orange-100",
      subtitle: "~45 min restantes"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <card.icon className={`${card.iconColor} text-sm h-4 w-4`} />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                  <dd className="text-lg font-semibold text-gray-900">{card.value.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              {card.change && (
                <div className="flex items-center text-sm">
                  <span className="text-green-600 font-medium flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {card.change}
                  </span>
                  <span className="text-gray-500 ml-1">{card.changeText}</span>
                </div>
              )}
              {card.progress !== undefined && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(card.progress, 100)}%` }}
                  />
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
