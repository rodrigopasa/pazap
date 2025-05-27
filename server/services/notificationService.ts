import { storage } from '../storage';
import { whatsappService } from './whatsapp';

interface SendingResult {
  total: number;
  sent: number;
  failed: number;
  failedNumbers: string[];
  successNumbers: string[];
}

class NotificationService {
  // Enviar notificação de resultado para o número configurado
  async sendSchedulingResult(result: SendingResult, scheduleName?: string): Promise<void> {
    const userId = 1; // TODO: Get from session/auth
    
    // Buscar número de notificação configurado
    const notificationPhoneSetting = await storage.getSetting(userId, 'notification_phone');
    const notificationSessionSetting = await storage.getSetting(userId, 'notification_session');
    
    if (!notificationPhoneSetting?.value || !notificationSessionSetting?.value) {
      console.log('Notification phone or session not configured, skipping notification');
      return;
    }

    const notificationPhone = notificationPhoneSetting.value;
    const sessionId = parseInt(notificationSessionSetting.value);

    // Verificar se a sessão está ativa
    const session = await storage.getSession(sessionId);
    if (!session || session.status !== 'connected') {
      console.log('Notification session not connected, skipping notification');
      await storage.createLog({
        level: 'warn',
        source: 'notification_service',
        message: 'Notification session not connected',
        metadata: { sessionId, phone: notificationPhone },
        userId,
        sessionId
      });
      return;
    }

    // Criar mensagem de resultado
    const message = this.formatResultMessage(result, scheduleName);

    try {
      // Enviar notificação via WhatsApp
      await whatsappService.sendMessage(session.sessionId, notificationPhone, message);
      
      await storage.createLog({
        level: 'info',
        source: 'notification_service',
        message: 'Scheduling result notification sent',
        metadata: { phone: notificationPhone, result },
        userId,
        sessionId
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      
      await storage.createLog({
        level: 'error',
        source: 'notification_service',
        message: 'Failed to send scheduling notification',
        metadata: { phone: notificationPhone, error: error instanceof Error ? error.message : 'Unknown error' },
        userId,
        sessionId
      });
    }
  }

  // Formatar mensagem de resultado
  private formatResultMessage(result: SendingResult, scheduleName?: string): string {
    const successRate = result.total > 0 ? ((result.sent / result.total) * 100).toFixed(1) : '0';
    const timestamp = new Date().toLocaleString('pt-BR');
    
    let message = `📊 *Relatório de Envio*\n`;
    
    if (scheduleName) {
      message += `📅 *Agendamento:* ${scheduleName}\n`;
    }
    
    message += `🕒 *Horário:* ${timestamp}\n\n`;
    message += `📈 *Resumo:*\n`;
    message += `• Total: ${result.total} mensagens\n`;
    message += `• ✅ Enviadas: ${result.sent}\n`;
    message += `• ❌ Falharam: ${result.failed}\n`;
    message += `• 📊 Taxa de sucesso: ${successRate}%\n\n`;

    if (result.failed > 0 && result.failedNumbers.length > 0) {
      message += `⚠️ *Números com falha:*\n`;
      result.failedNumbers.slice(0, 10).forEach(phone => {
        message += `• ${phone}\n`;
      });
      
      if (result.failedNumbers.length > 10) {
        message += `... e mais ${result.failedNumbers.length - 10} números\n`;
      }
    }

    if (result.sent > 0) {
      message += `\n🎯 *Status:* ${result.failed === 0 ? 'Envio concluído com sucesso!' : 'Envio concluído com algumas falhas'}`;
    } else {
      message += `\n❌ *Status:* Falha total no envio`;
    }

    return message;
  }

  // Configurar número de notificação
  async setNotificationPhone(userId: number, phone: string, sessionId: number): Promise<void> {
    await storage.setSetting(userId, 'notification_phone', phone, 'Número para receber notificações de agendamentos');
    await storage.setSetting(userId, 'notification_session', sessionId.toString(), 'Sessão para enviar notificações');
    
    await storage.createLog({
      level: 'info',
      source: 'notification_service',
      message: 'Notification settings updated',
      metadata: { phone, sessionId },
      userId
    });
  }

  // Obter configurações de notificação
  async getNotificationSettings(userId: number): Promise<{ phone?: string; sessionId?: number }> {
    const phoneSetting = await storage.getSetting(userId, 'notification_phone');
    const sessionSetting = await storage.getSetting(userId, 'notification_session');
    
    return {
      phone: phoneSetting?.value,
      sessionId: sessionSetting?.value ? parseInt(sessionSetting.value) : undefined
    };
  }

  // Enviar notificação de teste
  async sendTestNotification(userId: number): Promise<boolean> {
    const settings = await this.getNotificationSettings(userId);
    
    if (!settings.phone || !settings.sessionId) {
      throw new Error('Configurações de notificação não encontradas');
    }

    const testResult: SendingResult = {
      total: 5,
      sent: 4,
      failed: 1,
      successNumbers: ['11999999999', '11888888888', '11777777777', '11666666666'],
      failedNumbers: ['11555555555']
    };

    try {
      await this.sendSchedulingResult(testResult, 'Teste de Notificação');
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export const notificationService = new NotificationService();