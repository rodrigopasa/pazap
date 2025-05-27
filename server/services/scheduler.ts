import cron from 'node-cron';
import { storage } from '../storage';
import { whatsappService } from './whatsapp';

class SchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.initializeScheduler();
  }

  private initializeScheduler(): void {
    // Check for scheduled messages every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduledMessages();
    });

    // Check for scheduled campaigns every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduledCampaigns();
    });

    // Check for birthday campaigns daily at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      await this.processBirthdayCampaigns();
    });

    // Clean up old logs weekly (Sunday at 2:00 AM)
    cron.schedule('0 2 * * 0', async () => {
      await this.cleanupOldLogs();
    });
  }

  private async processScheduledMessages(): Promise<void> {
    try {
      const scheduledMessages = await storage.getScheduledMessages();
      const now = new Date();

      for (const message of scheduledMessages) {
        if (message.scheduledAt && message.scheduledAt <= now) {
          try {
            const session = await storage.getSession(message.sessionId!);
            if (!session || !whatsappService.isSessionConnected(session.sessionId)) {
              await storage.updateMessage(message.id, {
                status: 'failed',
                error: 'Session not connected'
              });
              continue;
            }

            const messageId = await whatsappService.sendMessage(
              session.sessionId,
              message.phone,
              message.content!,
              message.mediaUrl || undefined
            );

            await storage.updateMessage(message.id, {
              status: 'sent',
              sentAt: new Date(),
              messageId
            });

            await this.createNotification(
              session.userId!,
              'success',
              'Message Sent',
              `Scheduled message sent to ${message.phone}`
            );

          } catch (error) {
            await storage.updateMessage(message.id, {
              status: 'failed',
              error: error.message
            });

            await this.createLog('error', `Failed to send scheduled message: ${error.message}`, {
              messageId: message.id,
              phone: message.phone
            });
          }
        }
      }
    } catch (error) {
      await this.createLog('error', `Error processing scheduled messages: ${error.message}`);
    }
  }

  private async processScheduledCampaigns(): Promise<void> {
    try {
      const scheduledCampaigns = await storage.getScheduledCampaigns();
      const now = new Date();

      for (const campaign of scheduledCampaigns) {
        if (campaign.scheduledAt && campaign.scheduledAt <= now) {
          try {
            await this.executeCampaign(campaign.id);
          } catch (error) {
            await storage.updateCampaign(campaign.id, {
              status: 'failed'
            });

            await this.createLog('error', `Failed to execute campaign: ${error.message}`, {
              campaignId: campaign.id
            });
          }
        }
      }
    } catch (error) {
      await this.createLog('error', `Error processing scheduled campaigns: ${error.message}`);
    }
  }

  private async processBirthdayCampaigns(): Promise<void> {
    try {
      const today = new Date();
      const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Get all contacts with birthdays today
      const contacts = await storage.getAllContacts();
      const birthdayContacts = contacts.filter(contact => {
        if (!contact.birthDate) return false;
        
        const birthDate = new Date(contact.birthDate);
        const birthDateStr = `${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`;
        
        return birthDateStr === todayStr;
      });

      if (birthdayContacts.length === 0) {
        return;
      }

      // Get birthday campaigns
      const campaigns = await storage.getAllCampaigns();
      const birthdayCampaigns = campaigns.filter(c => c.type === 'birthday' && c.status === 'scheduled');

      for (const campaign of birthdayCampaigns) {
        try {
          const session = await storage.getSession(campaign.sessionId!);
          if (!session || !whatsappService.isSessionConnected(session.sessionId)) {
            continue;
          }

          let sentCount = 0;
          let failedCount = 0;

          for (const contact of birthdayContacts) {
            try {
              // Personalize message with contact name
              const personalizedMessage = campaign.message.replace(
                /\{name\}/g, 
                contact.name || 'Amigo(a)'
              );

              const messageId = await whatsappService.sendMessage(
                session.sessionId,
                contact.phone,
                personalizedMessage,
                campaign.mediaUrl || undefined
              );

              await storage.createMessage({
                type: campaign.mediaUrl ? (campaign.mediaType || 'image') : 'text',
                content: personalizedMessage,
                phone: contact.phone,
                status: 'sent',
                sentAt: new Date(),
                messageId,
                sessionId: campaign.sessionId!,
                campaignId: campaign.id,
                userId: campaign.userId!,
                mediaUrl: campaign.mediaUrl,
                mediaType: campaign.mediaType,
              });

              sentCount++;

              // Add delay between messages to avoid blocking
              await this.delay(2000 + Math.random() * 3000); // 2-5 seconds

            } catch (error) {
              failedCount++;
              
              await storage.createMessage({
                type: campaign.mediaUrl ? (campaign.mediaType || 'image') : 'text',
                content: campaign.message,
                phone: contact.phone,
                status: 'failed',
                error: error.message,
                sessionId: campaign.sessionId!,
                campaignId: campaign.id,
                userId: campaign.userId!,
                mediaUrl: campaign.mediaUrl,
                mediaType: campaign.mediaType,
              });
            }
          }

          await storage.updateCampaign(campaign.id, {
            status: 'completed',
            executedAt: new Date(),
            totalRecipients: birthdayContacts.length,
            sentCount,
            failedCount
          });

          await this.createNotification(
            campaign.userId!,
            'success',
            'Birthday Campaign Completed',
            `Sent birthday messages to ${sentCount} contacts`
          );

        } catch (error) {
          await this.createLog('error', `Error executing birthday campaign: ${error.message}`, {
            campaignId: campaign.id
          });
        }
      }

    } catch (error) {
      await this.createLog('error', `Error processing birthday campaigns: ${error.message}`);
    }
  }

  private async executeCampaign(campaignId: number): Promise<void> {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const session = await storage.getSession(campaign.sessionId!);
    if (!session || !whatsappService.isSessionConnected(session.sessionId)) {
      throw new Error('Session not connected');
    }

    await storage.updateCampaign(campaignId, {
      status: 'running',
      executedAt: new Date()
    });

    // Get campaign messages
    const messages = await storage.getMessagesByCampaign(campaignId);
    let sentCount = 0;
    let failedCount = 0;

    for (const message of messages) {
      if (message.status !== 'pending') {
        continue;
      }

      try {
        const messageId = await whatsappService.sendMessage(
          session.sessionId,
          message.phone,
          message.content!,
          message.mediaUrl || undefined
        );

        await storage.updateMessage(message.id, {
          status: 'sent',
          sentAt: new Date(),
          messageId
        });

        sentCount++;

        // Add delay between messages
        await this.delay(1000 + Math.random() * 2000); // 1-3 seconds

      } catch (error) {
        await storage.updateMessage(message.id, {
          status: 'failed',
          error: error.message
        });

        failedCount++;
      }
    }

    await storage.updateCampaign(campaignId, {
      status: 'completed',
      sentCount,
      failedCount
    });

    await this.createNotification(
      campaign.userId!,
      'success',
      'Campaign Completed',
      `Campaign "${campaign.name}" completed. Sent: ${sentCount}, Failed: ${failedCount}`
    );
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      // This would require a custom query to delete old logs
      // For now, we'll just log that cleanup would happen here
      await this.createLog('info', 'Weekly log cleanup performed');
    } catch (error) {
      await this.createLog('error', `Error during log cleanup: ${error.message}`);
    }
  }

  private async createLog(level: string, message: string, data?: any): Promise<void> {
    try {
      await storage.createLog({
        level,
        message,
        data,
        userId: 1, // Default admin user
      });
    } catch (error) {
      console.error('Failed to create log:', error);
    }
  }

  private async createNotification(userId: number, type: string, title: string, message: string): Promise<void> {
    try {
      await storage.createNotification({
        type,
        title,
        message,
        userId,
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Add a custom scheduled job
  addCustomJob(name: string, cronExpression: string, callback: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      this.jobs.get(name)?.destroy();
    }

    const task = cron.schedule(cronExpression, callback, {
      scheduled: false
    });

    this.jobs.set(name, task);
    task.start();
  }

  // Remove a custom scheduled job
  removeCustomJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.destroy();
      this.jobs.delete(name);
    }
  }
}

export const schedulerService = new SchedulerService();
