import { storage } from "../storage";

interface RateLimitConfig {
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
  maxMessagesPerDay: number;
  minDelayBetweenMessages: number; // em milissegundos
  maxDelayBetweenMessages: number;
  burstLimit: number; // máximo de mensagens em sequência
  cooldownAfterBurst: number; // tempo de espera após burst (ms)
}

interface SessionStats {
  messagesLastMinute: number;
  messagesLastHour: number;
  messagesLastDay: number;
  lastMessageTime: number;
  consecutiveMessages: number;
  lastBurstTime: number;
  warningCount: number;
  isThrottled: boolean;
  throttledUntil: number;
}

class RateLimiterService {
  private sessionStats: Map<number, SessionStats> = new Map();
  
  // Configurações conservadoras baseadas nas melhores práticas
  private defaultConfig: RateLimitConfig = {
    maxMessagesPerMinute: 15,    // WhatsApp permite ~20, usamos 15 para segurança
    maxMessagesPerHour: 200,     // Limite conservador
    maxMessagesPerDay: 1000,     // Para contas business
    minDelayBetweenMessages: 3000,  // 3 segundos mínimo
    maxDelayBetweenMessages: 8000,  // 8 segundos máximo
    burstLimit: 5,               // Máximo 5 mensagens seguidas
    cooldownAfterBurst: 30000,   // 30 segundos após burst
  };

  private customConfigs: Map<number, RateLimitConfig> = new Map();

  constructor() {
    // Limpar estatísticas antigas a cada hora
    setInterval(() => this.cleanupOldStats(), 3600000);
  }

  // Configurar limites personalizados para uma sessão
  setCustomConfig(sessionId: number, config: Partial<RateLimitConfig>): void {
    const fullConfig = { ...this.defaultConfig, ...config };
    this.customConfigs.set(sessionId, fullConfig);
    
    this.log(`Configuração personalizada aplicada para sessão ${sessionId}`, {
      sessionId,
      config: fullConfig
    });
  }

  // Verificar se é seguro enviar uma mensagem
  async canSendMessage(sessionId: number): Promise<{
    canSend: boolean;
    waitTime: number;
    reason?: string;
    recommendation?: string;
  }> {
    const config = this.getConfig(sessionId);
    const stats = this.getSessionStats(sessionId);
    const now = Date.now();

    // Verificar se está sob throttling
    if (stats.isThrottled && now < stats.throttledUntil) {
      return {
        canSend: false,
        waitTime: stats.throttledUntil - now,
        reason: "Sessão temporariamente limitada por segurança",
        recommendation: "Aguarde o período de cooldown"
      };
    }

    // Resetar throttling se o período passou
    if (stats.isThrottled && now >= stats.throttledUntil) {
      stats.isThrottled = false;
      stats.throttledUntil = 0;
      stats.warningCount = Math.max(0, stats.warningCount - 1);
    }

    // Atualizar contadores baseados no tempo
    this.updateTimeBasedCounters(stats, now);

    // Verificar limites
    const checks = [
      {
        condition: stats.messagesLastMinute >= config.maxMessagesPerMinute,
        reason: "Limite por minuto excedido",
        waitTime: 60000,
        severity: "high"
      },
      {
        condition: stats.messagesLastHour >= config.maxMessagesPerHour,
        reason: "Limite por hora excedido", 
        waitTime: 3600000,
        severity: "critical"
      },
      {
        condition: stats.messagesLastDay >= config.maxMessagesPerDay,
        reason: "Limite diário excedido",
        waitTime: 86400000,
        severity: "critical"
      },
      {
        condition: stats.consecutiveMessages >= config.burstLimit,
        reason: "Muitas mensagens consecutivas",
        waitTime: config.cooldownAfterBurst,
        severity: "medium"
      }
    ];

    for (const check of checks) {
      if (check.condition) {
        this.handleViolation(sessionId, check.reason, check.severity as any);
        
        return {
          canSend: false,
          waitTime: check.waitTime,
          reason: check.reason,
          recommendation: this.getRecommendation(check.severity as any)
        };
      }
    }

    // Calcular delay necessário entre mensagens
    const timeSinceLastMessage = now - stats.lastMessageTime;
    const requiredDelay = this.calculateDelay(config, stats);
    
    if (timeSinceLastMessage < requiredDelay) {
      return {
        canSend: false,
        waitTime: requiredDelay - timeSinceLastMessage,
        reason: "Aguardando intervalo mínimo entre mensagens",
        recommendation: "Isso mantém sua conta segura"
      };
    }

    return { canSend: true, waitTime: 0 };
  }

  // Registrar que uma mensagem foi enviada
  async recordMessageSent(sessionId: number): Promise<void> {
    const stats = this.getSessionStats(sessionId);
    const now = Date.now();

    stats.messagesLastMinute++;
    stats.messagesLastHour++;
    stats.messagesLastDay++;
    stats.lastMessageTime = now;

    // Verificar se é uma mensagem consecutiva (menos de 30 segundos da anterior)
    if (now - stats.lastMessageTime < 30000) {
      stats.consecutiveMessages++;
    } else {
      stats.consecutiveMessages = 1;
    }

    // Log para auditoria
    await this.createAuditLog(sessionId, 'message_sent', {
      stats: { ...stats },
      timestamp: now
    });
  }

