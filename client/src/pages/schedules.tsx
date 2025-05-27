import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, Clock, MessageCircle, Plus, Trash2, Smile, Bold, Italic, Type,
  Image, Video, Music, FileText, MapPin, Link, Mic, Send, Upload,
  Camera, Paperclip, Phone, Users, Hash
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScheduledMessage {
  id: number;
  sessionId: number;
  sessionName: string;
  content: string;
  phone: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

interface Session {
  id: number;
  name: string;
  status: string;
  phone?: string;
}

interface Group {
  id: number;
  name: string;
  memberCount: number;
}

export default function Schedules() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [recipientType, setRecipientType] = useState<"phone" | "group">("phone");
  const [phone, setPhone] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // Advanced message features
  const [messageType, setMessageType] = useState<"text" | "media" | "document" | "location" | "contact">("text");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaCaption, setMediaCaption] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [locationData, setLocationData] = useState({ lat: "", lng: "", name: "" });
  const [contactData, setContactData] = useState({ name: "", phone: "" });
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // File upload refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Lista de emojis populares
  const popularEmojis = [
    '😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😘',
    '😎', '🤗', '🤔', '😴', '🤯', '😱', '😭', '😂',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '👍', '👎', '👌', '✌️', '🤞', '👏', '🙌', '🤝',
    '🔥', '⭐', '✨', '🎉', '🎊', '💯', '✅', '❌'
  ];

  // Função para adicionar emoji ao texto
  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Buscar sessões ativas
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Buscar mensagens agendadas
  const { data: scheduledMessages = [], isLoading } = useQuery<ScheduledMessage[]>({
    queryKey: ["/api/messages/scheduled"],
  })

  // Buscar grupos da sessão selecionada
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups", selectedSession],
    enabled: !!selectedSession && recipientType === "group",
  });

  // Mutation para criar mensagem agendada
  const createScheduledMessage = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/messages/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Erro ao agendar mensagem");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/scheduled"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Mensagem agendada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao agendar mensagem",
        variant: "destructive",
      });
    },
  });

  // Mutation para cancelar mensagem agendada
  const cancelScheduledMessage = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/messages/scheduled/${messageId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erro ao cancelar mensagem");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/scheduled"] });
      toast({
        title: "Sucesso",
        description: "Mensagem cancelada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar mensagem",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedSession("");
    setRecipientType("phone");
    setPhone("");
    setSelectedGroup("");
    setContent("");
    setScheduledDate("");
    setScheduledTime("");
    setMessageType("text");
    setMediaFiles([]);
    setMediaCaption("");
    setDocumentFile(null);
    setLocationData({ lat: "", lng: "", name: "" });
    setContactData({ name: "", phone: "" });
    setAudioBlob(null);
  };

  // Handle file uploads
  const handleFileUpload = (files: FileList | null, type: "image" | "video" | "audio" | "document") => {
    if (!files) return;
    
    if (type === "document") {
      setDocumentFile(files[0]);
      setMessageType("document");
    } else {
      const fileArray = Array.from(files);
      setMediaFiles(prev => [...prev, ...fileArray]);
      setMessageType("media");
    }
  };

  // Format text with WhatsApp formatting
  const insertTextFormat = (format: string) => {
    const textarea = document.getElementById("content") as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formattedText = "";
    switch (format) {
      case "bold":
        formattedText = `*${selectedText}*`;
        break;
      case "italic":
        formattedText = `_${selectedText}_`;
        break;
      case "strikethrough":
        formattedText = `~${selectedText}~`;
        break;
      case "monospace":
        formattedText = `\`\`\`${selectedText}\`\`\``;
        break;
    }
    
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const recipient = recipientType === "phone" ? phone : selectedGroup;
    
    if (!selectedSession || !recipient || !content || !scheduledDate || !scheduledTime) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduledAt <= new Date()) {
      toast({
        title: "Erro",
        description: "A data e hora devem ser no futuro",
        variant: "destructive",
      });
      return;
    }

    createScheduledMessage.mutate({
      sessionId: parseInt(selectedSession),
      recipientType,
      phone: recipientType === "phone" ? phone : undefined,
      groupId: recipientType === "group" ? selectedGroup : undefined,
      content,
      scheduledDate,
      scheduledTime
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "outline" as const },
      sent: { label: "Enviada", variant: "default" as const },
      failed: { label: "Falhou", variant: "destructive" as const },
      cancelled: { label: "Cancelada", variant: "secondary" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header Section with improved spacing and design */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agendamentos</h1>
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                Gerencie suas mensagens agendadas para grupos e contatos
              </p>
            </div>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6 text-base font-medium">
              <Plus className="mr-2 h-5 w-5" />
              Nova Mensagem Agendada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">Agendar Mensagem</DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-400">
                    Configure quando e para quem enviar sua mensagem automaticamente
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              {/* Session Selection with improved design */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <Label htmlFor="session" className="text-base font-semibold">Sessão do WhatsApp</Label>
                </div>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecione uma sessão conectada" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions
                      .filter((session) => session.status === "connected")
                      .map((session) => (
                        <SelectItem key={session.id} value={session.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {session.name} {session.phone && `(${session.phone})`}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {sessions.filter(session => session.status === "connected").length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded">
                    ⚠️ Nenhuma sessão conectada. Conecte uma sessão primeiro.
                  </p>
                )}
              </div>

              {/* Recipient Type Selection with enhanced design */}
              <div className="bg-indigo-50 dark:bg-indigo-950 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <Label className="text-base font-semibold">Tipo de Destinatário</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    recipientType === "phone" 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-md" 
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`} onClick={() => setRecipientType("phone")}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="phone-option"
                        value="phone"
                        checked={recipientType === "phone"}
                        onChange={(e) => setRecipientType(e.target.value as "phone" | "group")}
                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <Label htmlFor="phone-option" className="text-base font-medium cursor-pointer">
                          📱 Contato Individual
                        </Label>
                        <p className="text-sm text-gray-500">Enviar para um número específico</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    recipientType === "group" 
                      ? "border-green-500 bg-green-50 dark:bg-green-950 shadow-md" 
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`} onClick={() => setRecipientType("group")}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="group-option"
                        value="group"
                        checked={recipientType === "group"}
                        onChange={(e) => setRecipientType(e.target.value as "phone" | "group")}
                        className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <div>
                        <Label htmlFor="group-option" className="text-base font-medium cursor-pointer">
                          👥 Grupo WhatsApp
                        </Label>
                        <p className="text-sm text-gray-500">Enviar para um grupo existente</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campo Destinatário */}
              {recipientType === "phone" ? (
                <div className="space-y-2">
                  <Label htmlFor="phone">Número do WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Ex: 5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-xs text-gray-500">
                    Inclua o código do país (ex: 55 para Brasil)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="group">Grupo do WhatsApp</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          👥 {group.name} ({group.memberCount} membros)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSession && groups.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-600">
                        Nenhum grupo encontrado para esta sessão
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/groups/sync', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sessionId: parseInt(selectedSession) })
                            });
                            const result = await response.json();
                            if (response.ok) {
                              toast({
                                title: "Sucesso!",
                                description: result.message,
                              });
                              // Recarregar grupos
                              window.location.reload();
                            } else {
                              toast({
                                title: "Erro",
                                description: result.error,
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            toast({
                              title: "Erro",
                              description: "Erro ao sincronizar grupos",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full"
                      >
                        🔄 Sincronizar Grupos do WhatsApp
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Message Composer */}
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <Label className="text-base font-semibold">Conteúdo da Mensagem</Label>
                </div>

                <Tabs value={messageType} onValueChange={(value) => setMessageType(value as any)} className="w-full">
                  <TabsList className="grid grid-cols-5 w-full">
                    <TabsTrigger value="text" className="flex items-center gap-1">
                      <Type className="h-4 w-4" />
                      Texto
                    </TabsTrigger>
                    <TabsTrigger value="media" className="flex items-center gap-1">
                      <Image className="h-4 w-4" />
                      Mídia
                    </TabsTrigger>
                    <TabsTrigger value="document" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Arquivo
                    </TabsTrigger>
                    <TabsTrigger value="location" className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Local
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Contato
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-3">
                    {/* Text Formatting Toolbar */}
                    <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertTextFormat("bold")}
                        className="h-8"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertTextFormat("italic")}
                        className="h-8"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertTextFormat("strikethrough")}
                        className="h-8"
                      >
                        <Type className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => insertTextFormat("monospace")}
                        className="h-8"
                      >
                        <Hash className="h-4 w-4" />
                      </Button>
                      <div className="border-l border-gray-300 h-6 mx-2"></div>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="h-8"
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                        
                        {showEmojiPicker && (
                          <div className="absolute top-10 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-64">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Emojis Populares</div>
                            <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
                              {popularEmojis.map((emoji, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => addEmoji(emoji)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Textarea
                      id="content"
                      placeholder="Digite sua mensagem... 
✨ Use *negrito*, _itálico_, ~riscado~, ```código```
🔗 Links são automaticamente detectados
😀 Emojis são suportados"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        ✓ Formatação WhatsApp • Links automáticos • Emojis suportados
                      </div>
                      <span className="text-xs text-gray-400">
                        {content.length}/4096
                      </span>
                    </div>

                    {/* Link Preview */}
                    {content && content.match(/(https?:\/\/[^\s]+)/g) && (
                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">🔗 Links detectados:</p>
                        <div className="space-y-2">
                          {content.match(/(https?:\/\/[^\s]+)/g)?.map((link, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border">
                              <p className="text-xs text-blue-600 dark:text-blue-400 break-all">{link}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="media" className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => imageInputRef.current?.click()}
                        className="h-20 flex-col gap-2"
                      >
                        <Image className="h-6 w-6" />
                        <span className="text-sm">Imagens</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                        className="h-20 flex-col gap-2"
                      >
                        <Video className="h-6 w-6" />
                        <span className="text-sm">Vídeos</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => audioInputRef.current?.click()}
                        className="h-20 flex-col gap-2"
                      >
                        <Music className="h-6 w-6" />
                        <span className="text-sm">Áudio</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-20 flex-col gap-2"
                      >
                        <Camera className="h-6 w-6" />
                        <span className="text-sm">Câmera</span>
                      </Button>
                    </div>

                    {mediaFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Arquivos selecionados:</Label>
                        <div className="space-y-2">
                          {mediaFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                              <span className="text-sm">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMediaFiles(prev => prev.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Textarea
                          placeholder="Legenda opcional para as mídias..."
                          value={mediaCaption}
                          onChange={(e) => setMediaCaption(e.target.value)}
                          rows={2}
                        />
                      </div>
                    )}

                    {/* Hidden file inputs */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files, "image")}
                      className="hidden"
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files, "video")}
                      className="hidden"
                    />
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files, "audio")}
                      className="hidden"
                    />
                  </TabsContent>

                  <TabsContent value="document" className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => documentInputRef.current?.click()}
                      className="w-full h-20 flex-col gap-2"
                    >
                      <Paperclip className="h-6 w-6" />
                      <span>Selecionar Documento</span>
                    </Button>

                    {documentFile && (
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          <span className="text-sm">{documentFile.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDocumentFile(null)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <input
                      ref={documentInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                      onChange={(e) => handleFileUpload(e.target.files, "document")}
                      className="hidden"
                    />
                  </TabsContent>

                  <TabsContent value="location" className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Latitude</Label>
                        <Input
                          placeholder="-23.5505"
                          value={locationData.lat}
                          onChange={(e) => setLocationData(prev => ({ ...prev, lat: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Longitude</Label>
                        <Input
                          placeholder="-46.6333"
                          value={locationData.lng}
                          onChange={(e) => setLocationData(prev => ({ ...prev, lng: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do Local (opcional)</Label>
                      <Input
                        placeholder="Ex: Av. Paulista, São Paulo"
                        value={locationData.name}
                        onChange={(e) => setLocationData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-3">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Nome do Contato</Label>
                        <Input
                          placeholder="João Silva"
                          value={contactData.name}
                          onChange={(e) => setContactData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                          placeholder="5511999999999"
                          value={contactData.phone}
                          onChange={(e) => setContactData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">📅 Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="text-base h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-medium">🕐 Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="text-base h-11"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white"
                  disabled={createScheduledMessage.isPending}
                >
                  {createScheduledMessage.isPending ? (
                    <>⏳ Agendando...</>
                  ) : (
                    <>📅 Agendar Mensagem</>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-12 px-6 text-base"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Carregando agendamentos...
              </p>
            </CardContent>
          </Card>
        ) : scheduledMessages.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhuma mensagem agendada
                </p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Nova Mensagem Agendada" para começar
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          scheduledMessages.map((message) => (
            <Card key={message.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <CardTitle className="text-base">
                      {message.sessionName}
                    </CardTitle>
                    {getStatusBadge(message.status)}
                  </div>
                  {message.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelScheduledMessage.mutate(message.id)}
                      disabled={cancelScheduledMessage.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Para: {message.phone}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {message.content}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(message.scheduledAt), "dd/MM/yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(message.scheduledAt), "HH:mm")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}