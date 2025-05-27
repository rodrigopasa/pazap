import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { messageAPI, contactAPI } from "@/lib/api";
import {
  Send, Upload, MessageSquare, Image, Video, Music, FileText, MapPin, Users, 
  CheckCircle, XCircle, Clock, Smile, Bold, Italic, Type, Hash, Camera, 
  Paperclip, Trash2, MessageCircle, Plus
} from "lucide-react";

export default function Messages() {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterSession, setFilterSession] = useState("");
  
  // Basic form state
  const [phones, setPhones] = useState("");
  const [content, setContent] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [scheduledAt, setScheduledAt] = useState("");
  
  // Advanced WhatsApp features
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaCaption, setMediaCaption] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [locationData, setLocationData] = useState({ lat: "", lng: "", name: "" });
  const [contactData, setContactData] = useState({ name: "", phone: "" });
  const [recipientType, setRecipientType] = useState<"phone" | "group">("phone");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  
  // File upload refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages", filterSession],
    queryFn: () => messageAPI.getAll(filterSession && filterSession !== "all" ? parseInt(filterSession) : undefined, 100),
    refetchInterval: 10000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: messageAPI.send,
    onSuccess: () => {
      toast({
        title: "Mensagens enviadas",
        description: "Mensagens adicionadas à fila de envio",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSendModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Falha ao enviar mensagens",
        variant: "destructive",
      });
    },
  });

  const uploadCSVMutation = useMutation({
    mutationFn: contactAPI.uploadCSV,
    onSuccess: (data) => {
      toast({
        title: "CSV processado",
        description: `${data.imported} contatos importados com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setUploadModalOpen(false);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao processar CSV",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setPhones("");
    setContent("");
    setSessionId("");
    setMessageType("text");
    setScheduledAt("");
    setMediaFiles([]);
    setMediaCaption("");
    setDocumentFile(null);
    setLocationData({ lat: "", lng: "", name: "" });
    setContactData({ name: "", phone: "" });
    setRecipientType("phone");
    setSelectedGroup("");
  };

  // Handle file uploads for advanced features
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phones.trim() || !sessionId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (messageType === "text" && !content.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Digite o conteúdo da mensagem",
        variant: "destructive",
      });
      return;
    }

    const phoneList = phones.split(',').map(p => p.trim()).filter(p => p);
    
    sendMessageMutation.mutate({
      sessionId: parseInt(sessionId),
      phones: phoneList,
      content: content.trim(),
      type: messageType,
      scheduledAt: scheduledAt || undefined
    });
  };

  const handleCSVUpload = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Arquivo obrigatório",
        description: "Selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    uploadCSVMutation.mutate(selectedFile);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Enviada</Badge>;
      case 'delivered':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Entregue</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'media':
        return <Image className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const connectedSessions = sessions?.filter((s: any) => s.status === 'connected') || [];

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-6 rounded-xl border border-green-200 dark:border-green-800">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">💬 Disparador WhatsApp</h1>
              <p className="text-green-600 dark:text-green-400 font-medium">
                Envie mensagens avançadas com mídia, documentos, localização e muito mais
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white dark:bg-gray-800 shadow-md">
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload de Contatos</DialogTitle>
                <DialogDescription>
                  Importe uma lista de contatos via arquivo CSV
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCSVUpload} className="space-y-4">
                <div>
                  <Label htmlFor="csvFile">Arquivo CSV</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    O arquivo deve conter colunas: phone, name (opcional), email (opcional)
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={uploadCSVMutation.isPending}>
                    {uploadCSVMutation.isPending ? "Processando..." : "Upload"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6 text-base font-medium">
                <Send className="h-5 w-5 mr-2" />
                Nova Mensagem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Send className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold">💬 Disparador WhatsApp</DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400">
                      Envie mensagens avançadas com mídia, documentos, localização e muito mais
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <form onSubmit={handleSendMessage} className="space-y-6 pt-4">
                {/* Session Selection */}
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Label className="text-base font-semibold">Sessão do WhatsApp</Label>
                  </div>
                  <Select value={sessionId} onValueChange={setSessionId}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecione uma sessão conectada" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedSessions.length === 0 ? (
                        <SelectItem value="no-sessions" disabled>
                          Nenhuma sessão conectada
                        </SelectItem>
                      ) : (
                        connectedSessions.map((session: any) => (
                          <SelectItem key={session.id} value={session.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {session.name} {session.phone && `(${session.phone})`}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {connectedSessions.length === 0 && (
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded">
                      ⚠️ Nenhuma sessão conectada. Conecte uma sessão primeiro.
                    </p>
                  )}
                </div>

                {/* Recipients */}
                <div className="bg-indigo-50 dark:bg-indigo-950 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <Label className="text-base font-semibold">Destinatários</Label>
                  </div>
                  <Textarea
                    id="phones"
                    placeholder="55119999999, 55118888888 (separados por vírgula)"
                    value={phones}
                    onChange={(e) => setPhones(e.target.value)}
                    rows={3}
                    className="text-base"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {contacts?.length > 0 && `${contacts.length} contatos disponíveis na base`}
                  </p>
                </div>

                {/* Advanced Message Composer */}
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <Label className="text-base font-semibold">Conteúdo da Mensagem</Label>
                  </div>

                  <Tabs value={messageType} onValueChange={setMessageType} className="w-full">
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
                          title="Negrito"
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => insertTextFormat("italic")}
                          className="h-8"
                          title="Itálico"
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => insertTextFormat("strikethrough")}
                          className="h-8"
                          title="Riscado"
                        >
                          <Type className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => insertTextFormat("monospace")}
                          className="h-8"
                          title="Código"
                        >
                          <Hash className="h-4 w-4" />
                        </Button>
                        <div className="border-l border-gray-300 h-6 mx-2"></div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          title="Emojis"
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
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

                {/* Schedule Option */}
                <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <Label className="text-base font-semibold">Agendamento (opcional)</Label>
                  </div>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Deixe em branco para enviar imediatamente
                  </p>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 text-base font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                    disabled={sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <>⏳ Enviando...</>
                    ) : (
                      <>🚀 Enviar Mensagem</>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 px-6 text-base"
                    onClick={() => setSendModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mensagens Enviadas</h2>
          <Select value={filterSession} onValueChange={setFilterSession}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por sessão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as sessões</SelectItem>
              {sessions?.map((session: any) => (
                <SelectItem key={session.id} value={session.id.toString()}>
                  {session.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {messages?.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <MessageSquare className="mx-auto h-16 w-16 text-gray-400" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma mensagem encontrada</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Comece enviando sua primeira mensagem
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {messages?.map((message: any) => (
              <Card key={message.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(message.type)}
                      <div>
                        <CardTitle className="text-base">{message.sessionName}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Para: {message.phone}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(message.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {message.content && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}