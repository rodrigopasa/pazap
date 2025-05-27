import cron from 'node-cron';
import { storage } from '../storage';
import { messageService } from './messageService';
import { campaignService } from './campaignService';

class ScheduleService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  initializeCronJobs() {
    // Process scheduled messages every minute
    const scheduledMessagesJob = cron.schedule('* * * * *', async () => {
      await this.processScheduledMessages();
    }, {
      scheduled: false
    });

    // Birthday campaign check daily at 9 AM
    const birthdayJob = cron.schedule('0 9 * * *', async () => {
      await this.processBirthdayCampaigns();
    }, {
      scheduled: false
    });

    // Campaign completion check every 5 minutes
    const campaignCheckJob = cron.schedule('*/5 * * * *', async () => {
      await this.checkActiveCampaigns();
    }, {
      scheduled: false
    });

    // Start all jobs
    scheduledMessagesJob.start();
    birthdayJob.start();
    campaignCheckJob.start();

    this.jobs.set('scheduled_messages', scheduledMessagesJob);
    this.jobs.set('birthday_campaigns', birthdayJob);
    this.jobs.set('campaign_check', campaignCheckJob);

    console.log('Cron jobs initialized');
  }

  private async processScheduledMessages(): Promise<void> {
    try {
      const pendingMessages = await storage.getPendingScheduledMessages();
      
      for (const message of pendingMessages) {
        messageService.queueMessage(message);
        
        await storage.createLog({
          level: 'info',
          source: 'scheduler',
          message: `Scheduled message ${message.id} queued for delivery`,
          metadata: { messageId: message.id, phone: message.phone },
          sessionId: message.sessionId
        });
      }

      if (pendingMessages.length > 0) {
        console.log(`Queued ${pendingMessages.length} scheduled messages`);
      }
    } catch (error) {
      console.error('Error processing scheduled messages:', error);
      
      await storage.createLog({
        level: 'error',
        source: 'scheduler',
        message: 'Failed to process scheduled messages',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  private async processBirthdayCampaigns(): Promise<void> {
    try {
      // Get today's birthdays
      const todayBirthdays = await storage.getTodayBirthdays();
      
      if (todayBirthdays.length === 0) {
        console.log('No birthdays today');
        return;
      }

      console.log(`Found ${todayBirthdays.length} birthdays today`);

      // Get all birthday campaigns
      const campaigns = await storage.getCampaigns(1); // TODO: Support multiple users
      const birthdayCampaigns = campaigns.filter(c => c.type === 'birthday' && c.status === 'active');

      for (const campaign of birthdayCampaigns) {
        try {
          await campaignService.startCampaign(campaign);
          
          await storage.createLog({
            level: 'info',
            source: 'scheduler',
            message: `Birthday campaign ${campaign.name} executed`,
            metadata: { campaignId: campaign.id, birthdayCount: todayBirthdays.length },
            userId: campaign.userId
          });
        } catch (error) {
          console.error(`Error executing birthday campaign ${campaign.id}:`, error);
          
          await storage.createLog({
            level: 'error',
            source: 'scheduler',
            message: `Failed to execute birthday campaign ${campaign.name}`,
            metadata: { 
              campaignId: campaign.id, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            },
            userId: campaign.userId
          });
        }
      }
    } catch (error) {
      console.error('Error processing birthday campaigns:', error);
      
      await storage.createLog({
        level: 'error',
        source: 'scheduler',
        message: 'Failed to process birthday campaigns',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  private async checkActiveCampaigns(): Promise<void> {
    try {
      const campaigns = await storage.getCampaigns(1); // TODO: Support multiple users
      const activeCampaigns = campaigns.filter(c => c.status === 'active');

      for (const campaign of activeCampaigns) {
        await campaignService.checkCampaignCompletion(campaign.id);
      }
    } catch (error) {
      console.error('Error checking active campaigns:', error);
      
      await storage.createLog({
        level: 'error',
        source: 'scheduler',
        message: 'Failed to check active campaigns',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  // Schedule a custom job
  scheduleJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      this.jobs.get(name)?.destroy();
    }

    const job = cron.schedule(cronExpression, task, { scheduled: false });
    job.start();
    this.jobs.set(name, job);
    
    console.log(`Scheduled job '${name}' with expression '${cronExpression}'`);
  }

  // Remove a scheduled job
  removeJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.destroy();
      this.jobs.delete(name);
      console.log(`Removed job '${name}'`);
    }
  }

  // Get job status
  getJobStatus(): any {
    const status: any = {};
    
    for (const [name, job] of this.jobs.entries()) {
      status[name] = {
        running: job.running || false,
        lastExecution: job.lastDate?.() || null,
        nextExecution: job.nextDate?.() || null
      };
    }
    
    return status;
  }
}

export const scheduleService = new ScheduleService();
