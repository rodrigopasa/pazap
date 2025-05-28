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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="modern-card modern-card-dark">
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
      title: "Sessões Ativas",
      value: (stats as any)?.sessions?.active || 0,
      total: (stats as any)?.sessions?.total || 0,
      icon: MessageSquare,
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      gradient: "pazap-gradient-soft",
      description: `${(stats as any)?.sessions?.total || 0} total configuradas`
    },
    {
      title: "Mensagens Enviadas",
      value: (stats as any)?.messages?.sent || 0,
      icon: CheckCircle,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      gradient: "bg-gradient-to-br from-blue-50 to-blue-100",
      description: `${(stats as any)?.messages?.total || 0} total processadas`
    },
    {
      title: "Campanhas Ativas",
      value: (stats as any)?.campaigns?.active || 0,
      icon: Megaphone,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50",
      gradient: "bg-gradient-to-br from-purple-50 to-purple-100",
      description: "Campanhas em execução"
    },
    {
      title: "Pendentes",
      value: (stats as any)?.messages?.pending || 0,
      icon: Clock,
      iconColor: "text-orange-600",
      bgColor: "bg-orange-50",
      gradient: "bg-gradient-to-br from-orange-50 to-orange-100",
      description: `${(stats as any)?.messages?.failed || 0} falharam`
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="modern-card modern-card-dark group hover:scale-105 transition-smooth overflow-hidden">
          <CardContent className="p-6 relative">
            <div className={`absolute inset-0 ${card.gradient} opacity-30`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-smooth`}>
                  <card.icon className={`${card.iconColor} h-6 w-6`} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {card.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
