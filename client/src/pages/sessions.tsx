import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { sessionAPI } from "@/lib/api";
import { 
  Plus, 
  Settings, 
  Trash2, 
  FolderSync, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock,
  QrCode,
  AlertTriangle
} from "lucide-react";
import QRCode from 'qrcode';

export default function Sessions() {
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["/api/sessions"],
    refetchInterval: 10000,
  });

  const createSessionMutation = useMutation({
    mutationFn: sessionAPI.create,
    onSuccess: () => {
      toast({
        title: "Sessão criada",
        description: "Nova sessão WhatsApp criada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setNewSessionOpen(false);
      setSessionName("");
      setSessionId("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar sessão",
        description: error.message || "Falha ao criar nova sessão",
        variant: "destructive",
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: sessionAPI.delete,
    onSuccess: () => {
      toast({
        title: "Sessão removida",
        description: "Sessão WhatsApp removida com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover sessão",
        description: error.message || "Falha ao remover sessão",
        variant: "destructive",
      });
    },
  });

  const reconnectSessionMutation = useMutation({
    mutationFn: sessionAPI.reconnect,
    onSuccess: () => {
      toast({
        title: "Reconectando sessão",
        description: "Tentativa de reconexão iniciada",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reconectar",
        description: error.message || "Falha ao reconectar sessão",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Conectada</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Conectando</Badge>;
      case 'qr_needed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><QrCode className="h-3 w-3 mr-1" />QR Code</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Desconectada</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Desconhecido</Badge>;
    }
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionName.trim() || !sessionId.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e ID da sessão são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    createSessionMutation.mutate({
      name: sessionName.trim(),
      sessionId: sessionId.trim()
    });
  };

  const handleShowQR = async (qrCode: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(qrCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setSelectedQR(qrDataUrl);
      setQrModalOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao gerar QR Code",
        description: "Não foi possível gerar o QR Code",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sessões WhatsApp</h1>
            <p className="text-gray-600">Gerencie suas conexões WhatsApp</p>
          </div>
          
          <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nova Sessão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Sessão</DialogTitle>
                <DialogDescription>
                  Configure uma nova sessão WhatsApp para envio de mensagens
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <Label htmlFor="sessionName">Nome da Sessão</Label>
                  <Input
                    id="sessionName"
                    placeholder="Ex: Sessão Principal"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sessionId">ID da Sessão</Label>
                  <Input
                    id="sessionId"
                    placeholder="Ex: session_main"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ID único para identificar esta sessão
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewSessionOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSessionMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {createSessionMutation.isPending ? "Criando..." : "Criar Sessão"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sessions Grid */}
        {sessions?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma sessão configurada
              </h3>
              <p className="text-gray-500 mb-4">
                Crie sua primeira sessão WhatsApp para começar a enviar mensagens
              </p>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setNewSessionOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Sessão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions?.map((session: any) => (
              <Card key={session.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    {getStatusBadge(session.status)}
                  </div>
                  <CardDescription>{session.sessionId}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Smartphone className="h-4 w-4 mr-2" />
                      {session.phone}
                    </div>
                  )}
                  
                  {session.lastConnected && (
                    <div className="text-xs text-gray-500">
                      Última conexão: {new Date(session.lastConnected).toLocaleString('pt-BR')}
                    </div>
                  )}

                  {session.status === 'qr_needed' && session.qrCode && (
                    <Alert>
                      <QrCode className="h-4 w-4" />
                      <AlertDescription>
                        QR Code gerado. 
                        <Button 
                          variant="link" 
                          className="p-0 h-auto ml-1 text-blue-600"
                          onClick={() => handleShowQR(session.qrCode)}
                        >
                          Clique para visualizar
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex space-x-2">
                    {session.status === 'disconnected' || session.status === 'qr_needed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reconnectSessionMutation.mutate(session.id)}
                        disabled={reconnectSessionMutation.isPending}
                        className="flex-1"
                      >
                        <FolderSync className="h-3 w-3 mr-1" />
                        Reconectar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="h-3 w-3 mr-1" />
                        Configurar
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteSessionMutation.mutate(session.id)}
                      disabled={deleteSessionMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Modal */}
        <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code WhatsApp</DialogTitle>
              <DialogDescription>
                Escaneie este QR code com seu WhatsApp para conectar a sessão
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              {selectedQR && (
                <img 
                  src={selectedQR} 
                  alt="QR Code" 
                  className="border border-gray-200 rounded-lg"
                />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                1. Abra o WhatsApp no seu celular<br />
                2. Toque em Configurações → Aparelhos conectados<br />
                3. Toque em "Conectar um aparelho"<br />
                4. Escaneie este QR code
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
