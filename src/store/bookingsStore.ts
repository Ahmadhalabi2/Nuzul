import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BookingStatus =
  | 'pending_admin'
  | 'cancelled_by_admin'
  | 'cancelled_by_user'
  | 'accepted_waiting_payment'
  | 'paid_confirmed'
  | 'completed';

export interface Booking {
  id: string;
  userId: string;
  userEmail?: string;          // نحتاجه لإرسال إيميل التأكيد
  userName: string;
  hotelId: number;
  hotelName: string;
  country: string;
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  amount: number;
  status: BookingStatus;
  createdAt: number;
  decidedAt?: number;
  paidAt?: number;
  decidedById?: string;
  decidedByName?: string;
  paymentNotifiedAt?: number;
  reason?: string;
}

interface BookingsState {
  bookings: Booking[];

  createBooking: (payload: Omit<Booking, 'id' | 'createdAt' | 'status' | 'decidedAt' | 'paidAt'>) => Booking;
  cancelByUser:  (bookingId: string) => { success: boolean; message: string };

  adminAccept:       (bookingId: string, actor: { id: string; name: string }) => { success: boolean; message: string };
  adminCancel:       (bookingId: string, actor: { id: string; name: string }, reason: string) => { success: boolean; message: string };
  adminMarkPaid:     (bookingId: string, actor: { id: string; name: string }) => { success: boolean; message: string };
  adminMarkCompleted:(bookingId: string, actor: { id: string; name: string }) => { success: boolean; message: string };
  deleteBookingCompletely: (bookingId: string) => { success: boolean; message: string };
}

export const useBookingsStore = create<BookingsState>()(
  persist(
    (set, get) => ({
      bookings: [],

      createBooking: (payload) => {
        const booking: Booking = {
          ...payload,
          id: 'BK-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
          createdAt: Date.now(),
          status: 'pending_admin',
        };
        set((s) => ({ bookings: [booking, ...s.bookings] }));
        return booking;
      },

      cancelByUser: (bookingId) => {
        const b = get().bookings.find((x) => x.id === bookingId);
        if (!b) return { success: false, message: 'الحجز غير موجود.' };
        if (b.status !== 'pending_admin' && b.status !== 'accepted_waiting_payment')
          return { success: false, message: 'لا يمكن إلغاء الحجز بحالته الحالية.' };
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === bookingId ? { ...x, status: 'cancelled_by_user', decidedAt: Date.now() } : x
          ),
        }));
        return { success: true, message: 'تم إلغاء الحجز.' };
      },

      adminAccept: (bookingId, actor) => {
        const b = get().bookings.find((x) => x.id === bookingId);
        if (!b) return { success: false, message: 'Booking not found.' };
        if (b.status !== 'pending_admin') return { success: false, message: 'Booking is not pending.' };
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === bookingId
              ? { ...x, status: 'accepted_waiting_payment', decidedAt: Date.now(), decidedById: actor.id, decidedByName: actor.name }
              : x
          ),
        }));
        return { success: true, message: 'Booking accepted.' };
      },

      adminCancel: (bookingId, actor, reason) => {
        const b = get().bookings.find((x) => x.id === bookingId);
        if (!b) return { success: false, message: 'Booking not found.' };
        if (b.status !== 'pending_admin' && b.status !== 'accepted_waiting_payment')
          return { success: false, message: 'Cannot cancel at current status.' };
        if (!reason?.trim()) return { success: false, message: 'Reason is required.' };
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === bookingId
              ? { ...x, status: 'cancelled_by_admin', decidedAt: Date.now(), decidedById: actor.id, decidedByName: actor.name, reason: reason.trim() }
              : x
          ),
        }));
        return { success: true, message: 'Booking cancelled.' };
      },

      adminMarkPaid: (bookingId, actor) => {
        const b = get().bookings.find((x) => x.id === bookingId);
        if (!b) return { success: false, message: 'Booking not found.' };
        if (b.status !== 'accepted_waiting_payment') return { success: false, message: 'Payment not allowed.' };
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === bookingId
              ? { ...x, status: 'paid_confirmed', paidAt: Date.now(), decidedById: actor.id, decidedByName: actor.name }
              : x
          ),
        }));
        return { success: true, message: 'Payment confirmed.' };
      },

      adminMarkCompleted: (bookingId, actor) => {
        const b = get().bookings.find((x) => x.id === bookingId);
        if (!b) return { success: false, message: 'Booking not found.' };
        if (b.status !== 'paid_confirmed') return { success: false, message: 'Only paid bookings can be completed.' };
        set((s) => ({
          bookings: s.bookings.map((x) =>
            x.id === bookingId
              ? { ...x, status: 'completed', decidedAt: Date.now(), decidedById: actor.id, decidedByName: actor.name }
              : x
          ),
        }));
        return { success: true, message: 'Booking completed.' };
      },

      deleteBookingCompletely: (bookingId) => {
        if (!get().bookings.some((b) => b.id === bookingId))
          return { success: false, message: 'Booking not found.' };
        set((s) => ({ bookings: s.bookings.filter((b) => b.id !== bookingId) }));
        return { success: true, message: 'Booking deleted.' };
      },
    }),
    { name: 'stay-bookings' }
  )
);
