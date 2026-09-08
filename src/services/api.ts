/**
 * api.ts — Centralized API calls for Nuzul
 * كل الـ fetch calls مركّزة هنا بدل تكرارها في كل مكان
 */

import { BACKEND_URL } from '../config';

const BASE = BACKEND_URL;

// ── Shared Types ──────────────────────────────────────────────────────────────

export interface ApiHotel {
  id: number;
  name: string;
  city: string;
  country: string;
  province_id: number | null;
  province_name: string | null;
  image: string | null;
  image_url: string | null;
  image_lobby: string | null;
  image_exterior: string | null;
  rating: number;
  stars: number;
  price: number;
  price_per_night: number | null;
  amenities: string[];
  offer_text: string | null;
  tag: string | null;
  status: string | null;
}

export interface ApiBooking {
  id: number;
  user_id: number;
  hotel_id: number;
  hotel_name: string;
  city: string;
  country: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  amount: number;
  room_type: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'user';
  created_at: string;
}

/** بيانات الحجز المعروضة في Social Proof Bar — لا تحتوي بيانات حساسة */
export interface RecentBooking {
  hotelName:  string;
  city:       string;
  country:    string;
  guests:     number;
  minutesAgo: number;
}

export function authHeader(): Record<string, string> {
  const token = localStorage.getItem('nuzul_token') ?? '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    ...authHeader(),
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => request<any>('GET', '/api/auth/me'),
};

// ── Hotels ────────────────────────────────────────────────────────────────────
export const hotelsApi = {
  list: () => request<{ success: boolean; hotels: ApiHotel[] }>('GET', '/api/hotels'),

  create: (payload: Omit<ApiHotel, 'id' | 'province_name' | 'image_url'>) =>
    request<{ success: boolean; hotel: ApiHotel }>('POST', '/api/hotels', payload),

  update: (id: number, payload: Partial<Omit<ApiHotel, 'id' | 'province_name' | 'image_url'>>) =>
    request<{ success: boolean; hotel: ApiHotel }>('PUT', `/api/hotels/${id}`, payload),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>('DELETE', `/api/hotels/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => request<{ success: boolean; users: ApiUser[] }>('GET', '/api/auth/users'),
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingsApi = {
  /** public — بدون auth — للـ social proof bar */
  recent: () =>
    fetch(`${BASE}/api/bookings/recent`)
      .then(r => r.json()) as Promise<{ success: boolean; bookings: RecentBooking[] }>,

  list: () => request<{ success: boolean; bookings: ApiBooking[] }>('GET', '/api/bookings'),

  create: (payload: {
    hotel_id: number;
    hotel_name: string;
    country: string;
    city: string;
    check_in: string;
    check_out: string;
    nights: number;
    guests: number;
    amount: number;
    room_type?: string;
    notes?: string;
    guest_name?: string;
    guest_phone?: string;
    guest_email?: string;
  }) => request<any>('POST', '/api/bookings', payload),

  cancel: (id: number, reason?: string) =>
    request<any>('PATCH', `/api/bookings/${id}/cancel`, reason ? { reason } : {}),

  accept: (id: number) =>
    request<any>('PATCH', `/api/bookings/${id}/accept`),

  markPaid: (id: number) =>
    request<any>('PATCH', `/api/bookings/${id}/mark-paid`),

  complete: (id: number) =>
    request<any>('PATCH', `/api/bookings/${id}/complete`),

  delete: (id: number) =>
    request<any>('DELETE', `/api/bookings/${id}`),

  sendConfirmation: (bookingId: number, userEmail: string) =>
    request<any>('POST', '/api/bookings/send-confirmation', { booking_id: bookingId, userEmail }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list:       () => request<any>('GET', '/api/notifications'),
  markRead:   (id: number) => request<any>('PATCH', `/api/notifications/${id}/read`),
  markAllRead: () => request<any>('PATCH', '/api/notifications/read-all'),
  dismiss:    (id: number) => request<any>('DELETE', `/api/notifications/${id}`),
};

// ── Ratings ───────────────────────────────────────────────────────────────────
export const ratingsApi = {
  create: (payload: { booking_id: number; stars: number; comment?: string }) =>
    request<any>('POST', '/api/ratings', payload),
  list: (hotelId: number) =>
    request<any>('GET', `/api/ratings?hotel_id=${hotelId}`),
};

// ── Support ───────────────────────────────────────────────────────────────────
export const supportApi = {
  getThreads:      () => request<any>('GET', '/api/support/threads'),
  ensureThread:    () => request<any>('POST', '/api/support/threads'),
  getMessages:     (threadId: number) => request<any>('GET', `/api/support/threads/${threadId}/messages`),
  sendMessage:     (threadId: number, content: string) =>
    request<any>('POST', `/api/support/threads/${threadId}/messages`, { content }),
  markRead:        (threadId: number) =>
    request<any>('PATCH', `/api/support/threads/${threadId}/read`),
  deleteThread:    (threadId: number) =>
    request<any>('DELETE', `/api/support/threads/${threadId}`),
  getFeedbacks:    () => request<any>('GET', '/api/support/feedbacks'),
  createFeedback:  (message: string) =>
    request<any>('POST', '/api/support/feedbacks', { message }),
  replyFeedback:   (id: number, reply: string) =>
    request<any>('PATCH', `/api/support/feedbacks/${id}/reply`, { reply }),
  markFeedbackRead: (id: number) =>
    request<any>('PATCH', `/api/support/feedbacks/${id}/read`),
};
