import { useQuery } from "@tanstack/react-query";
import StatsCards from "@/components/StatsCards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  CheckCircle,
  Upload,
  Users,
  CalendarPlus,
  Settings,
  FolderSync,
  Clock,
  Cake,
  Megaphone,
  Plus,
  ChevronRight,
  Activity,
  AlertCircle
} from "lucide-react";

export default function Dashboard() {
  const { isConnected } = useWebSocket();

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
    refetchInterval: 15000,
  });

  const { data: messages } = useQuery({
    queryKey: ["/api/messages"],
    refetchInterval: 10000,
  });

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
    refetchInterval: 20000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  // Get recent activity from messages
  const recentActivity = messages?.slice(0, 4) || [];
  
  // Get active sessions
  const activeSessions = sessions?.filter((s: any) => s.status === 'connected') || [];
  const allSessions = sessions || [];

  // Get real scheduled messages
  const { data: scheduledMessages } = useQuery({
    queryKey: ["/api/messages/scheduled"],
    refetchInterval: 15000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-400';
      case 'connecting': return 'bg-yellow-400';
      case 'qr_needed': return 'bg-blue-400';
      default: return 'bg-red-400';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'text': return CheckCircle;
      case 'image': return Upload;
      case 'document': return Upload;
      default: return CheckCircle;
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h atrás`;
    return `${Math.floor(diffInMinutes / 1440)} d atrás`;
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Conectado ao servidor' : 'Desconectado do servidor'}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Quick Actions Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-3"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <Plus className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Nova Mensagem</p>
                      <p className="text-xs text-gray-500">Envio individual ou em massa</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-3"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Upload className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Upload CSV</p>
                      <p className="text-xs text-gray-500">Importar lista de contatos</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-3"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Criar Grupo</p>
                      <p className="text-xs text-gray-500">Novo grupo WhatsApp</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-3"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <CalendarPlus className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Agendar Campanha</p>
                      <p className="text-xs text-gray-500">Programa envio futuro</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Button>
              </CardContent>
            </Card>

            {/* Session Status */}
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle>Status das Sessões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allSessions.length === 0 ? (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhuma sessão configurada</p>
                  </div>
                ) : (
                  allSessions.map((session: any) => (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className={`w-3 h-3 ${getStatusColor(session.status)} rounded-full mr-3 ${session.status === 'connected' ? 'animate-pulse' : ''}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{session.name}</p>
                          <p className="text-xs text-gray-500">
                            {session.phone || session.status === 'connected' ? session.phone : 'Desconectada'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {session.status === 'connected' ? (
                          <Settings className="h-4 w-4" />
                        ) : (
                          <FolderSync className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
                
                <Button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Sessão
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Atividade Recente</CardTitle>
                  <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                    Ver todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhuma atividade recente</p>
                    </div>
                  ) : (
                    recentActivity.map((message: any, index: number) => {
                      const Icon = getActivityIcon(message.type);
                      return (
                        <div key={message.id} className="relative">
                          {index < recentActivity.length - 1 && (
                            <span className="absolute top-8 left-4 -ml-px h-8 w-0.5 bg-gray-200" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                message.status === 'sent' ? 'bg-green-100' : 
                                message.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                              }`}>
                                <Icon className={`h-4 w-4 ${
                                  message.status === 'sent' ? 'text-green-600' : 
                                  message.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                                }`} />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900">
                                  {message.type === 'text' ? 'Mensagem de texto' : `Mensagem ${message.type}`} enviada
                                </p>
                                <p className="text-xs text-gray-500">
                                  Para {message.phone} • Status: {message.status}
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time>{formatTime(message.createdAt)}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Messages */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Próximos Agendamentos</CardTitle>
                  <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                    Gerenciar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {!scheduledMessages || scheduledMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhum agendamento próximo</p>
                      <p className="text-xs text-gray-400">Crie um agendamento na seção de mensagens</p>
                    </div>
                  ) : (
                    scheduledMessages.map((message: any) => (
                      <div 
                        key={message.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Clock className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {message.content?.substring(0, 30)}...
                            </p>
                            <p className="text-xs text-gray-500">
                              Para: {message.phone} • {new Date(message.scheduledAt).toLocaleDateString('pt-BR')} às {new Date(message.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline"
                            className="border-blue-200 text-blue-800"
                          >
                            {message.status === 'scheduled' ? 'Agendada' : message.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Gráfico de Performance</p>
                    <p className="text-xs text-gray-400 mt-1">Mensagens enviadas nos últimos 7 dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
