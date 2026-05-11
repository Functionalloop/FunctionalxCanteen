/**
 * Firebase Realtime Database Seed Script
 * Run: npx tsx scripts/seedFirebase.ts
 *
 * Seeds the initial menu items into Firebase RTDB.
 * Only runs if the menu node is empty — safe to run multiple times.
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBLROrBmBTsI8_KXHFgTMp-9CVCk3XkDQA',
  authDomain: 'functionalcanteen.firebaseapp.com',
  projectId: 'functionalcanteen',
  storageBucket: 'functionalcanteen.firebasestorage.app',
  messagingSenderId: '888055638131',
  appId: '1:888055638131:web:1fbe64e577df83825b2206',
  databaseURL: 'https://functionalcanteen-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const MENU_ITEMS = [
  {
    name: 'Tandoori Pizza',
    category: 'snacks',
    price: 350.00,
    dietary: 'Veg',
    allergens: ['Dairy', 'Gluten'],
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600',
    rating: 4.3,
    reviews: 27,
    prepTime: '15-30 min',
    distance: '1.3 km',
  },
  {
    name: 'Burger Deluxe',
    category: 'lunch',
    price: 180.00,
    dietary: 'Non-Veg',
    allergens: ['Gluten', 'Dairy', 'Egg'],
    status: 'Running Low',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600',
    rating: 4.7,
    reviews: 35,
    prepTime: '20-35 min',
    distance: '2.5 km',
  },
  {
    name: 'Chinese Fried Noodles',
    category: 'dinner',
    price: 120.00,
    dietary: 'Veg',
    allergens: ['Gluten'],
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=600',
    rating: 4.5,
    reviews: 42,
    prepTime: '20-35 min',
    distance: '2.1 km',
  },
  {
    name: 'Rajma Chawal',
    category: 'lunch',
    price: 80.00,
    dietary: 'Veg',
    allergens: [],
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1626082895617-2c6bfcc32746?auto=format&fit=crop&q=80&w=600',
    rating: 4.8,
    reviews: 120,
    prepTime: '5-10 min',
    distance: '0 km (Campus)',
  },
  {
    name: 'Vada Pav',
    category: 'snacks',
    price: 35.00,
    dietary: 'Veg',
    allergens: ['Gluten'],
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&q=80&w=600',
    rating: 4.2,
    reviews: 89,
    prepTime: '5 min',
    distance: '0 km (Campus)',
  },
  {
    name: 'Dal Tadka + Rice',
    category: 'dinner',
    price: 70.00,
    dietary: 'Veg',
    allergens: [],
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&q=80&w=600',
    rating: 4.3,
    reviews: 64,
    prepTime: '10 min',
    distance: '0 km (Campus)',
  },
  {
    name: 'Masala Dosa',
    category: 'breakfast',
    price: 60.00,
    dietary: 'Veg',
    allergens: ['Gluten'],
    status: 'Available',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&q=80&w=600',
    rating: 4.6,
    reviews: 98,
    prepTime: '10-15 min',
    distance: '0 km (Campus)',
  },
];

const BROADCASTS = [
  {
    message: 'Rajma Chawal is available fresh from today! Come get it hot.',
    type: 'info',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    staffName: 'Head Chef',
  },
];

async function seed() {
  console.log('🌱 Seeding Firebase RTDB...');

  // Menu
  const menuSnap = await get(ref(db, 'menu'));
  if (!menuSnap.exists()) {
    console.log('  → Seeding menu items...');
    for (const item of MENU_ITEMS) {
      const newRef = push(ref(db, 'menu'));
      await set(newRef, { ...item, id: newRef.key });
    }
    console.log(`  ✅ Seeded ${MENU_ITEMS.length} menu items`);
  } else {
    console.log('  ⏭ Menu already exists, skipping');
  }

  // Broadcasts
  const bcastSnap = await get(ref(db, 'broadcasts'));
  if (!bcastSnap.exists()) {
    console.log('  → Seeding broadcasts...');
    for (const b of BROADCASTS) {
      const newRef = push(ref(db, 'broadcasts'));
      await set(newRef, { ...b, id: newRef.key });
    }
    console.log(`  ✅ Seeded ${BROADCASTS.length} broadcasts`);
  } else {
    console.log('  ⏭ Broadcasts already exist, skipping');
  }

  // Token counter
  const tokenSnap = await get(ref(db, 'tokenCounter'));
  if (!tokenSnap.exists()) {
    await set(ref(db, 'tokenCounter'), 46);
    console.log('  ✅ Set token counter to 46');
  }

  console.log('\n🎉 Seeding complete! Firebase RTDB is ready.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
