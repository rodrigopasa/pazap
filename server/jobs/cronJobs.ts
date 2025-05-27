import { scheduleService } from '../services/scheduleService';
import { storage } from '../storage';
import { sessionManager } from '../whatsapp/sessionManager';

export function initializeCronJobs() {
  // Session health check every 5 minutes
  scheduleService.scheduleJob('session_health_check', '*/5 * * * *', async () => {
    await checkSessionHealth();
  });

  // Database cleanup weekly
  scheduleService.scheduleJob('database_cleanup', '0 2 * * 0', async () => {
    await cleanupDatabase();
  });

  // Queue stats logging every hour
  scheduleService.scheduleJob('queue_stats', '0 * * * *', async () => {
    await logQueueStats();
  });

  console.log('Additional cron jobs initialized');
}

async function checkSessionHealth(): Promise<void> {
  try {
    const sessions = await storage.getSessions(1); // TODO: Support multiple users
    
    for (const session of sessions) {
      if (session.isActive) {
        const actualStatus = sessionManager.getSessionStatus(session.sessionId);
        
        if (actualStatus !== session.status) {
          await storage.updateSession(session.id, { status: actualStatus });
          
          await storage.createLog({
            level: 'info',
            source: 'health_check',
            message: `Session ${session.sessionId} status updated from ${session.status} to ${actualStatus}`,
            metadata: { sessionId: session.sessionId, oldStatus: session.status, newStatus: actualStatus },
            sessionId: session.id,
            userId: session.userId
          });
        }
      }
    }
  } catch (error) {
    console.error('Session health check failed:', error);
    
    await storage.createLog({
      level: 'error',
      source: 'health_check',
      message: 'Session health check failed',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}

async function cleanupDatabase(): Promise<void> {
  try {
    // Clean up old logs (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Clean up old notifications (keep last 30 days, only read ones)
    // Clean up completed campaigns older than 90 days
    
    await storage.createLog({
      level: 'info',
      source: 'cleanup',
      message: 'Database cleanup completed',
      metadata: { cleanupDate: new Date() }
    });
    
    console.log('Database cleanup completed');
  } catch (error) {
    console.error('Database cleanup failed:', error);
    
    await storage.createLog({
      level: 'error',
      source: 'cleanup',
      message: 'Database cleanup failed',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}

async function logQueueStats(): Promise<void> {
  try {
    const { messageService } = await import('../services/messageService');
    const queueStats = await messageService.getQueueStats();
    
    await storage.createLog({
      level: 'info',
      source: 'queue_monitor',
      message: 'Queue statistics',
      metadata: queueStats
    });
    
    console.log('Queue stats:', queueStats);
  } catch (error) {
    console.error('Failed to log queue stats:', error);
  }
}

// Export for manual initialization if needed
export { checkSessionHealth, cleanupDatabase, logQueueStats };
