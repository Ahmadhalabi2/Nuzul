/**
 * hotelsStore — متجر الفنادق
 * الفنادق هلق تُجلب من الـ API مباشرة
 * هذا الملف بقي فقط للتوافق مع الملفات اللي تستورد منه
 */
import { create } from 'zustand';

export type HotelStatus = 'active' | 'inactive';

export interface HotelEntity {
  id: number;
  name: string;
  country: string;
  city: string;
  rating: number;
  price: number;
  rooms: number;
  status: HotelStatus;
  tag: string;
  image: string;
  amenities: string[];
}

interface HotelsState {
  hotels: HotelEntity[];
  addHotel: (h: HotelEntity) => void;
  updateHotel: (id: number, patch: Partial<HotelEntity>) => void;
}

export const useHotelsStore = create<HotelsState>()((set) => ({
  hotels: [],
  addHotel:    (h)        => set(s => ({ hotels: [h, ...s.hotels] })),
  updateHotel: (id, patch) => set(s => ({ hotels: s.hotels.map(h => h.id === id ? { ...h, ...patch } : h) })),
}));
