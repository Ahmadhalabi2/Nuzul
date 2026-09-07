import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BACKEND_URL } from '../config';

export type Role = 'superadmin' | 'support' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password: string;
  avatar?: string | null;
  onboarding_completed?: boolean;
}

const API = `${BACKEND_URL}/api/auth`;
const BACKEND = BACKEND_URL;

interface AuthState {
  currentUser: Omit<User, 'password'> | null;
  users: User[];
  isAuthenticated: boolean;

  login:          (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  loginWithToken: (user: Omit<User, 'password'>) => void;
  signup:         (name: string, email: string, password: string) => { success: boolean; message: string };
  deleteAccount:  () => Promise<{ success: boolean; message: string }>;
  uploadAvatar:   (file: File) => Promise<{ success: boolean; message: string }>;
  removeAvatar:   () => Promise<{ success: boolean; message: string }>;
  getAvatarUrl:   () => string | null;
  logout:         () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser:     null,
      users:           [],
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const res  = await fetch(`${API}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!data.success) return { success: false, message: data.message || 'الإيميل أو كلمة المرور غير صحيحة.' };
          if (data.token) localStorage.setItem('nuzul_token', data.token);
          set({ currentUser: data.user, isAuthenticated: true });
          return { success: true, message: data.message || 'مرحباً بعودتك!' };
        } catch {
          return { success: false, message: 'تعذّر الاتصال بالخادم. تأكد من تشغيل الباكاند على المنفذ 8000.' };
        }
      },

      loginWithToken: (user) => set({ currentUser: user, isAuthenticated: true }),

      signup: (name, email, password) => {
        const all = get().users;
        if (all.find((u) => u.email.toLowerCase() === email.toLowerCase()))
          return { success: false, message: 'هذا الإيميل مسجل مسبقاً.' };
        const newUser: User = { id: Date.now().toString(), name, email, password, role: 'user' };
        set((s) => ({ users: [...s.users, newUser] }));
        const { password: _pw, ...safe } = newUser;
        set({ currentUser: safe, isAuthenticated: true });
        return { success: true, message: 'تم إنشاء الحساب!' };
      },

      deleteAccount: async () => {
        const token = localStorage.getItem('nuzul_token');
        if (!token) return { success: false, message: 'الجلسة غير صالحة.' };
        try {
          const res  = await fetch(`${API}/account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (!data.success) return { success: false, message: data.message };
          localStorage.removeItem('nuzul_token');
          set({ currentUser: null, isAuthenticated: false });
          return { success: true, message: 'تم حذف الحساب بنجاح.' };
        } catch { return { success: false, message: 'تعذّر الاتصال بالخادم.' }; }
      },

      uploadAvatar: async (file) => {
        const token = localStorage.getItem('nuzul_token');
        if (!token) return { success: false, message: 'الجلسة غير صالحة.' };
        try {
          const formData = new FormData();
          formData.append('avatar', file);
          const res  = await fetch(`${BACKEND}/api/upload/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
          const data = await res.json();
          if (!data.success) return { success: false, message: data.message };
          set((s) => ({ currentUser: s.currentUser ? { ...s.currentUser, avatar: data.avatarUrl } : null }));
          return { success: true, message: 'تم رفع الصورة.' };
        } catch { return { success: false, message: 'تعذّر رفع الصورة.' }; }
      },

      removeAvatar: async () => {
        const token = localStorage.getItem('nuzul_token');
        if (!token) return { success: false, message: 'الجلسة غير صالحة.' };
        try {
          const res  = await fetch(`${BACKEND}/api/upload/avatar`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (!data.success) return { success: false, message: data.message };
          set((s) => ({ currentUser: s.currentUser ? { ...s.currentUser, avatar: null } : null }));
          return { success: true, message: 'تم حذف الصورة.' };
        } catch { return { success: false, message: 'تعذّر حذف الصورة.' }; }
      },

      getAvatarUrl: () => {
        const avatar = get().currentUser?.avatar;
        if (!avatar) return null;
        if (avatar.startsWith('http')) return avatar;
        return `${BACKEND}${avatar}`;
      },

      logout: () => {
        localStorage.removeItem('nuzul_token');
        set({ currentUser: null, isAuthenticated: false });
      },
    }),
    { name: 'stay-auth' }
  )
);
