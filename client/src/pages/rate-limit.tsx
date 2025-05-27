import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  Activity,
  Zap,
  Timer,
  BarChart3
} from "lucide-react";

export default function RateLimit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Buscar sessões disponíveis
  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
    refetchInterval: 15000,
  });

  // Buscar estatísticas do rate limiter
  const { data: rateLimitStats, isLoading: loadingStats } = useQuery({
    queryKey: ["/api/rate-limit/stats"],
    refetchInterval: 5000,
  });

  // Buscar configurações atuais
  const { data: rateLimitConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ["/api/rate-limit/config", selectedSession],
    enabled: !!selectedSession,
  });

  const activeSessions = sessions?.filter((s: any) => s.status === 'connected') || [];

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    if (score >= 40) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Normal</Badge>;
      case 'throttled':
        return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />Limitado</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Atenção</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Controle de Envio</h1>
              <p className="text-gray-600">Proteja suas contas contra banimentos com limites inteligentes</p>
            </div>
          </div>
        </div>

        {/* Seletor de Sessão */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Selecionar Sessão</CardTitle>
            <CardDescription>
              Escolha uma sessão para visualizar e configurar os limites de envio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Label htmlFor="session">Sessão WhatsApp</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma sessão..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSessions.map((session: any) => (
                      <SelectItem key={session.id} value={session.id.toString()}>
                        {session.name} - {session.sessionId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="advanced"
                    checked={showAdvanced}
                    onCheckedChange={setShowAdvanced}
                  />
                  <Label htmlFor="advanced">Configurações Avançadas</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard de Status Geral */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSessions.length}</div>
              <p className="text-xs text-muted-foreground">
                {sessions?.length || 0} total configuradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mensagens/Hora</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rateLimitStats?.totalMessagesLastHour || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Nas últimas 60 minutos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saúde Geral</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rateLimitStats?.averageHealth || 100}%
              </div>
              <p className="text-xs text-muted-foreground">
                Score médio de saúde
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status por Sessão */}
        {selectedSession && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Status da Sessão Selecionada */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status da Sessão</CardTitle>
                <CardDescription>
                  Monitoramento em tempo real dos limites de envio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingStats ? (
                  <div className="text-center py-4">Carregando estatísticas...</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      {getStatusBadge(rateLimitStats?.sessionStatus?.[selectedSession]?.status || 'normal')}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Mensagens/Minuto</span>
                          <span>
                            {rateLimitStats?.sessionStatus?.[selectedSession]?.messagesLastMinute || 0}/15
                          </span>
                        </div>
                        <Progress 
                          value={(rateLimitStats?.sessionStatus?.[selectedSession]?.messagesLastMinute || 0) / 15 * 100} 
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Mensagens/Hora</span>
                          <span>
                            {rateLimitStats?.sessionStatus?.[selectedSession]?.messagesLastHour || 0}/200
                          </span>
                        </div>
                        <Progress 
                          value={(rateLimitStats?.sessionStatus?.[selectedSession]?.messagesLastHour || 0) / 200 * 100} 
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Mensagens/Dia</span>
                          <span>
                            {rateLimitStats?.sessionStatus?.[selectedSession]?.messagesLastDay || 0}/1000
                          </span>
                        </div>
                        <Progress 
                          value={(rateLimitStats?.sessionStatus?.[selectedSession]?.messagesLastDay || 0) / 1000 * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Score de Saúde:</span>
                        <div className={`font-bold ${getHealthColor(rateLimitStats?.sessionStatus?.[selectedSession]?.health || 100)}`}>
                          {rateLimitStats?.sessionStatus?.[selectedSession]?.health || 100}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Próximo Envio:</span>
                        <div className="font-bold">
                          {rateLimitStats?.sessionStatus?.[selectedSession]?.nextSendTime || 'Agora'}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Configurações da Sessão */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurações de Limite</CardTitle>
                <CardDescription>
                  Ajuste os limites para esta sessão específica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingConfig ? (
                  <div className="text-center py-4">Carregando configurações...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="maxPerMinute">Máx/Minuto</Label>
                        <Input
                          id="maxPerMinute"
                          type="number"
                          defaultValue={rateLimitConfig?.maxMessagesPerMinute || 15}
                          max={20}
                          min={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxPerHour">Máx/Hora</Label>
                        <Input
                          id="maxPerHour"
                          type="number"
                          defaultValue={rateLimitConfig?.maxMessagesPerHour || 200}
                          max={500}
                          min={50}
                        />
                      </div>
                    </div>

                    {showAdvanced && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center">
                            <Settings className="w-4 h-4 mr-2" />
                            Configurações Avançadas
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="minDelay">Delay Mín (s)</Label>
                              <Input
                                id="minDelay"
                                type="number"
                                defaultValue={(rateLimitConfig?.minDelayBetweenMessages || 3000) / 1000}
                                min={1}
                                max={10}
                              />
                            </div>
                            <div>
                              <Label htmlFor="maxDelay">Delay Máx (s)</Label>
                              <Input
                                id="maxDelay"
                                type="number"
                                defaultValue={(rateLimitConfig?.maxDelayBetweenMessages || 8000) / 1000}
                                min={5}
                                max={30}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="burstLimit">Limite de Rajada</Label>
                            <Input
                              id="burstLimit"
                              type="number"
                              defaultValue={rateLimitConfig?.burstLimit || 5}
                              min={1}
                              max={10}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex space-x-3">
                      <Button className="flex-1">
                        <Settings className="w-4 h-4 mr-2" />
                        Salvar Configurações
                      </Button>
                      <Button variant="outline">
                        <Timer className="w-4 h-4 mr-2" />
                        Resetar
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alertas e Recomendações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proteção Ativa</CardTitle>
            <CardDescription>
              Sistema inteligente monitorando e protegendo suas contas em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3">
                <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Delays Adaptativos</p>
                  <p className="text-xs text-gray-500">Ajusta automaticamente os intervalos baseado no histórico</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Detecção de Padrões</p>
                  <p className="text-xs text-gray-500">Identifica sinais de rate limiting do WhatsApp</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Throttling Preventivo</p>
                  <p className="text-xs text-gray-500">Pausa automática quando detecta risco</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}