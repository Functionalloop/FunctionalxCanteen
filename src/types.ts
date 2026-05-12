export type Allergen = 'Gluten' | 'Dairy' | 'Egg' | 'Nuts' | 'Peanuts';
export type Dietary = 'Veg' | 'Non-Veg' | 'Egg';
export type MenuStatus = 'Available' | 'Running Low' | 'Finished';
export type OrderStatus = 'queued' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';
export type HealthLevel = 1 | 2 | 3;

export interface MenuItem {
  id: string;
  name: string;
  category?: string;
  price: number;
  dietary: Dietary;
  allergens: Allergen[];
  status: MenuStatus;
  image?: string;
  rating: number;
  reviews: number;
  prepTime: string;
  distance: string;
  healthLevel?: HealthLevel;
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
  pointsEarned?: number;
  reviewed?: boolean;
  diningOption?: 'dine_in' | 'takeaway';
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  dietary: string;
  healthLevel?: HealthLevel;
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

export interface RewardCoupon {
  id: string;
  title: string;
  discount: number;
  pointsCost: number;
  redeemed: boolean;
  redeemedAt?: string;
}
