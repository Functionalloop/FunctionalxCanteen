/**
 * Firebase Realtime Database data layer.
 *
 * RTDB schema:
 *   /menu/{itemId}                       – MenuItem (incl. healthLevel)
 *   /broadcasts/{broadcastId}            – Broadcast
 *   /orders/{orderId}                    – Order (with studentId, pointsEarned)
 *   /users/{uid}/wallet                  – number (balance)
 *   /users/{uid}/transactions/{txnId}    – WalletTransaction
 *   /users/{uid}/gpa                     – number (0-10)
 *   /users/{uid}/streak                  – number
 *   /users/{uid}/points                  – number (reward points)
 *   /users/{uid}/messSubscription        – MessSubscription
 *   /menuTemplates/{templateId}          – MenuTemplate
 *   /tokenCounter                        – number
 */

import {
  ref,
  get,
  set,
  push,
  update,
  onValue,
  off,
  runTransaction,
  type DatabaseReference,
} from 'firebase/database';
import { db } from './firebase';
import type {
  MenuItem,
  Broadcast,
  WalletTransaction,
  Order,
  OrderItem,
  OrderStatus,
  RewardCoupon,
  HealthLevel,
  MessSubscription,
  MessPlanType,
  MessPlan,
} from '../types';

// ─── Template Type ───────────────────────────────────────────
export interface MenuTemplate {
  id: string;
  name: string;
  category: string;
  allergy_tags: string[];
  price: number;
  image?: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────
function generateId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);
}

