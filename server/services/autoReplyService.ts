import { storage } from "../storage";
import { messageService } from "./messageService";
import { AutoReply } from "@shared/schema";

interface IncomingMessage {
  text: string;
  from: string;
  sessionId: number;
  userId: number;
}

class AutoReplyService {
  /**
   * Processa uma mensagem recebida e verifica se deve enviar uma resposta automática
   */
  async processIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      // Buscar respostas automáticas ativas para o usuário e sessão
      const activeReplies = await storage.getActiveAutoReplies(
        message.userId, 
        message.sessionId
      );

      if (activeReplies.length === 0) {
        return; // Não há respostas automáticas configuradas
      }

      // Procurar por uma resposta que corresponda à mensagem
      const matchingReply = this.findMatchingReply(message.text, activeReplies);

      if (matchingReply) {
        // Enviar resposta automática
        await this.sendAutoReply(message, matchingReply);
      }
    } catch (error) {
      console.error("Erro ao processar resposta automática:", error);
    }
  }

  /**
   * Encontra a resposta automática que corresponde à mensagem
   */
  private findMatchingReply(messageText: string, replies: AutoReply[]): AutoReply | null {
    const normalizedText = messageText.toLowerCase().trim();

    // Ordenar por prioridade (maior prioridade primeiro)
    const sortedReplies = replies.sort((a, b) => b.priority - a.priority);

    for (const reply of sortedReplies) {
      const trigger = reply.trigger.toLowerCase().trim();

      switch (reply.matchType) {
        case "exact":
          if (normalizedText === trigger) {
            return reply;
          }
          break;

        case "starts_with":
          if (normalizedText.startsWith(trigger)) {
            return reply;
          }
          break;

        case "ends_with":
          if (normalizedText.endsWith(trigger)) {
            return reply;
          }
          break;

        case "contains":
        default:
          if (normalizedText.includes(trigger)) {
            return reply;
          }
          break;
      }
    }

    return null;
  }

  /**
   * Envia uma resposta automática
   */
  private async sendAutoReply(originalMessage: IncomingMessage, reply: AutoReply): Promise<void> {
    try {
      // Personalizar a resposta (substituir variáveis se necessário)
      const personalizedResponse = this.personalizeResponse(reply.response, originalMessage);

      // Criar mensagem para envio
      const autoMessage = {
        sessionId: originalMessage.sessionId,
        to: originalMessage.from,
        text: personalizedResponse,
        type: "text" as const,
        status: "pending" as const,
        isAutoReply: true,
        scheduledFor: new Date(),
      };

      // Adicionar à fila de mensagens
      messageService.queueMessage(autoMessage);

      console.log(`Resposta automática enviada para ${originalMessage.from}: ${personalizedResponse}`);
    } catch (error) {
      console.error("Erro ao enviar resposta automática:", error);
    }
  }

  /**
   * Personaliza a resposta substituindo variáveis
   */
  private personalizeResponse(response: string, message: IncomingMessage): string {
    return response
      .replace(/\{nome\}/gi, message.from || "Cliente")
      .replace(/\{numero\}/gi, message.from || "")
      .replace(/\{hora\}/gi, new Date().toLocaleTimeString("pt-BR"))
      .replace(/\{data\}/gi, new Date().toLocaleDateString("pt-BR"));
  }

  /**
   * Ativa/desativa uma resposta automática
   */
  async toggleAutoReply(id: number, isActive: boolean): Promise<void> {
    await storage.updateAutoReply(id, { isActive });
  }

  /**
   * Obtém estatísticas de respostas automáticas
   */
  async getAutoReplyStats(userId: number): Promise<any> {
    const replies = await storage.getAutoReplies(userId);
    
    return {
      total: replies.length,
      active: replies.filter(r => r.isActive).length,
      inactive: replies.filter(r => !r.isActive).length,
    };
  }
}

export const autoReplyService = new AutoReplyService();