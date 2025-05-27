import { 
  users, sessions, messages, campaigns, birthdays, groups, groupMembers, 
  contacts, notifications, logs, settings,
  type User, type InsertUser, type Session, type InsertSession,
  type Message, type InsertMessage, type Campaign, type InsertCampaign,
  type Birthday, type InsertBirthday, type Group, type InsertGroup,
  type Contact, type InsertContact, type Notification, type InsertNotification,
  type Log, type Setting, type InsertSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Sessions
  getSessions(userId: number): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  getSessionBySessionId(sessionId: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, updates: Partial<Session>): Promise<Session>;
  deleteSession(id: number): Promise<void>;

  // Messages
  getMessages(sessionId?: number, limit?: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message>;
  getMessageStats(userId: number): Promise<any>;
  getPendingScheduledMessages(): Promise<Message[]>;

  // Campaigns
  getCampaigns(userId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: number): Promise<void>;

  // Birthdays
  getBirthdays(campaignId?: number): Promise<Birthday[]>;
  getTodayBirthdays(): Promise<Birthday[]>;
  createBirthday(birthday: InsertBirthday): Promise<Birthday>;
  deleteBirthday(id: number): Promise<void>;

  // Groups
  getGroups(sessionId: number): Promise<Group[]>;
  getGroup(id: number): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, updates: Partial<Group>): Promise<Group>;
  deleteGroup(id: number): Promise<void>;

  // Contacts
  getContacts(userId: number): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  createContacts(contacts: InsertContact[]): Promise<Contact[]>;
  deleteContact(id: number): Promise<void>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;

  // Logs
  getLogs(filters?: any): Promise<Log[]>;
  createLog(log: Omit<Log, 'id' | 'createdAt'>): Promise<Log>;

  // Dashboard stats
  getDashboardStats(userId: number): Promise<any>;

  // Reports
  getReportsOverview(userId: number, range: string): Promise<any>;
  getReportsChart(userId: number, range: string, sessionId?: number): Promise<any[]>;
  getReportsSessionStats(userId: number, range: string): Promise<any[]>;
  getReportsCampaignStats(userId: number, range: string): Promise<any[]>;
  getReportsExport(userId: number, range: string, sessionId?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Helper method to get date range
  private getDateRange(range: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
    return { startDate, endDate };
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Sessions
  async getSessions(userId: number): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt));
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getSessionBySessionId(sessionId: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId));
    return session || undefined;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: number, updates: Partial<Session>): Promise<Session> {
    const [session] = await db.update(sessions).set(updates).where(eq(sessions.id, id)).returning();
    return session;
  }

  async deleteSession(id: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  // Messages
  async getMessages(sessionId?: number, limit: number = 100): Promise<Message[]> {
    let query = db.select().from(messages);
    
    if (sessionId) {
      query = query.where(eq(messages.sessionId, sessionId));
    }
    
    return await query.orderBy(desc(messages.createdAt)).limit(limit);
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message> {
    const [message] = await db.update(messages).set(updates).where(eq(messages.id, id)).returning();
    return message;
  }

  async getMessageStats(userId: number): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const userSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
    const sessionIds = userSessions.map(s => s.id);

    if (sessionIds.length === 0) {
      return {
        messagesToday: 0,
        totalSent: 0,
        successRate: 0,
        pending: 0
      };
    }

    const [statsResult] = await db.select({
      messagesToday: count(),
      totalSent: sql<number>`count(case when status = 'sent' then 1 end)`,
      totalDelivered: sql<number>`count(case when status = 'delivered' then 1 end)`,
      totalFailed: sql<number>`count(case when status = 'failed' then 1 end)`,
      pending: sql<number>`count(case when status = 'pending' then 1 end)`
    }).from(messages).where(
      and(
        sql`session_id = ANY(${sessionIds})`,
        gte(messages.createdAt, today)
      )
    );

    const successRate = statsResult.totalSent > 0 
      ? ((statsResult.totalDelivered / statsResult.totalSent) * 100) 
      : 0;

    return {
      messagesToday: statsResult.messagesToday,
      totalSent: statsResult.totalSent,
      successRate: Math.round(successRate * 100) / 100,
      pending: statsResult.pending
    };
  }

  async getPendingScheduledMessages(): Promise<Message[]> {
    const now = new Date();
    return await db.select().from(messages).where(
      and(
        eq(messages.status, 'pending'),
        lte(messages.scheduledAt, now)
      )
    ).orderBy(messages.scheduledAt);
  }

  // Campaigns
  async getCampaigns(userId: number): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const [campaign] = await db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning();
    return campaign;
  }

  async deleteCampaign(id: number): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Birthdays
  async getBirthdays(campaignId?: number): Promise<Birthday[]> {
    let query = db.select().from(birthdays);
    
    if (campaignId) {
      query = query.where(eq(birthdays.campaignId, campaignId));
    }
    
    return await query.orderBy(birthdays.birthDate);
  }

  async getTodayBirthdays(): Promise<Birthday[]> {
    const today = new Date();
    const todayStr = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    return await db.select().from(birthdays).where(
      and(
        eq(birthdays.birthDate, todayStr),
        eq(birthdays.isActive, true)
      )
    );
  }

  async createBirthday(birthday: InsertBirthday): Promise<Birthday> {
    const [newBirthday] = await db.insert(birthdays).values(birthday).returning();
    return newBirthday;
  }

  async deleteBirthday(id: number): Promise<void> {
    await db.delete(birthdays).where(eq(birthdays.id, id));
  }

  // Groups
  async getGroups(sessionId: number): Promise<Group[]> {
    return await db.select().from(groups).where(eq(groups.sessionId, sessionId)).orderBy(desc(groups.createdAt));
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async updateGroup(id: number, updates: Partial<Group>): Promise<Group> {
    const [group] = await db.update(groups).set(updates).where(eq(groups.id, id)).returning();
    return group;
  }

  async deleteGroup(id: number): Promise<void> {
    await db.delete(groups).where(eq(groups.id, id));
  }

  // Contacts
  async getContacts(userId: number): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async createContacts(contactList: InsertContact[]): Promise<Contact[]> {
    return await db.insert(contacts).values(contactList).returning();
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Notifications
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  // Logs
  async getLogs(filters: any = {}): Promise<Log[]> {
    let query = db.select().from(logs);
    
    if (filters.level) {
      query = query.where(eq(logs.level, filters.level));
    }
    
    return await query.orderBy(desc(logs.createdAt)).limit(filters.limit || 100);
  }

  async createLog(log: Omit<Log, 'id' | 'createdAt'>): Promise<Log> {
    const [newLog] = await db.insert(logs).values({
      ...log,
      createdAt: new Date()
    }).returning();
    return newLog;
  }

  // Dashboard stats
  async getDashboardStats(userId: number): Promise<any> {
    try {
      const userSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));
      const activeSessions = userSessions.filter(s => s.status === 'connected').length;
      const totalSessions = userSessions.length;

      const activeCampaignsResult = await db.select({ count: count() }).from(campaigns).where(
        and(
          eq(campaigns.userId, userId),
          eq(campaigns.status, 'active')
        )
      );

      // Simple message count
      const totalMessages = await db.select({ count: count() }).from(messages)
        .where(sql`session_id IN (SELECT id FROM sessions WHERE user_id = ${userId})`);

      const sentMessages = await db.select({ count: count() }).from(messages)
        .where(sql`session_id IN (SELECT id FROM sessions WHERE user_id = ${userId}) AND status IN ('sent', 'delivered')`);

      return {
        sessions: {
          active: activeSessions,
          total: totalSessions
        },
        campaigns: {
          active: activeCampaignsResult[0]?.count || 0
        },
        messages: {
          total: totalMessages[0]?.count || 0,
          sent: sentMessages[0]?.count || 0,
          pending: 0,
          failed: 0
        }
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        sessions: { active: 0, total: 0 },
        campaigns: { active: 0 },
        messages: { total: 0, sent: 0, pending: 0, failed: 0 }
      };
    }
  }

  // Reports
  async getReportsOverview(userId: number, range: string): Promise<any> {
    const { startDate, endDate } = this.getDateRange(range);
    const userSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
    const sessionIds = userSessions.map(s => s.id);

    if (sessionIds.length === 0) {
      return {
        totalSent: 0,
        successRate: 0,
        totalFailed: 0,
        failureRate: 0,
        pending: 0,
        sentGrowth: 0,
        dailyAverage: 0,
        peakDay: 0,
        avgDeliveryTime: 0
      };
    }

    const [currentStats] = await db.select({
      totalSent: sql<number>`count(case when status in ('sent', 'delivered') then 1 end)`,
      totalDelivered: sql<number>`count(case when status = 'delivered' then 1 end)`,
      totalFailed: sql<number>`count(case when status = 'failed' then 1 end)`,
      pending: sql<number>`count(case when status = 'pending' then 1 end)`,
      total: count()
    }).from(messages).where(
      and(
        sessionIds.length === 1 ? eq(messages.sessionId, sessionIds[0]) : sql`session_id IN (${sessionIds.join(',')})`,
        gte(messages.createdAt, startDate),
        lte(messages.createdAt, endDate)
      )
    );

    // Get previous period for growth calculation
    const prevStartDate = new Date(startDate);
    const prevEndDate = new Date(endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
    prevEndDate.setDate(prevEndDate.getDate() - daysDiff);

    const [prevStats] = await db.select({
      totalSent: sql<number>`count(case when status in ('sent', 'delivered') then 1 end)`
    }).from(messages).where(
      and(
        sql`session_id = ANY(${sessionIds})`,
        gte(messages.createdAt, prevStartDate),
        lte(messages.createdAt, prevEndDate)
      )
    );

    const successRate = currentStats.totalSent > 0 
      ? (currentStats.totalDelivered / currentStats.totalSent) * 100 
      : 0;

    const failureRate = currentStats.total > 0 
      ? (currentStats.totalFailed / currentStats.total) * 100 
      : 0;

    const sentGrowth = prevStats.totalSent > 0 
      ? ((currentStats.totalSent - prevStats.totalSent) / prevStats.totalSent) * 100 
      : 0;

    const dailyAverage = daysDiff > 0 ? currentStats.totalSent / daysDiff : 0;

    return {
      totalSent: currentStats.totalSent,
      successRate: Math.round(successRate * 10) / 10,
      totalFailed: currentStats.totalFailed,
      failureRate: Math.round(failureRate * 10) / 10,
      pending: currentStats.pending,
      sentGrowth: Math.round(sentGrowth * 10) / 10,
      dailyAverage: Math.round(dailyAverage),
      peakDay: currentStats.totalSent, // Simplified - would need daily breakdown for real peak
      avgDeliveryTime: 2.5 // Mock value - would need to calculate from sentAt - createdAt
    };
  }

  async getReportsChart(userId: number, range: string, sessionId?: number): Promise<any[]> {
    const { startDate, endDate } = this.getDateRange(range);
    let sessionIds: number[];

    if (sessionId) {
      sessionIds = [sessionId];
    } else {
      const userSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
      sessionIds = userSessions.map(s => s.id);
    }

    if (sessionIds.length === 0) {
      return [];
    }

    // Generate daily data points
    const chartData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayStats] = await db.select({
        sent: sql<number>`count(case when status in ('sent', 'delivered') then 1 end)`,
        delivered: sql<number>`count(case when status = 'delivered' then 1 end)`,
        failed: sql<number>`count(case when status = 'failed' then 1 end)`
      }).from(messages).where(
        and(
          sql`session_id = ANY(${sessionIds})`,
          gte(messages.createdAt, dayStart),
          lte(messages.createdAt, dayEnd)
        )
      );

      chartData.push({
        date: currentDate.toISOString().split('T')[0],
        sent: dayStats.sent,
        delivered: dayStats.delivered,
        failed: dayStats.failed
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return chartData;
  }

  async getReportsSessionStats(userId: number, range: string): Promise<any[]> {
    const { startDate, endDate } = this.getDateRange(range);
    const userSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));

    const sessionStats = [];

    for (const session of userSessions) {
      const [stats] = await db.select({
        totalMessages: count(),
        sent: sql<number>`count(case when status in ('sent', 'delivered') then 1 end)`,
        delivered: sql<number>`count(case when status = 'delivered' then 1 end)`
      }).from(messages).where(
        and(
          eq(messages.sessionId, session.id),
          gte(messages.createdAt, startDate),
          lte(messages.createdAt, endDate)
        )
      );

      const successRate = stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;

      sessionStats.push({
        sessionId: session.id,
        sessionName: session.name,
        totalMessages: stats.totalMessages,
        successRate: Math.round(successRate * 10) / 10,
        isConnected: session.status === 'connected'
      });
    }

    return sessionStats;
  }

  async getReportsCampaignStats(userId: number, range: string): Promise<any[]> {
    const { startDate, endDate } = this.getDateRange(range);
    const userCampaigns = await db.select().from(campaigns).where(
      and(
        eq(campaigns.userId, userId),
        gte(campaigns.createdAt, startDate),
        lte(campaigns.createdAt, endDate)
      )
    );

    const campaignStats = userCampaigns.map(campaign => {
      const successRate = campaign.sentCount > 0 
        ? (campaign.successCount / campaign.sentCount) * 100 
        : 0;

      return {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        targetCount: campaign.targetCount || 0,
        sentCount: campaign.sentCount || 0,
        successCount: campaign.successCount || 0,
        failureCount: campaign.failureCount || 0,
        successRate: Math.round(successRate * 10) / 10
      };
    });

    return campaignStats;
  }

  async getReportsExport(userId: number, range: string, sessionId?: number): Promise<any[]> {
    // Reuse the chart data for export
    return await this.getReportsChart(userId, range, sessionId);
  }
}

export const storage = new DatabaseStorage();