/** Read a ref once and return the value or a fallback. */
async function readOnce<T>(path: string, fallback: T): Promise<T> {
  try {
    const snap = await get(ref(db, path));
    return snap.exists() ? (snap.val() as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Convert RTDB object-of-objects to an array with injected 'id' field. */
function objToArray<T extends { id?: string }>(obj: Record<string, T> | null): T[] {
  if (!obj) return [];
  return Object.entries(obj).map(([id, val]) => ({ ...val, id }));
}

// ─── Token counter ────────────────────────────────────────────
async function getNextToken(): Promise<string> {
  const counterRef = ref(db, 'tokenCounter');
  let next = 46;
  await runTransaction(counterRef, (current) => {
    next = (current || 46) + 1;
    return next;
  });
  return `#${String(next).padStart(3, '0')}`;
}

// ─── Real-time subscription system ───────────────────────────
// Maps a logical key to a RTDB path so VendorDashboard / StudentQueue
// can reuse the existing subscribe() + STORAGE_KEYS API.
const RTDB_PATHS = {
  MENU: 'menu',
  TEMPLATES: 'menuTemplates',
  ORDERS: 'orders',
  BROADCASTS: 'broadcasts',
} as const;

// Legacy keys kept so callers don't need updating
export const STORAGE_KEYS = {
  MENU: 'menu',
  TEMPLATES: 'menuTemplates',
  ORDERS: 'orders',
  BROADCASTS: 'broadcasts',
  TRANSACTIONS: 'transactions',
  WALLET: 'wallet',
  GPA: 'gpa',
  STREAK: 'streak',
  TOKEN_COUNTER: 'tokenCounter',
};

type Listener = () => void;
const listeners: Record<string, Listener[]> = {};
const rtdbUnsubscribers: Record<string, () => void> = {};

/**
 * Subscribe to changes on a logical key (mirrors old localStorage subscribe API).
 * Internally attaches a Firebase onValue listener to the appropriate path.
 */
export function subscribe(key: string, listener: Listener): () => void {
  if (!listeners[key]) listeners[key] = [];
  listeners[key].push(listener);

  // Wire up a Firebase RTDB listener the first time a key is subscribed
  if (!rtdbUnsubscribers[key]) {
    const path = (RTDB_PATHS as any)[key] ?? key;
    const dbRef = ref(db, path);
    const handler = () => (listeners[key] || []).forEach((l) => l());
    onValue(dbRef, handler);
    rtdbUnsubscribers[key] = () => off(dbRef, 'value', handler);
  }

  return () => {
    listeners[key] = (listeners[key] || []).filter((l) => l !== listener);
    if (!listeners[key].length && rtdbUnsubscribers[key]) {
      rtdbUnsubscribers[key]();
      delete rtdbUnsubscribers[key];
    }
  };
}

// ─── Current user UID (set by components that know the user) ─
let _currentUid: string | null = null;
export function setCurrentUserId(uid: string | null) {
  _currentUid = uid;
}
function uid(): string {
  if (!_currentUid) throw new Error('No authenticated user — call setCurrentUserId first');
  return _currentUid;
}

// ─── Public API ──────────────────────────────────────────────
export const api = {
  // ── Menu ───────────────────────────────────────────────────
  getMenu: async (): Promise<MenuItem[]> => {
    const data = await readOnce<Record<string, MenuItem> | null>('menu', null);
    return objToArray(data).sort((a, b) => a.name.localeCompare(b.name));
  },

  updateMenuItemStatus: async (itemId: string, status: MenuItem['status']) => {
    await update(ref(db, `menu/${itemId}`), { status });
    return { success: true };
  },

  updateMenuItemImage: async (itemId: string, image: string) => {
    await update(ref(db, `menu/${itemId}`), { image });
    return { success: true };
  },

  addMenuItem: async (item: Omit<MenuItem, 'id'>) => {
    const newRef = push(ref(db, 'menu'));
    const newItem: MenuItem = { ...item, id: newRef.key! };
    await set(newRef, newItem);
    return newItem;
  },

  // ── Place Order ────────────────────────────────────────────
  placeOrder: async (
    items: OrderItem[],
    total_amount: number,
    scheduledTime?: string,
    diningOption?: 'dine_in' | 'takeaway'
  ) => {
    try {
      const userId = uid();
      const walletRef = ref(db, `users/${userId}/wallet`);

      const balanceSnap = await get(walletRef);
      const currentBalance: number = balanceSnap.exists() ? balanceSnap.val() : 0;

      if (currentBalance < total_amount) {
        return { error: 'Insufficient balance' };
      }

      const newBalance = currentBalance - total_amount;
      await set(walletRef, newBalance);

      const tokenNo = await getNextToken();

      // Calculate reward points: 10 base + 5 per healthy item (healthLevel 3)
      let pointsEarned = 10;
      let totalHealthScore = 0;
      let healthyItemCount = 0;
      for (const item of items) {
        const hl = item.healthLevel || 1;
        totalHealthScore += hl * item.quantity;
        healthyItemCount += item.quantity;
        if (hl === 3) pointsEarned += 5 * item.quantity;
        if (hl === 2) pointsEarned += 2 * item.quantity;
      }

      const orderRef = push(ref(db, 'orders'));
      const order: Order = {
        id: orderRef.key!,
        tokenNo,
        items,
        total_amount,
        status: 'queued',
        studentId: userId,
        scheduled_time: scheduledTime || new Date().toISOString(),
        created_at: new Date().toISOString(),
        pointsEarned,
        diningOption: diningOption || 'dine_in',
      };
      await set(orderRef, order);

      const txnRef = push(ref(db, `users/${userId}/transactions`));
      const txn: WalletTransaction = {
        id: txnRef.key!,
        type: 'deduction',
        amount: total_amount,
        description: `${items.map((i) => i.name).join(', ')} (Token ${tokenNo})`,
        timestamp: new Date().toLocaleString(),
        tokenNo,
      };
      await set(txnRef, txn);

      // Award points
      const pointsSnap = await get(ref(db, `users/${userId}/points`));
      const currentPoints = pointsSnap.exists() ? pointsSnap.val() : 0;
      await set(ref(db, `users/${userId}/points`), currentPoints + pointsEarned);

      // Recalculate GPA based on meal health
      const avgHealth = healthyItemCount > 0 ? totalHealthScore / healthyItemCount : 1;
      const gpaSnap = await get(ref(db, `users/${userId}/gpa`));
      const currentGpa: number = gpaSnap.exists() ? gpaSnap.val() : 5;
      const gpaImpact = (avgHealth / 3) * 10;
      const newGpa = parseFloat(Math.min(10, Math.max(0, (currentGpa * 0.8 + gpaImpact * 0.2))).toFixed(1));
      await set(ref(db, `users/${userId}/gpa`), newGpa);

      // Increment streak if a healthy order (avg health >= 2)
      if (avgHealth >= 2) {
        const streakSnap = await get(ref(db, `users/${userId}/streak`));
        const currentStreak: number = streakSnap.exists() ? streakSnap.val() : 0;
        await set(ref(db, `users/${userId}/streak`), currentStreak + 1);
      }

      return { success: true, order, balance: newBalance, pointsEarned };
    } catch (err: any) {
      console.error('placeOrder error:', err);
      return { error: err?.message || 'Order failed. Please try again.' };
    }
  },

  // ── Orders ─────────────────────────────────────────────────
  getOrders: async (): Promise<Order[]> => {
    const data = await readOnce<Record<string, Order> | null>('orders', null);
    const all = objToArray(data);
    return all.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getMyOrders: async (): Promise<Order[]> => {
    const userId = uid();
    const data = await readOnce<Record<string, Order> | null>('orders', null);
    const all = objToArray(data);
    return all
      .filter((o) => o.studentId === userId)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  },

  getActiveOrders: async (): Promise<Order[]> => {
    const all = await api.getOrders();
    return all.filter((o) => o.status !== 'picked_up' && o.status !== 'cancelled');
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    const updates: Partial<Order> = { status };

    if (status === 'preparing') {
      const snap = await get(ref(db, `orders/${orderId}`));
      const order: Order | null = snap.exists() ? snap.val() : null;
      if (order && !order.estimated_ready_at) {
        const mins = order.estimated_minutes || 15;
        updates.estimated_minutes = mins;
        updates.estimated_ready_at = new Date(Date.now() + mins * 60000).toISOString();
      }
    }

    await update(ref(db, `orders/${orderId}`), updates);
    const snap = await get(ref(db, `orders/${orderId}`));
    return { success: true, order: snap.val() };
  },

  cancelOrder: async (orderId: string) => {
    try {
      const snap = await get(ref(db, `orders/${orderId}`));
      if (!snap.exists()) throw new Error('Order not found');
      const order = snap.val() as Order;
      
      if (order.status !== 'queued') {
        throw new Error('Can only cancel orders that are still queued. Vendor may have started preparing it.');
      }

      const userId = order.studentId;
      if (userId !== uid()) throw new Error('Unauthorized');

      // Refund the amount to wallet
      const walletRef = ref(db, `users/${userId}/wallet`);
      const balanceSnap = await get(walletRef);
      const currentBalance: number = balanceSnap.exists() ? balanceSnap.val() : 0;
      await set(walletRef, currentBalance + order.total_amount);

      // Create refund transaction
      const txnRef = push(ref(db, `users/${userId}/transactions`));
      const txn: WalletTransaction = {
        id: txnRef.key!,
        type: 'credit',
        amount: order.total_amount,
        description: `Refund for Cancelled Order (Token ${order.tokenNo})`,
        timestamp: new Date().toLocaleString(),
      };
      await set(txnRef, txn);

      // Deduct the points earned from this order
      if (order.pointsEarned) {
        const pointsRef = ref(db, `users/${userId}/points`);
        const pointsSnap = await get(pointsRef);
        const currentPoints = pointsSnap.exists() ? pointsSnap.val() : 0;
        await set(pointsRef, Math.max(0, currentPoints - order.pointsEarned));
      }

      // Update status to cancelled
      await update(ref(db, `orders/${orderId}`), { status: 'cancelled' });
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'Failed to cancel order' };
    }
  },

  setOrderTimer: async (orderId: string, minutes: number) => {
    const updates = {
      estimated_minutes: minutes,
      estimated_ready_at: new Date(Date.now() + minutes * 60000).toISOString(),
    };
    await update(ref(db, `orders/${orderId}`), updates);
    return { success: true };
  },

  // ── Wallet ─────────────────────────────────────────────────
  getBalance: async (): Promise<number> => {
    const userId = uid();
    return readOnce<number>(`users/${userId}/wallet`, 0);
  },

  topUp: async (_student_id: string, amount: number) => {
    try {
      const userId = uid();
      const walletRef = ref(db, `users/${userId}/wallet`);

      // Read current, add, write back
      const snap = await get(walletRef);
      const newBalance = (snap.exists() ? snap.val() : 0) + amount;
      await set(walletRef, newBalance);

      const txnRef = push(ref(db, `users/${userId}/transactions`));
      const txn: WalletTransaction = {
        id: txnRef.key!,
        type: 'credit',
        amount,
        description: 'Parent UPI Top-up',
        timestamp: new Date().toLocaleString(),
      };
      await set(txnRef, txn);

      return { message: 'Top-up successful', balance: newBalance };
    } catch (err: any) {
      console.error('topUp error:', err);
      return { message: 'Top-up failed', balance: 0 };
    }
  },

  getTransactions: async (): Promise<WalletTransaction[]> => {
    const userId = uid();
    const data = await readOnce<Record<string, WalletTransaction> | null>(
      `users/${userId}/transactions`,
      null
    );
    const all = objToArray(data);
    return all.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  calculateGPA: async (_student_id: string) => {
    const userId = uid();
    const gpa = await readOnce<number>(`users/${userId}/gpa`, 5);
    const streak = await readOnce<number>(`users/${userId}/streak`, 0);
    const points = await readOnce<number>(`users/${userId}/points`, 0);

    const ordersData = await readOnce<Record<string, Order> | null>('orders', null);
    const userOrders = objToArray(ordersData).filter(o => o.studentId === userId);
    const sorted = userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recentMeals = sorted.slice(0, 5).flatMap(o => o.items.map(i => i.name));
    const orderDates = sorted.map(o => o.created_at);

    return { gpa, streak, points, recentMeals, orderDates };
  },

  getPoints: async (): Promise<number> => {
    const userId = uid();
    return readOnce<number>(`users/${userId}/points`, 0);
  },

  getAvailableCoupons: (): RewardCoupon[] => {
    return [
      { id: 'coupon_10', title: '₹10 Off', discount: 10, pointsCost: 50, redeemed: false },
      { id: 'coupon_25', title: '₹25 Off', discount: 25, pointsCost: 100, redeemed: false },
      { id: 'coupon_50', title: '₹50 Off', discount: 50, pointsCost: 200, redeemed: false },
      { id: 'coupon_100', title: '₹100 Off', discount: 100, pointsCost: 400, redeemed: false },
    ];
  },

  redeemCoupon: async (couponId: string, pointsCost: number, discount: number) => {
    const userId = uid();
    const pointsSnap = await get(ref(db, `users/${userId}/points`));
    const currentPoints: number = pointsSnap.exists() ? pointsSnap.val() : 0;

    if (currentPoints < pointsCost) {
      return { error: 'Not enough points' };
    }

    await set(ref(db, `users/${userId}/points`), currentPoints - pointsCost);

    const walletRef = ref(db, `users/${userId}/wallet`);
    const walletSnap = await get(walletRef);
    const currentBalance: number = walletSnap.exists() ? walletSnap.val() : 0;
    await set(walletRef, currentBalance + discount);

    const txnRef = push(ref(db, `users/${userId}/transactions`));
    const txn: WalletTransaction = {
      id: txnRef.key!,
      type: 'credit',
      amount: discount,
      description: `Coupon Redeemed (${pointsCost} pts)`,
      timestamp: new Date().toLocaleString(),
    };
    await set(txnRef, txn);

    return { success: true, newPoints: currentPoints - pointsCost, newBalance: currentBalance + discount };
  },

  awardWeeklyBonus: async () => {
    const userId = uid();
    const gpa = await readOnce<number>(`users/${userId}/gpa`, 0);
    if (gpa >= 8) {
      const pointsSnap = await get(ref(db, `users/${userId}/points`));
      const currentPoints: number = pointsSnap.exists() ? pointsSnap.val() : 0;
      const bonus = 25;
      await set(ref(db, `users/${userId}/points`), currentPoints + bonus);
      return { awarded: true, bonus, newPoints: currentPoints + bonus };
    }
    return { awarded: false, bonus: 0 };
  },

  setMenuItemHealthLevel: async (itemId: string, healthLevel: HealthLevel) => {
    await update(ref(db, `menu/${itemId}`), { healthLevel });
    return { success: true };
  },

  predictCrowd: async () => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour <= 14) {
      return { status: 'Avoid', reason: 'Lunch rush — most classes just ended.' };
    }
    return { status: 'Clear', reason: 'No major classes ended recently.' };
  },


  // ── Broadcasts ─────────────────────────────────────────────
  getBroadcasts: async (): Promise<Broadcast[]> => {
    const data = await readOnce<Record<string, Broadcast> | null>('broadcasts', null);
    const all = objToArray(data);
    return all.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  sendBroadcast: async (message: string, isUrgent: boolean) => {
    const newRef = push(ref(db, 'broadcasts'));
    const newBroadcast: Broadcast = {
      id: newRef.key!,
      message,
      type: isUrgent ? 'urgent' : 'info',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      staffName: 'Staff',
    };
    await set(newRef, newBroadcast);
    return newBroadcast;
  },

  deleteBroadcast: async (id: string) => {
    await set(ref(db, `broadcasts/${id}`), null);
    return { success: true };
  },

  // ── Menu Templates ─────────────────────────────────────────
  getMenuTemplates: async (): Promise<MenuTemplate[]> => {
    const data = await readOnce<Record<string, MenuTemplate> | null>('menuTemplates', null);
    const all = objToArray(data);
    return all.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  createMenuTemplate: async (data: {
    name: string;
    category: string;
    price: number;
    allergy_tags: string[];
    image?: string;
  }) => {
    const newRef = push(ref(db, 'menuTemplates'));
    const newTemplate: MenuTemplate = {
      id: newRef.key!,
      ...data,
      created_at: new Date().toISOString(),
    };
    await set(newRef, newTemplate);
    return newTemplate;
  },

  addFromTemplate: async (template_id: string) => {
    const snap = await get(ref(db, `menuTemplates/${template_id}`));
    if (!snap.exists()) return { error: 'Template not found' };
    const template: MenuTemplate = snap.val();

    const newRef = push(ref(db, 'menu'));
    const newItem: MenuItem = {
      id: newRef.key!,
      name: template.name,
      category: template.category,
      price: template.price,
      dietary: template.allergy_tags.some((t) => t.toLowerCase() === 'non-veg')
        ? 'Non-Veg'
        : 'Veg',
      allergens: template.allergy_tags as any,
      status: 'Available',
      image:
        template.image ||
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
      rating: 5.0,
      reviews: 0,
      prepTime: '15 min',
      distance: '0 km (Campus)',
      healthLevel: 3,
    };
    await set(newRef, newItem);
    return newItem;
  },

  // ── Seed Menu (admin one-time setup) ─────────────────────
  seedMenu: async (): Promise<{ seeded: boolean; count: number }> => {
    // Force reset for categories update
    await set(ref(db, 'menu'), null);

    const INITIAL_MENU = [
      { name: 'Tandoori Pizza', category: 'snacks', price: 350, dietary: 'Veg', allergens: ['Dairy', 'Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600', rating: 4.6, reviews: 250, prepTime: '15-30 min', distance: '1.3 km', healthLevel: 2, proteinGrams: 12, isProteinRich: false },
      { name: 'Burger Deluxe', category: 'lunch', price: 180, dietary: 'Non-Veg', allergens: ['Gluten', 'Dairy', 'Egg'], status: 'Available', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600', rating: 4.9, reviews: 300, prepTime: '20-35 min', distance: '2.5 km', healthLevel: 1, proteinGrams: 28, isProteinRich: true },
      { name: 'Chinese Fried Noodles', category: 'dinner', price: 120, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=600', rating: 4.5, reviews: 42, prepTime: '20-35 min', distance: '2.1 km', healthLevel: 2, proteinGrams: 8, isProteinRich: false },
      { name: 'Rajma Chawal', category: 'lunch', price: 80, dietary: 'Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1626082895617-2c6bfcc32746?auto=format&fit=crop&q=80&w=600', rating: 4.8, reviews: 120, prepTime: '5-10 min', distance: '0 km (Campus)', healthLevel: 3, proteinGrams: 18, isProteinRich: true },
      { name: 'Vada Pav', category: 'snacks', price: 35, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&q=80&w=600', rating: 4.2, reviews: 89, prepTime: '5 min', distance: '0 km (Campus)', healthLevel: 1, proteinGrams: 6, isProteinRich: false },
      { name: 'Dal Tadka + Rice', category: 'dinner', price: 70, dietary: 'Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&q=80&w=600', rating: 4.3, reviews: 180, prepTime: '10 min', distance: '0 km (Campus)', healthLevel: 3, proteinGrams: 14, isProteinRich: false },
      { name: 'Masala Dosa', category: 'breakfast', price: 60, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&q=80&w=600', rating: 4.7, reviews: 210, prepTime: '10-15 min', distance: '0 km (Campus)', healthLevel: 3, proteinGrams: 10, isProteinRich: false },
      { name: 'Paneer Tikka', category: 'snacks', price: 160, dietary: 'Veg', allergens: ['Dairy'], status: 'Available', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&q=80&w=600', rating: 4.8, reviews: 175, prepTime: '15 min', distance: '0 km (Campus)', healthLevel: 3, proteinGrams: 26, isProteinRich: true },
      { name: 'Egg Bhurji + Paratha', category: 'breakfast', price: 70, dietary: 'Egg', allergens: ['Egg', 'Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=600', rating: 4.6, reviews: 140, prepTime: '10 min', distance: '0 km (Campus)', healthLevel: 3, proteinGrams: 22, isProteinRich: true },
      { name: 'Chicken Biryani', category: 'lunch', price: 150, dietary: 'Non-Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&q=80&w=600', rating: 4.9, reviews: 320, prepTime: '20-30 min', distance: '0 km (Campus)', healthLevel: 2, proteinGrams: 32, isProteinRich: true },
      { name: 'Sprouts Salad Bowl', category: 'snacks', price: 60, dietary: 'Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600', rating: 4.4, reviews: 65, prepTime: '5 min', distance: '0 km (Campus)', healthLevel: 3, proteinGrams: 20, isProteinRich: true },
      { name: 'Soya Chaap', category: 'dinner', price: 110, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600', rating: 4.5, reviews: 88, prepTime: '15 min', distance: '0 km (Campus)', healthLevel: 3, proteinGrams: 24, isProteinRich: true },
      { name: 'Chole Bhature', category: 'breakfast', price: 75, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=600', rating: 4.7, reviews: 190, prepTime: '10 min', distance: '0 km (Campus)', healthLevel: 1, proteinGrams: 16, isProteinRich: true },
      { name: 'Chips (Magic Masala)', category: 'Shop', price: 20, dietary: 'Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1599599811450-2b937088b9dd?auto=format&fit=crop&q=80&w=600', rating: 4.5, reviews: 120, prepTime: 'Instant', distance: '0 km (Campus)', healthLevel: 1 },
      { name: 'Cola Soft Drink', category: 'Shop', price: 40, dietary: 'Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600', rating: 4.2, reviews: 85, prepTime: 'Instant', distance: '0 km (Campus)', healthLevel: 1 },
      { name: 'Vanilla Ice Cream', category: 'Shop', price: 30, dietary: 'Veg', allergens: ['Dairy'], status: 'Available', image: 'https://images.unsplash.com/photo-1570197781417-0a52375c0ba4?auto=format&fit=crop&q=80&w=600', rating: 4.8, reviews: 200, prepTime: 'Instant', distance: '0 km (Campus)', healthLevel: 1 },
      { name: 'Mineral Water (1L)', category: 'Shop', price: 20, dietary: 'Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?auto=format&fit=crop&q=80&w=600', rating: 5.0, reviews: 50, prepTime: 'Instant', distance: '0 km (Campus)', healthLevel: 3 },
      { name: 'Fresh Chaas', category: 'Shop', price: 15, dietary: 'Veg', allergens: ['Dairy'], status: 'Available', image: 'https://images.unsplash.com/photo-1596450514735-111a2fe02935?auto=format&fit=crop&q=80&w=600', rating: 4.7, reviews: 150, prepTime: 'Instant', distance: '0 km (Campus)', healthLevel: 3 },
      { name: 'Spicy Cup Noodles', category: 'Shop', price: 50, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&q=80&w=600', rating: 4.4, reviews: 95, prepTime: '3 min', distance: '0 km (Campus)', healthLevel: 1 },
    ] as const;

    for (const item of INITIAL_MENU) {
      const newRef = push(ref(db, 'menu'));
      await set(newRef, { ...item, id: newRef.key });
    }

    // Seed token counter
    const tcSnap = await get(ref(db, 'tokenCounter'));
    if (!tcSnap.exists()) await set(ref(db, 'tokenCounter'), 46);

    // Seed initial broadcast
    const bSnap = await get(ref(db, 'broadcasts'));
    if (!bSnap.exists()) {
      const bRef = push(ref(db, 'broadcasts'));
      await set(bRef, {
        id: bRef.key,
        message: 'Welcome to FunctionalCanteen! Fresh menu seeded and ready.',
        type: 'info',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        staffName: 'Admin',
      });
    }

    return { seeded: true, count: INITIAL_MENU.length };
  },

  // ── Feedback ───────────────────────────────────────────────
  rateItem: async (item_id: string, rating: number) => {
    const snap = await get(ref(db, `menu/${item_id}`));
    if (!snap.exists()) return { error: 'Item not found' };
    const item: MenuItem = snap.val();
    const currentRating = item.rating || 5;
    const currentReviews = item.reviews || 0;
    
    const newReviews = currentReviews + 1;
    const newRating = parseFloat((((currentRating * currentReviews) + rating) / newReviews).toFixed(1));
    
    await update(ref(db, `menu/${item_id}`), { rating: newRating, reviews: newReviews });
    return { message: 'Rating updated', item: { ...item, rating: newRating, reviews: newReviews } };
  },

  awardReviewPoints: async (): Promise<{ newPoints: number }> => {
    const userId = uid();
    const snap = await get(ref(db, `users/${userId}/points`));
    const currentPoints = snap.exists() ? snap.val() : 0;
    const newPoints = currentPoints + 5;
    await set(ref(db, `users/${userId}/points`), newPoints);
    return { newPoints };
  },

  markOrderReviewed: async (orderId: string) => {
    await update(ref(db, `orders/${orderId}`), { reviewed: true });
  },

  // ── Mess Subscription ─────────────────────────────────────
  getMessPlans: (): MessPlan[] => [
    {
      id: 'basic',
      name: 'Basic',
      price: 1500,
      duration: 30,
      mealsPerDay: 1,
      description: '1 meal/day for 30 days',
      features: ['1 meal per day', 'Breakfast OR Lunch OR Dinner', 'Skip any day', '₹50/meal value'],
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 2800,
      duration: 30,
      mealsPerDay: 2,
      description: '2 meals/day for 30 days',
      features: ['2 meals per day', 'Choose any 2 slots', 'Skip any day', '₹47/meal value', '5% wallet cashback'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 3800,
      duration: 30,
      mealsPerDay: 3,
      description: '3 meals/day for 30 days',
      features: ['3 meals per day', 'Breakfast + Lunch + Dinner', 'Skip any day', '₹42/meal value', '10% wallet cashback', 'Priority queue'],
    },
  ],

  getMySubscription: async (): Promise<MessSubscription | null> => {
    const userId = uid();
    const data = await readOnce<MessSubscription | null>(`users/${userId}/messSubscription`, null);
    if (!data) return null;
    // Check if subscription expired
    if (new Date(data.endDate) < new Date()) {
      await update(ref(db, `users/${userId}/messSubscription`), { active: false });
      return { ...data, active: false };
    }
    // Reset mealsUsedToday if a new day
    const today = new Date().toISOString().split('T')[0];
    if (data.lastMealDate !== today) {
      await update(ref(db, `users/${userId}/messSubscription`), { mealsUsedToday: 0, lastMealDate: today });
      return { ...data, mealsUsedToday: 0, lastMealDate: today };
    }
    return data;
  },

  subscribeMess: async (planId: MessPlanType) => {
    try {
      const userId = uid();
      const plans = api.getMessPlans();
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      // Check wallet balance
      const walletSnap = await get(ref(db, `users/${userId}/wallet`));
      const balance: number = walletSnap.exists() ? walletSnap.val() : 0;
      if (balance < plan.price) throw new Error(`Insufficient balance. You need ₹${plan.price} but have ₹${balance}.`);

      // Deduct from wallet
      await set(ref(db, `users/${userId}/wallet`), balance - plan.price);

      // Create transaction
      const txnRef = push(ref(db, `users/${userId}/transactions`));
      const txn: WalletTransaction = {
        id: txnRef.key!,
        type: 'deduction',
        amount: plan.price,
        description: `Mess ${plan.name} Plan (${plan.duration} days)`,
        timestamp: new Date().toLocaleString(),
      };
      await set(txnRef, txn);

      // Create subscription
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + plan.duration * 86400000);
      const sub: MessSubscription = {
        id: generateId(),
        userId,
        planId: plan.id,
        planName: plan.name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        mealsPerDay: plan.mealsPerDay,
        mealsUsedToday: 0,
        lastMealDate: startDate.toISOString().split('T')[0],
        totalMealsRemaining: plan.mealsPerDay * plan.duration,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await set(ref(db, `users/${userId}/messSubscription`), sub);

      return { success: true, subscription: sub };
    } catch (err: any) {
      return { error: err?.message || 'Subscription failed' };
    }
  },

  useMessMeal: async () => {
    try {
      const userId = uid();
      const sub = await api.getMySubscription();
      if (!sub || !sub.active) throw new Error('No active mess subscription');
      if (sub.mealsUsedToday >= sub.mealsPerDay) throw new Error(`You\'ve used all ${sub.mealsPerDay} meals for today`);
      if (sub.totalMealsRemaining <= 0) throw new Error('No meals remaining in your plan');

      const today = new Date().toISOString().split('T')[0];
      await update(ref(db, `users/${userId}/messSubscription`), {
        mealsUsedToday: sub.mealsUsedToday + 1,
        totalMealsRemaining: sub.totalMealsRemaining - 1,
        lastMealDate: today,
      });
      return { success: true, mealsLeft: sub.mealsPerDay - sub.mealsUsedToday - 1, totalRemaining: sub.totalMealsRemaining - 1 };
    } catch (err: any) {
      return { error: err?.message || 'Failed to use meal' };
    }
  },

  cancelMessSubscription: async () => {
    try {
      const userId = uid();
      await update(ref(db, `users/${userId}/messSubscription`), { active: false });
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || 'Failed to cancel subscription' };
    }
  },

  // ── Protein Rich Items ────────────────────────────────────
  getProteinRichItems: async (): Promise<MenuItem[]> => {
    const menu = await api.getMenu();
    return menu.filter(item => item.isProteinRich || (item.proteinGrams && item.proteinGrams >= 15));
  },
};
