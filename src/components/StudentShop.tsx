import { useState, useEffect } from 'react';
import { Search, Heart, Clock, Star, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';
import type { MenuItem } from '../types';

import { api, subscribe, STORAGE_KEYS } from '../lib/api';

export default function StudentShop({ onBuyItem }: { 
  onBuyItem: (item: MenuItem) => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const loadItems = async () => {
    const data = await api.getMenu();
    setItems(data.filter(item => item.category === 'Shop' || item.category === 'Beverages'));
  };

  useEffect(() => {
    loadItems();
    const unsub = subscribe(STORAGE_KEYS.MENU, loadItems);

    // Auto-patch images in DB without requiring vendor to seed
    api.getMenu().then(async menu => {
      const images: Record<string, string> = {
        'Chips (Magic Masala)': 'https://images.unsplash.com/photo-1599599811450-2b937088b9dd?auto=format&fit=crop&q=80&w=600',
        'Cola Soft Drink': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600',
        'Vanilla Ice Cream': 'https://images.unsplash.com/photo-1570197781417-0a52375c0ba4?auto=format&fit=crop&q=80&w=600',
        'Mineral Water (1L)': 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?auto=format&fit=crop&q=80&w=600',
        'Fresh Chaas': 'https://images.unsplash.com/photo-1596450514735-111a2fe02935?auto=format&fit=crop&q=80&w=600',
        'Spicy Cup Noodles': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&q=80&w=600'
      };
      let patched = false;
      for (const item of menu) {
        if (!item.name) continue;
        let targetName = Object.keys(images).find(k => k.toLowerCase() === item.name.toLowerCase() || item.name.toLowerCase().includes(k.split(' ')[0].toLowerCase()));
        if (targetName && item.image !== images[targetName]) {
           await api.updateMenuItemImage(item.id, images[targetName]);
           patched = true;
        }
      }
      if (patched) loadItems();
    });

    return () => unsub();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCategory = true;
    const n = item.name.toLowerCase();
    if (activeCategory === 'Drinks') {
      matchesCategory = n.includes('drink') || n.includes('water') || n.includes('chaas') || n.includes('cola') || n.includes('juice');
    } else if (activeCategory === 'Snacks') {
      matchesCategory = n.includes('chips') || n.includes('cream') || n.includes('chocolate') || n.includes('cookie');
    } else if (activeCategory === 'Instant') {
      matchesCategory = n.includes('noodle') || n.includes('cup') || n.includes('maggi');
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {/* Header Area */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-b-3xl px-6 pt-4 pb-6 shadow-sm -mt-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-white">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Campus Shop</h1>
            <p className="text-indigo-200 text-sm">Grab your essentials instantly.</p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={20} />
          <input 
            type="text" 
            placeholder="Search snacks, drinks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-full py-3.5 pl-12 pr-4 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
          />
        </div>
      </div>

      <div className="flex-1 px-4 py-6 mb-20 overflow-y-auto hide-scrollbar">
        {/* Categories / Tags */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mb-6 -mx-4 px-4 pb-2">
           <button 
             onClick={() => setActiveCategory('All')}
             className={`px-4 py-1.5 text-xs font-bold uppercase rounded-full border whitespace-nowrap transition-colors ${activeCategory === 'All' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
           >
             🔥 All Items
           </button>
           <button 
             onClick={() => setActiveCategory('Drinks')}
             className={`px-4 py-1.5 text-xs font-bold uppercase rounded-full border whitespace-nowrap transition-colors ${activeCategory === 'Drinks' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
           >
             🥤 Drinks
           </button>
           <button 
             onClick={() => setActiveCategory('Snacks')}
             className={`px-4 py-1.5 text-xs font-bold uppercase rounded-full border whitespace-nowrap transition-colors ${activeCategory === 'Snacks' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
           >
             🍟 Snacks
           </button>
           <button 
             onClick={() => setActiveCategory('Instant')}
             className={`px-4 py-1.5 text-xs font-bold uppercase rounded-full border whitespace-nowrap transition-colors ${activeCategory === 'Instant' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
           >
             🍜 Instant
           </button>
        </div>

        {/* Grid layout for shop items */}
        <div className="grid grid-cols-2 gap-4">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div key={item.id} className="bg-[#18181B] border border-slate-800 rounded-2xl overflow-hidden flex flex-col relative group">
                <button className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-slate-950/60 flex items-center justify-center backdrop-blur-sm text-white/70 hover:text-white transition-colors">
                  <Heart size={14} />
                </button>
                
                <div className="h-32 w-full bg-slate-800 relative overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-white text-sm leading-tight mb-1 line-clamp-2">{item.name}</h3>
                  <div className="flex items-center text-[10px] text-slate-500 gap-2 mb-2">
                    <span className="flex items-center text-yellow-400 font-bold gap-0.5"><Star size={10} className="fill-yellow-400"/> {item.rating}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Clock size={10} /> {item.prepTime}</span>
                  </div>
                  
                  <div className="mt-auto flex items-end justify-between">
                    <div className="font-black text-white text-lg">₹{item.price}</div>
                    {(item.status === 'Available' || item.status === 'Running Low') ? (
                      <button 
                        onClick={() => onBuyItem(item)}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-xl transition-colors"
                      >
                        <ShoppingBag size={16} />
                      </button>
                    ) : (
                      <button disabled className="bg-slate-800 text-slate-500 p-2 rounded-xl cursor-not-allowed">
                         <span className="text-[10px] font-bold px-1">OUT</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-12 text-slate-500">
              <ShoppingBag size={32} className="mx-auto mb-3 opacity-20" />
              <p>No items match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
