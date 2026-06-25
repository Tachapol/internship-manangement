// Shared API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// WebSocket Event Payloads
export interface AttendanceEventPayload {
  userId: string;
  userName: string;
  timestamp: string;
  action: 'CHECK_IN' | 'CHECK_OUT';
}

export interface NotificationEventPayload {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'ATTENDANCE' | 'LEAVE';
  createdAt: string;
}

// User Profiles
export interface SharedUserProfile {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'BD_TEAM' | 'MENTOR' | 'STUDENT';
  companyId?: string;
}
