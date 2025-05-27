import { Message } from '@shared/schema';
import { storage } from '../storage';
import { sessionManager } from '../whatsapp/sessionManager';
import { rateLimiter } from './rateLimiter';

interface MessageQueue {
  processing: boolean;
  queue: Message[];
}

class MessageService {
  private queues: Map<number, MessageQueue> = new Map(); // sessionId -> queue
  private broadcast?: (data: any) => void;
  private delays = {
    min: 2000, // 2 seconds
    max: 8000, // 8 seconds
  };

  setBroadcast(broadcastFn: (data: any) => void) {
    this.broadcast = broadcastFn;
  }

  queueMessage(message: Message) {
    if (!this.queues.has(message.sessionId)) {
      this.queues.set(message.sessionId, {
        processing: false,
        queue: []
      });
    }

    const sessionQueue = this.queues.get(message.sessionId)!;
    sessionQueue.queue.push(message);

    // Start processing if not already running
    if (!sessionQueue.processing) {
      this.processQueue(message.sessionId);
    }
  }

  private async processQueue(sessionId: number) {
    const sessionQueue = this.queues.get(sessionId);
    if (!sessionQueue || sessionQueue.processing) {
      return;
    }

    sessionQueue.processing = true;

    while (sessionQueue.queue.length > 0) {
      const message = sessionQueue.queue.shift()!;
      
      try {
        await this.sendMessage(message);
        
        // Random delay to avoid blocking
        const delay = Math.random() * (this.delays.max - this.delays.min) + this.delays.min;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error('Error processing message:', error);
        
        await storage.updateMessage(message.id, {
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        });

        await storage.createLog({
          level: 'error',
          source: 'message_service',
          message: `Failed to send message ${message.id}`,
          metadata: { messageId: message.id, error: error instanceof Error ? error.message : 'Unknown error' },
          sessionId: message.sessionId
        });
      }
    }

    sessionQueue.processing = false;
  }

  private async sendMessage(message: Message): Promise<void> {
    try {
      // Get session info
      const session = await storage.getSession(message.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Check if session is connected
      const sessionStatus = sessionManager.getSessionStatus(session.sessionId);
      if (sessionStatus !== 'connected') {
        throw new Error(`Session not connected: ${sessionStatus}`);
      }

      // Send message via WhatsApp
      const success = await sessionManager.sendMessage(
        session.sessionId,
        message.phone,
        message.content || '',
        message.type,
        message.mediaUrl || undefined
      );

      if (success) {
        // Update message status
        await storage.updateMessage(message.id, {
          status: 'sent',
          sentAt: new Date()
        });

        // Update campaign stats if applicable
        if (message.campaignId) {
          const campaign = await storage.getCampaign(message.campaignId);
          if (campaign) {
            await storage.updateCampaign(message.campaignId, {
              sentCount: (campaign.sentCount || 0) + 1,
              successCount: (campaign.successCount || 0) + 1
            });
          }
        }

        // Broadcast success
        this.broadcast?.({
          type: 'message_sent',
          messageId: message.id,
          phone: message.phone,
          sessionId: message.sessionId
        });

        // Log success
        await storage.createLog({
          level: 'info',
          source: 'message_service',
          message: `Message sent successfully to ${message.phone}`,
          metadata: { messageId: message.id, phone: message.phone },
          sessionId: message.sessionId
        });

      } else {
        throw new Error('Failed to send message via WhatsApp');
      }

    } catch (error) {
      // Update message status
      await storage.updateMessage(message.id, {
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update campaign stats if applicable
      if (message.campaignId) {
        const campaign = await storage.getCampaign(message.campaignId);
        if (campaign) {
          await storage.updateCampaign(message.campaignId, {
            sentCount: (campaign.sentCount || 0) + 1,
            failureCount: (campaign.failureCount || 0) + 1
          });
        }
      }

      // Broadcast failure
      this.broadcast?.({
        type: 'message_failed',
        messageId: message.id,
        phone: message.phone,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  async getQueueStats(): Promise<any> {
    const stats = {
      totalQueued: 0,
      processing: 0,
      bySession: {} as Record<number, { queued: number; processing: boolean }>
    };

    for (const [sessionId, queue] of this.queues.entries()) {
      stats.totalQueued += queue.queue.length;
      if (queue.processing) {
        stats.processing++;
      }

      stats.bySession[sessionId] = {
        queued: queue.queue.length,
        processing: queue.processing
      };
    }

    return stats;
  }

  // Send bulk messages
  async sendBulkMessages(
    sessionId: number,
    phones: string[],
    content: string,
    type: string = 'text',
    mediaUrl?: string,
    campaignId?: number
  ): Promise<{ queued: number; messages: Message[] }> {
    const messages: Message[] = [];

    for (const phone of phones) {
      try {
        const messageData = {
          sessionId,
          campaignId,
          type,
          content,
          mediaUrl,
          phone,
          status: 'pending' as const
        };

        const message = await storage.createMessage(messageData);
        messages.push(message);
        this.queueMessage(message);
      } catch (error) {
        console.error(`Failed to create message for ${phone}:`, error);
      }
    }

    return {
      queued: messages.length,
      messages
    };
  }
}

export const messageService = new MessageService();
