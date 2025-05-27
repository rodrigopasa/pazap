import { apiRequest } from './queryClient';

// Session API
export const sessionAPI = {
  getAll: () => fetch('/api/sessions', { credentials: 'include' }).then(r => r.json()),
  
  create: async (data: { name: string; sessionId: string }) => {
    const response = await apiRequest('POST', '/api/sessions', data);
    return response.json();
  },
  
  update: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/sessions/${id}`, data);
    return response.json();
  },
  
  delete: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/sessions/${id}`);
    return response.json();
  },
  
  reconnect: async (id: number) => {
    const response = await apiRequest('POST', `/api/sessions/${id}/reconnect`);
    return response.json();
  }
};

// Message API
export const messageAPI = {
  getAll: (sessionId?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (sessionId) params.append('sessionId', sessionId.toString());
    if (limit) params.append('limit', limit.toString());
    
    return fetch(`/api/messages?${params}`, { credentials: 'include' }).then(r => r.json());
  },
  
  send: async (data: {
    sessionId: number;
    phones: string[];
    content: string;
    type?: string;
    mediaUrl?: string;
    scheduledAt?: string;
  }) => {
    const response = await apiRequest('POST', '/api/messages/send', data);
    return response.json();
  },
  
  quickSend: async (data: { phone: string; content: string; sessionId: number }) => {
    const response = await apiRequest('POST', '/api/messages/quick-send', data);
    return response.json();
  }
};

// Campaign API
export const campaignAPI = {
  getAll: () => fetch('/api/campaigns', { credentials: 'include' }).then(r => r.json()),
  
  create: async (data: any) => {
    // Se for FormData (com arquivo), usar fetch direto
    if (data instanceof FormData) {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        body: data,
        credentials: 'include'
      });
      return response.json();
    }
    
    // Caso contrário, usar apiRequest normal
    const response = await apiRequest('POST', '/api/campaigns', data);
    return response.json();
  },
  
  update: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/campaigns/${id}`, data);
    return response.json();
  },
  
  start: async (id: number) => {
    const response = await apiRequest('POST', `/api/campaigns/${id}/start`);
    return response.json();
  }
};

// Contact API
export const contactAPI = {
  getAll: () => fetch('/api/contacts', { credentials: 'include' }).then(r => r.json()),
  
  uploadCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('csv', file);
    
    const response = await fetch('/api/contacts/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload CSV');
    }
    
    return response.json();
  }
};

// Group API
export const groupAPI = {
  getAll: (sessionId: number) => {
    return fetch(`/api/groups?sessionId=${sessionId}`, { credentials: 'include' }).then(r => r.json());
  },
  
  create: async (data: {
    sessionId: number;
    name: string;
    description?: string;
    members: string[];
  }) => {
    const response = await apiRequest('POST', '/api/groups', data);
    return response.json();
  }
};

// Birthday API
export const birthdayAPI = {
  getAll: (campaignId?: number) => {
    const params = campaignId ? `?campaignId=${campaignId}` : '';
    return fetch(`/api/birthdays${params}`, { credentials: 'include' }).then(r => r.json());
  },
  
  create: async (data: any) => {
    const response = await apiRequest('POST', '/api/birthdays', data);
    return response.json();
  },
  
  uploadCSV: async (file: File, campaignId?: number) => {
    const formData = new FormData();
    formData.append('csv', file);
    if (campaignId) formData.append('campaignId', campaignId.toString());
    
    const response = await fetch('/api/birthdays/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload birthday CSV');
    }
    
    return response.json();
  }
};

// Notification API
export const notificationAPI = {
  getAll: () => fetch('/api/notifications', { credentials: 'include' }).then(r => r.json()),
  
  markAsRead: async (id: number) => {
    const response = await apiRequest('PUT', `/api/notifications/${id}/read`);
    return response.json();
  }
};

// Log API
export const logAPI = {
  getAll: (filters?: { level?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.level) params.append('level', filters.level);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    return fetch(`/api/logs?${params}`, { credentials: 'include' }).then(r => r.json());
  }
};

// Stats API
export const statsAPI = {
  get: () => fetch('/api/stats', { credentials: 'include' }).then(r => r.json())
};
