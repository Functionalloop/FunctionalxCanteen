export type Allergen = 'Gluten' | 'Dairy' | 'Egg' | 'Nuts' | 'Peanuts';
export type Dietary = 'Veg' | 'Non-Veg' | 'Egg';
export type MenuStatus = 'Available' | 'Running Low' | 'Finished';
export type OrderStatus = 'queued' | 'preparing' | 'ready' | 'picked_up';

export interface MenuItem {
  id: string;
  name: string;
  category?: string; // e.g. 'breakfast', 'lunch', 'dinner', 'snacks'
  price: number;
  dietary: Dietary;
  allergens: Allergen[];
  status: MenuStatus;
  image?: string;
  rating: number;
  reviews: number;
  prepTime: string;
  distance: string;
}

export interface Order {
  id: string;
  tokenNo: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  studentId?: string;
  scheduled_time: string;
  created_at: string;
  estimated_minutes?: number;
  estimated_ready_at?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  dietary: string;
}

export interface Broadcast {
  id: string;
  message: string;
  type: 'info' | 'urgent';
  timestamp: string;
  staffName: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deduction' | 'credit';
  amount: number;
  description: string;
  timestamp: string;
  tokenNo?: string;
}
