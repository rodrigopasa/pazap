import { Campaign, Message } from '@shared/schema';
import { storage } from '../storage';
import { messageService } from './messageService';

class CampaignService {
  async startCampaign(campaign: Campaign): Promise<void> {
    try {
      // Update campaign status
      await storage.updateCampaign(campaign.id, {
        status: 'active',
        startedAt: new Date()
      });

      if (campaign.type === 'bulk') {
        await this.processBulkCampaign(campaign);
      } else if (campaign.type === 'birthday') {
        await this.processBirthdayCampaign(campaign);
      }

      await storage.createLog({
        level: 'info',
        source: 'campaign_service',
        message: `Campaign ${campaign.name} started`,
        metadata: { campaignId: campaign.id, type: campaign.type },
        userId: campaign.userId
      });

    } catch (error) {
      await storage.updateCampaign(campaign.id, {
        status: 'draft' // Reset to draft on error
      });

      await storage.createLog({
        level: 'error',
        source: 'campaign_service',
        message: `Failed to start campaign ${campaign.name}`,
        metadata: { campaignId: campaign.id, error: error instanceof Error ? error.message : 'Unknown error' },
        userId: campaign.userId
      });

      throw error;
    }
  }

  private async processBulkCampaign(campaign: Campaign): Promise<void> {
    // Get contacts for the campaign
    const contacts = await storage.getContacts(campaign.userId);
    
    if (contacts.length === 0) {
      throw new Error('No contacts found for bulk campaign');
    }

    // Get active session for the user
    const sessions = await storage.getSessions(campaign.userId);
    const activeSession = sessions.find(s => s.status === 'connected');
    
    if (!activeSession) {
      throw new Error('No active session found for campaign');
    }

    // Update campaign target count
    await storage.updateCampaign(campaign.id, {
      targetCount: contacts.length
    });

    // Send messages
    const phones = contacts.map(c => c.phone);
    await messageService.sendBulkMessages(
      activeSession.id,
      phones,
      campaign.messageTemplate || '',
      'text',
      campaign.mediaUrl || undefined,
      campaign.id
    );
  }

  private async processBirthdayCampaign(campaign: Campaign): Promise<void> {
    // Get today's birthdays
    const birthdays = await storage.getTodayBirthdays();
    
    if (birthdays.length === 0) {
      console.log('No birthdays today for campaign');
      return;
    }

    // Get active session for the user
    const sessions = await storage.getSessions(campaign.userId);
    const activeSession = sessions.find(s => s.status === 'connected');
    
    if (!activeSession) {
      throw new Error('No active session found for birthday campaign');
    }

    // Update campaign target count
    await storage.updateCampaign(campaign.id, {
      targetCount: birthdays.length
    });

    // Prepare personalized messages
    const phones = birthdays.map(b => b.phone);
    let messageTemplate = campaign.messageTemplate || 'Feliz aniversário! 🎉';

    // Send messages
    await messageService.sendBulkMessages(
      activeSession.id,
      phones,
      messageTemplate,
      'text',
      campaign.mediaUrl || undefined,
      campaign.id
    );
  }

  async pauseCampaign(campaignId: number): Promise<void> {
    await storage.updateCampaign(campaignId, {
      status: 'paused'
    });

    await storage.createLog({
      level: 'info',
      source: 'campaign_service',
      message: `Campaign ${campaignId} paused`,
      metadata: { campaignId }
    });
  }

  async completeCampaign(campaignId: number): Promise<void> {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await storage.updateCampaign(campaignId, {
      status: 'completed',
      completedAt: new Date()
    });

    // Create completion notification
    await storage.createNotification({
      userId: campaign.userId,
      type: 'success',
      title: 'Campanha Concluída',
      message: `A campanha "${campaign.name}" foi concluída com sucesso. ${campaign.successCount}/${campaign.targetCount} mensagens enviadas.`,
      metadata: { campaignId }
    });

    await storage.createLog({
      level: 'info',
      source: 'campaign_service',
      message: `Campaign ${campaign.name} completed`,
      metadata: { 
        campaignId, 
        targetCount: campaign.targetCount,
        successCount: campaign.successCount,
        failureCount: campaign.failureCount
      },
      userId: campaign.userId
    });
  }

  async getCampaignStats(campaignId: number): Promise<any> {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get campaign messages
    const messages = await storage.getMessages();
    const campaignMessages = messages.filter(m => m.campaignId === campaignId);

    const stats = {
      total: campaignMessages.length,
      sent: campaignMessages.filter(m => m.status === 'sent').length,
      delivered: campaignMessages.filter(m => m.status === 'delivered').length,
      failed: campaignMessages.filter(m => m.status === 'failed').length,
      pending: campaignMessages.filter(m => m.status === 'pending').length,
      successRate: 0
    };

    if (stats.sent > 0) {
      stats.successRate = (stats.delivered / stats.sent) * 100;
    }

    return stats;
  }

  // Auto-check for campaign completion
  async checkCampaignCompletion(campaignId: number): Promise<void> {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign || campaign.status !== 'active') {
      return;
    }

    const messages = await storage.getMessages();
    const campaignMessages = messages.filter(m => m.campaignId === campaignId);
    const pendingMessages = campaignMessages.filter(m => m.status === 'pending');

    // If no pending messages and we have sent all targets
    if (pendingMessages.length === 0 && campaign.sentCount >= (campaign.targetCount || 0)) {
      await this.completeCampaign(campaignId);
    }
  }
}

export const campaignService = new CampaignService();