  // Registrar erro de envio para ajustar algoritmo
  async recordSendError(sessionId: number, error: string): Promise<void> {
    const stats = this.getSessionStats(sessionId);
    
    // Detectar possíveis sinais de rate limiting do WhatsApp
    if (this.isRateLimitError(error)) {
      stats.warningCount++;
      
      if (stats.warningCount >= 3) {
        // Aplicar throttling preventivo
        stats.isThrottled = true;
        stats.throttledUntil = Date.now() + (15 * 60 * 1000); // 15 minutos
        
        this.log(`Sessão ${sessionId} colocada em throttling preventivo`, {
          sessionId,
          warningCount: stats.warningCount,
          error
        });
      }
    }

    await this.createAuditLog(sessionId, 'send_error', {
      error,
      warningCount: stats.warningCount,
      timestamp: Date.now()
    });
  }

  // Obter estatísticas da sessão
  getSessionInfo(sessionId: number): any {
    const config = this.getConfig(sessionId);
    const stats = this.getSessionStats(sessionId);
    
    return {
      config,
      stats,
      status: stats.isThrottled ? 'throttled' : 'normal',
      health: this.calculateHealthScore(stats, config)
    };
  }

  private getConfig(sessionId: number): RateLimitConfig {
    return this.customConfigs.get(sessionId) || this.defaultConfig;
  }

  private getSessionStats(sessionId: number): SessionStats {
    if (!this.sessionStats.has(sessionId)) {
      this.sessionStats.set(sessionId, {
        messagesLastMinute: 0,
        messagesLastHour: 0,
        messagesLastDay: 0,
        lastMessageTime: 0,
        consecutiveMessages: 0,
        lastBurstTime: 0,
        warningCount: 0,
        isThrottled: false,
        throttledUntil: 0
      });
    }
    return this.sessionStats.get(sessionId)!;
  }

  private updateTimeBasedCounters(stats: SessionStats, now: number): void {
    // Reset contadores baseados no tempo
    if (now - stats.lastMessageTime > 60000) {
      stats.messagesLastMinute = 0;
    }
    if (now - stats.lastMessageTime > 3600000) {
      stats.messagesLastHour = 0;
    }
    if (now - stats.lastMessageTime > 86400000) {
      stats.messagesLastDay = 0;
    }
  }

  private calculateDelay(config: RateLimitConfig, stats: SessionStats): number {
    // Algoritmo adaptativo baseado no histórico
    let baseDelay = config.minDelayBetweenMessages;
    
    // Aumentar delay se muitas mensagens consecutivas
    if (stats.consecutiveMessages > 2) {
      baseDelay *= (1 + stats.consecutiveMessages * 0.2);
    }
    
    // Aumentar delay se muitos warnings
    if (stats.warningCount > 0) {
      baseDelay *= (1 + stats.warningCount * 0.5);
    }
    
    // Adicionar randomização para parecer mais humano
    const randomFactor = 0.8 + Math.random() * 0.4; // 80% - 120%
    baseDelay *= randomFactor;
    
    return Math.min(baseDelay, config.maxDelayBetweenMessages);
  }

  private handleViolation(sessionId: number, reason: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const stats = this.getSessionStats(sessionId);
    stats.warningCount++;

    this.log(`Violação detectada na sessão ${sessionId}`, {
      sessionId,
      reason,
      severity,
      warningCount: stats.warningCount
    });

    // Aplicar throttling baseado na severidade
    if (severity === 'critical') {
      stats.isThrottled = true;
      stats.throttledUntil = Date.now() + (30 * 60 * 1000); // 30 minutos
    } else if (severity === 'high' && stats.warningCount >= 2) {
      stats.isThrottled = true;
      stats.throttledUntil = Date.now() + (10 * 60 * 1000); // 10 minutos
    }
  }

  private getRecommendation(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const recommendations = {
      low: "Continue monitorando o volume de envios",
      medium: "Considere reduzir a frequência de envios",
      high: "Recomendado pausar envios por alguns minutos",
      critical: "Pausa obrigatória para proteger a conta"
    };
    return recommendations[severity];
  }

  private isRateLimitError(error: string): boolean {
    const rateLimitIndicators = [
      'rate limit',
      'too many requests',
      'temporary ban',
      'spam detected',
      'blocked',
      'restricted'
    ];
    
    return rateLimitIndicators.some(indicator => 
      error.toLowerCase().includes(indicator)
    );
  }

  private calculateHealthScore(stats: SessionStats, config: RateLimitConfig): number {
    let score = 100;
    
    // Penalizar por warnings
    score -= stats.warningCount * 10;
    
    // Penalizar por uso próximo dos limites
    const minuteUsage = (stats.messagesLastMinute / config.maxMessagesPerMinute) * 100;
    const hourUsage = (stats.messagesLastHour / config.maxMessagesPerHour) * 100;
    
    if (minuteUsage > 80) score -= 20;
    if (hourUsage > 80) score -= 15;
    
    // Penalizar se está throttled
    if (stats.isThrottled) score -= 30;
    
    return Math.max(0, score);
  }

  private cleanupOldStats(): void {
    const now = Date.now();
    for (const [sessionId, stats] of this.sessionStats.entries()) {
      // Remover estatísticas de sessões inativas há mais de 24h
      if (now - stats.lastMessageTime > 86400000) {
        this.sessionStats.delete(sessionId);
      }
    }
  }

  private async createAuditLog(sessionId: number, action: string, data: any): Promise<void> {
    try {
      await storage.createLog({
        userId: 1, // TODO: pegar userId da sessão
        level: 'info',
        message: `Rate Limiter: ${action}`,
        data: JSON.stringify({ sessionId, action, ...data })
      });
    } catch (error) {
      console.error('Erro ao criar log de auditoria:', error);
    }
  }

  private log(message: string, data?: any): void {
    console.log(`[RateLimit] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

export const rateLimiter = new RateLimiterService();