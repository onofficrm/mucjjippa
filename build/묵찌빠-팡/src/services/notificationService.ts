import { Notification } from '../types';
import { apiClient } from '../api';

export interface NotificationService {
  getNotifications: () => Promise<Notification[]>;
  getUnreadCount: () => Promise<number>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
}

class NotificationServiceImpl implements NotificationService {
  public async getNotifications(): Promise<Notification[]> {
    return apiClient.get<Notification[]>('/notifications');
  }

  public async getUnreadCount(): Promise<number> {
    const list = await this.getNotifications();
    return list.filter((item) => !item.read).length;
  }

  public async markAsRead(id: string): Promise<boolean> {
    const result = await apiClient.post<{ success: boolean }>(`/notifications/${id}/read`);
    return result.success;
  }

  public async markAllAsRead(): Promise<boolean> {
    const result = await apiClient.post<{ success: boolean }>('/notifications/read-all');
    return result.success;
  }
}

export const notificationService = new NotificationServiceImpl();
