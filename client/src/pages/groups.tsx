import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { groupAPI } from "@/lib/api";
import {
  Plus,
  Users,
  Settings,
  Trash2,
  UserPlus,
  MessageSquare,
  Hash,
  Crown,
  User
} from "lucide-react";

export default function Groups() {
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState("");
  
  // Form state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [members, setMembers] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const { data: groups, isLoading } = useQuery({
    queryKey: ["/api/groups", selectedSession],
    queryFn: () => selectedSession ? groupAPI.getAll(parseInt(selectedSession)) : Promise.resolve([]),
    enabled: !!selectedSession,
  });

  const createGroupMutation = useMutation({
    mutationFn: groupAPI.create,
    onSuccess: () => {
      toast({
        title: "Grupo criado",
        description: "Novo grupo WhatsApp criado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setNewGroupOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar grupo",
        description: error.message || "Falha ao criar grupo",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setGroupName("");
    setGroupDescription("");
    setSessionId("");
    setMembers("");
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim() || !sessionId || !members.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome do grupo, sessão e membros são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const memberList = members.split(',').map(m => m.trim()).filter(m => m);
    
    if (memberList.length === 0) {
      toast({
        title: "Membros obrigatórios",
        description: "Adicione pelo menos um membro ao grupo",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      sessionId: parseInt(sessionId),
      name: groupName.trim(),
      description: groupDescription.trim(),
      members: memberList
    });
  };

  const connectedSessions = sessions?.filter((s: any) => s.status === 'connected') || [];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grupos WhatsApp</h1>
            <p className="text-gray-600">Gerencie grupos e adicione membros</p>
          </div>
          
          <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={connectedSessions.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
                <DialogDescription>
                  Crie um novo grupo WhatsApp e adicione membros
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="groupName">Nome do Grupo *</Label>
                    <Input
                      id="groupName"
                      placeholder="Ex: Clientes VIP"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessionId">Sessão *</Label>
                    <Select value={sessionId} onValueChange={setSessionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma sessão" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedSessions.map((session: any) => (
                          <SelectItem key={session.id} value={session.id.toString()}>
                            {session.name} {session.phone && `(${session.phone})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="groupDescription">Descrição</Label>
                  <Input
                    id="groupDescription"
                    placeholder="Descrição do grupo (opcional)"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="members">Membros *</Label>
                  <Textarea
                    id="members"
                    placeholder="55119999999, 55118888888 (separados por vírgula)"
                    value={members}
                    onChange={(e) => setMembers(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Digite os números no formato internacional (5511999999999)
                  </p>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setNewGroupOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createGroupMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {createGroupMutation.isPending ? "Criando..." : "Criar Grupo"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Session Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Label htmlFor="sessionFilter">Filtrar por Sessão:</Label>
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione uma sessão" />
              </SelectTrigger>
              <SelectContent>
                {connectedSessions.map((session: any) => (
                  <SelectItem key={session.id} value={session.id.toString()}>
                    {session.name} {session.phone && `(${session.phone})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* No Session Selected */}
        {!selectedSession && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione uma Sessão
              </h3>
              <p className="text-gray-500">
                Escolha uma sessão conectada para visualizar os grupos
              </p>
            </CardContent>
          </Card>
        )}

        {/* No Connected Sessions */}
        {connectedSessions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma Sessão Conectada
              </h3>
              <p className="text-gray-500 mb-4">
                Você precisa de pelo menos uma sessão conectada para gerenciar grupos
              </p>
              <Button variant="outline">
                Ir para Sessões
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && selectedSession && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48"></div>
              </div>
            ))}
          </div>
        )}

        {/* Groups Grid */}
        {selectedSession && !isLoading && (
          <>
            {groups?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum grupo encontrado
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Crie seu primeiro grupo WhatsApp para esta sessão
                  </p>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setNewGroupOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Grupo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups?.map((group: any) => (
                  <Card key={group.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <CardDescription className="flex items-center">
                              <Hash className="h-3 w-3 mr-1" />
                              {group.groupId?.substring(0, 20)}...
                            </CardDescription>
                          </div>
                        </div>
                        <Badge 
                          className={group.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {group.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {group.description && (
                        <p className="text-sm text-gray-600">{group.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <User className="h-4 w-4 mr-1" />
                          {group.memberCount || 0} membros
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Criado em: {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <UserPlus className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Enviar
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
