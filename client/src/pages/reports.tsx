import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Smartphone,
  Megaphone,
  Filter,
  RefreshCw
} from "lucide-react";

interface ChartData {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
}

interface SessionStats {
  sessionId: number;
  sessionName: string;
  totalMessages: number;
  successRate: number;
  isConnected: boolean;
}

interface CampaignStats {
  id: number;
  name: string;
  type: string;
  status: string;
  targetCount: number;
  sentCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
}

export default function Reports() {
  const [dateRange, setDateRange] = useState("7d");
  const [selectedSession, setSelectedSession] = useState("");
  const { toast } = useToast();

  const { data: overallStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/reports/overview", dateRange],
    queryFn: () => fetch(`/api/reports/overview?range=${dateRange}`, { credentials: 'include' }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["/api/reports/chart", dateRange, selectedSession],
    queryFn: () => {
      const params = new URLSearchParams({ range: dateRange });
      if (selectedSession) params.append('sessionId', selectedSession);
      return fetch(`/api/reports/chart?${params}`, { credentials: 'include' }).then(r => r.json());
    },
    refetchInterval: 30000,
  });

  const { data: sessionStats } = useQuery({
    queryKey: ["/api/reports/sessions", dateRange],
    queryFn: () => fetch(`/api/reports/sessions?range=${dateRange}`, { credentials: 'include' }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: campaignStats } = useQuery({
    queryKey: ["/api/reports/campaigns", dateRange],
    queryFn: () => fetch(`/api/reports/campaigns?range=${dateRange}`, { credentials: 'include' }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const handleExport = async (type: 'pdf' | 'csv') => {
    try {
      const params = new URLSearchParams({ 
        range: dateRange,
        format: type
      });
      if (selectedSession) params.append('sessionId', selectedSession);
      
      const response = await fetch(`/api/reports/export?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to export report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-report-${dateRange}.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Relatório exportado",
        description: `Relatório ${type.toUpperCase()} baixado com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Falha ao exportar relatório",
        variant: "destructive",
      });
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Concluída</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const dateRangeOptions = [
    { value: '1d', label: 'Últimas 24h' },
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
  ];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios e Analytics</h1>
            <p className="text-gray-600">Acompanhe o desempenho das suas mensagens e campanhas</p>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleExport('csv')}
              disabled={statsLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleExport('pdf')}
              disabled={statsLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as sessões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as sessões</SelectItem>
              {sessions?.map((session: any) => (
                <SelectItem key={session.id} value={session.id.toString()}>
                  {session.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Enviadas</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {overallStats ? formatNumber(overallStats.totalSent) : '0'}
                    </dd>
                  </dl>
                </div>
              </div>
              {overallStats?.sentGrowth !== undefined && (
                <div className="mt-3 flex items-center text-sm">
                  {overallStats.sentGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={overallStats.sentGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercent(Math.abs(overallStats.sentGrowth))}
                  </span>
                  <span className="text-gray-500 ml-1">vs período anterior</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Taxa de Sucesso</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {overallStats ? formatPercent(overallStats.successRate) : '0%'}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${overallStats?.successRate || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Falhas</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {overallStats ? formatNumber(overallStats.totalFailed) : '0'}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                {overallStats ? formatPercent(overallStats.failureRate) : '0%'} do total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pendentes</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {overallStats ? formatNumber(overallStats.pending) : '0'}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                Na fila de envio
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gráfico de Performance</CardTitle>
                <CardDescription>
                  Mensagens enviadas, entregues e falhadas ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : chartData && chartData.length > 0 ? (
                  <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">Gráfico de Performance</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {chartData.length} pontos de dados disponíveis
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">Nenhum dado disponível</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Dados aparecerão após o envio de mensagens
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Média Diária</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {overallStats ? formatNumber(Math.round(overallStats.dailyAverage)) : '0'}
                  </div>
                  <p className="text-sm text-gray-600">mensagens por dia</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pico de Envio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {overallStats ? formatNumber(overallStats.peakDay) : '0'}
                  </div>
                  <p className="text-sm text-gray-600">maior volume em um dia</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Tempo Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {overallStats ? `${overallStats.avgDeliveryTime}s` : '0s'}
                  </div>
                  <p className="text-sm text-gray-600">para entrega</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Sessão</CardTitle>
                <CardDescription>
                  Estatísticas detalhadas de cada sessão WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionStats && sessionStats.length > 0 ? (
                  <div className="space-y-4">
                    {sessionStats.map((session: SessionStats) => (
                      <div 
                        key={session.sessionId}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{session.sessionName}</h3>
                            <p className="text-sm text-gray-500">
                              {formatNumber(session.totalMessages)} mensagens enviadas
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className={`text-sm font-medium ${getSuccessRateColor(session.successRate)}`}>
                              {formatPercent(session.successRate)}
                            </p>
                            <p className="text-xs text-gray-500">taxa de sucesso</p>
                          </div>
                          
                          <Badge 
                            className={session.isConnected ? 
                              "bg-green-100 text-green-800" : 
                              "bg-red-100 text-red-800"
                            }
                          >
                            {session.isConnected ? 'Conectada' : 'Desconectada'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma sessão encontrada
                    </h3>
                    <p className="text-gray-500">
                      Configure sessões WhatsApp para ver as estatísticas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance de Campanhas</CardTitle>
                <CardDescription>
                  Resultados detalhados das suas campanhas de marketing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaignStats && campaignStats.length > 0 ? (
                  <div className="space-y-4">
                    {campaignStats.map((campaign: CampaignStats) => (
                      <div 
                        key={campaign.id}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Megaphone className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">{campaign.name}</h3>
                              <p className="text-xs text-gray-500 capitalize">{campaign.type}</p>
                            </div>
                          </div>
                          {getStatusBadge(campaign.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Alvo</p>
                            <p className="text-sm font-medium">{formatNumber(campaign.targetCount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Enviadas</p>
                            <p className="text-sm font-medium">{formatNumber(campaign.sentCount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Sucesso</p>
                            <p className="text-sm font-medium text-green-600">{formatNumber(campaign.successCount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Taxa</p>
                            <p className={`text-sm font-medium ${getSuccessRateColor(campaign.successRate)}`}>
                              {formatPercent(campaign.successRate)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${campaign.targetCount > 0 ? (campaign.sentCount / campaign.targetCount) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma campanha encontrada
                    </h3>
                    <p className="text-gray-500">
                      Crie campanhas para ver as estatísticas de performance
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
