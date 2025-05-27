
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Phone,
  Check,
  AlertCircle,
  TestTube,
  Settings,
  MessageCircle,
  Clock,
  TrendingUp,
  Users
} from "lucide-react";

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // Buscar sessões disponíveis
  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
    refetchInterval: 15000,
  });

  // Buscar configurações atuais
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["/api/notifications/settings"],
  });

  // Mutação para salvar configurações
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { phone: string; sessionId: number }) => {
      const response = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao salvar configurações");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "As configurações de notificação foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  // Mutação para teste de notificação
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Erro ao enviar teste");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Teste enviado",
        description: "Uma notificação de teste foi enviada para o número configurado.",
      });
      setIsTestingNotification(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message || "Não foi possível enviar a notificação de teste.",
        variant: "destructive",
      });
      setIsTestingNotification(false);
    },
  });

  // Carregar configurações existentes
  useState(() => {
    if (settings) {
      setPhone(settings.phone || "");
      setSelectedSession(settings.sessionId?.toString() || "");
    }
  }, [settings]);

  const handleSaveSettings = () => {
    if (!phone || !selectedSession) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o número de telefone e selecione uma sessão.",
        variant: "destructive",
      });
      return;
    }

    saveSettingsMutation.mutate({
      phone: phone,
      sessionId: parseInt(selectedSession),
    });
  };

  const handleTestNotification = () => {
    if (!settings?.phone || !settings?.sessionId) {
      toast({
        title: "Configure primeiro",
        description: "Salve as configurações antes de enviar um teste.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingNotification(true);
    testNotificationMutation.mutate();
  };

  const activeSessions = sessions?.filter((s: any) => s.status === 'connected') || [];

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configurações de Notificação</h1>
              <p className="text-gray-600">Configure os relatórios automáticos de envio</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurações principais */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Configurações Gerais</span>
                </CardTitle>
                <CardDescription>
                  Configure onde e como receber as notificações de resultado dos envios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Número de telefone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Número para Notificações</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      placeholder="Ex: 5511999999999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Número com código do país (sem +). Ex: 5511999999999
                  </p>
                </div>

                {/* Sessão WhatsApp */}
                <div className="space-y-2">
                  <Label htmlFor="session">Sessão WhatsApp</Label>
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sessão conectada" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSessions.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma sessão conectada
                        </SelectItem>
                      ) : (
                        activeSessions.map((session: any) => (
                          <SelectItem key={session.id} value={session.id.toString()}>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full" />
                              <span>{session.name}</span>
                              {session.phone && (
                                <span className="text-gray-500">({session.phone})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Selecione a sessão WhatsApp que enviará as notificações
                  </p>
                </div>

                <Separator />

                {/* Botões de ação */}
                <div className="flex space-x-3">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saveSettingsMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Salvar Configurações
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleTestNotification}
                    disabled={isTestingNotification || !settings?.phone}
                  >
                    {isTestingNotification ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-2" />
                    )}
                    Enviar Teste
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Exemplo de notificação */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Exemplo de Notificação</span>
                </CardTitle>
                <CardDescription>
                  Veja como será a mensagem de relatório enviada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                  <div className="font-mono text-sm space-y-1">
                    <div>📊 <strong>Relatório de Envio</strong></div>
                    <div>📅 <strong>Agendamento:</strong> Campanha de Marketing</div>
                    <div>🕒 <strong>Horário:</strong> 28/01/2025 15:30:25</div>
                    <div className="pt-2"></div>
                    <div>📈 <strong>Resumo:</strong></div>
                    <div>• Total: 100 mensagens</div>
                    <div>• ✅ Enviadas: 95</div>
                    <div>• ❌ Falharam: 5</div>
                    <div>• 📊 Taxa de sucesso: 95.0%</div>
                    <div className="pt-2"></div>
                    <div>⚠️ <strong>Números com falha:</strong></div>
                    <div>• 11999999999</div>
                    <div>• 11888888888</div>
                    <div className="pt-2"></div>
                    <div>🎯 <strong>Status:</strong> Envio concluído com algumas falhas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status e informações */}
          <div className="space-y-6">
            {/* Status atual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingSettings ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300 mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">Carregando...</p>
                  </div>
                ) : settings?.phone ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Configurado
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Número:</strong> {settings.phone}</p>
                      <p><strong>Sessão:</strong> {
                        sessions?.find((s: any) => s.id === settings.sessionId)?.name || 'N/A'
                      }</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Não configurado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recursos das notificações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recursos Inclusos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Estatísticas Detalhadas</p>
                    <p className="text-xs text-gray-500">Total enviado, taxa de sucesso, falhas</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Relatórios Automáticos</p>
                    <p className="text-xs text-gray-500">Enviados após cada campanha</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Lista de Falhas</p>
                    <p className="text-xs text-gray-500">Números que não receberam</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ajuda */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💡 Dica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  As notificações são enviadas automaticamente sempre que uma campanha ou agendamento é concluído. 
                  Configure um número que você monitore regularmente.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
