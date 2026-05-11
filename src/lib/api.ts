/**
 * Firebase Realtime Database data layer.
 * All canteen data (menu, orders, broadcasts, wallet, templates) is
 * persisted in Firebase RTDB under structured paths.
 *
 * RTDB schema:
 *   /menu/{itemId}              – MenuItem
 *   /broadcasts/{broadcastId}   – Broadcast
 *   /orders/{orderId}           – Order (with studentId)
 *   /users/{uid}/wallet         – number (balance)
 *   /users/{uid}/transactions/{txnId} – WalletTransaction
 *   /users/{uid}/gpa            – number
 *   /users/{uid}/streak         – number
 *   /menuTemplates/{templateId} – MenuTemplate
 *   /tokenCounter               – number
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
    scheduledTime?: string
  ) => {
    try {
      const userId = uid();
      const walletRef = ref(db, `users/${userId}/wallet`);

      // Step 1: Read current balance
      const balanceSnap = await get(walletRef);
      const currentBalance: number = balanceSnap.exists() ? balanceSnap.val() : 0;

      // Step 2: Check sufficiency before touching the DB
      if (currentBalance < total_amount) {
        return { error: 'Insufficient balance' };
      }

      // Step 3: Deduct balance
      const newBalance = currentBalance - total_amount;
      await set(walletRef, newBalance);

      // Step 4: Generate token
      const tokenNo = await getNextToken();

      // Step 5: Create order in /orders
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
      };
      await set(orderRef, order);

      // Step 6: Add transaction record under the user
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

      return { success: true, order, balance: newBalance };
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
    return all.filter((o) => o.status !== 'picked_up');
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

  // ── GPA / Wellness ────────────────────────────────────────
  calculateGPA: async (_student_id: string) => {
    const userId = uid();
    const gpa = await readOnce<number>(`users/${userId}/gpa`, 0);
    const streak = await readOnce<number>(`users/${userId}/streak`, 0);
    return {
      gpa,
      streak,
      message: streak > 0
        ? `You have a ${streak}-day healthy eating streak! Keep it up.`
        : 'Start your healthy eating streak today!',
    };
  },

  // ── Crowd Prediction ──────────────────────────────────────
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
    };
    await set(newRef, newItem);
    return newItem;
  },

  // ── Seed Menu (admin one-time setup) ─────────────────────
  seedMenu: async (): Promise<{ seeded: boolean; count: number }> => {
    // Force reset for categories update
    await set(ref(db, 'menu'), null);

    const INITIAL_MENU = [
      { name: 'Tandoori Pizza', category: 'snacks', price: 350, dietary: 'Veg', allergens: ['Dairy', 'Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600', rating: 4.3, reviews: 27, prepTime: '15-30 min', distance: '1.3 km' },
      { name: 'Burger Deluxe', category: 'lunch', price: 180, dietary: 'Non-Veg', allergens: ['Gluten', 'Dairy', 'Egg'], status: 'Available', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600', rating: 4.7, reviews: 35, prepTime: '20-35 min', distance: '2.5 km' },
      { name: 'Chinese Fried Noodles', category: 'dinner', price: 120, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=600', rating: 4.5, reviews: 42, prepTime: '20-35 min', distance: '2.1 km' },
      { name: 'Rajma Chawal', category: 'lunch', price: 80, dietary: 'Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1626082895617-2c6bfcc32746?auto=format&fit=crop&q=80&w=600', rating: 4.8, reviews: 120, prepTime: '5-10 min', distance: '0 km (Campus)' },
      { name: 'Vada Pav', category: 'snacks', price: 35, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&q=80&w=600', rating: 4.2, reviews: 89, prepTime: '5 min', distance: '0 km (Campus)' },
      { name: 'Dal Tadka + Rice', category: 'dinner', price: 70, dietary: 'Veg', allergens: [], status: 'Available', image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&q=80&w=600', rating: 4.3, reviews: 64, prepTime: '10 min', distance: '0 km (Campus)' },
      { name: 'Masala Dosa', category: 'breakfast', price: 60, dietary: 'Veg', allergens: ['Gluten'], status: 'Available', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&q=80&w=600', rating: 4.6, reviews: 98, prepTime: '10-15 min', distance: '0 km (Campus)' },
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
    const newRating = parseFloat(((item.rating + rating) / 2).toFixed(1));
    const newReviews = item.reviews + 1;
    await update(ref(db, `menu/${item_id}`), { rating: newRating, reviews: newReviews });
    return { message: 'Rating updated', item: { ...item, rating: newRating, reviews: newReviews } };
  },
};
