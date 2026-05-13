import { useState, useEffect } from 'react';
import { Bell, Search, MapPin, Heart, Clock, Star, Trophy, Dumbbell } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import type { MenuItem } from '../types';

export default function StudentHome({ onBuyItem }: { 
  onBuyItem: (item: MenuItem) => void;
}) {
  const [activeMeal, setActiveMeal] = useState('All');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [activePill, setActivePill] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [crowdStatus, setCrowdStatus] = useState<{status: string, reason: string} | null>(null);

  useEffect(() => {
    api.getMenu().then(data => setMenu(data));
    api.getBroadcasts().then(data => setBroadcasts(data));
    api.predictCrowd().then(data => {
      if (data) setCrowdStatus(data);
    });
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {/* Header Search Area */}
      <div className="bg-gradient-to-br from-brand to-brand-light rounded-b-3xl px-6 pt-4 pb-6 shadow-sm -mt-1">
        <h1 className="text-2xl font-bold text-white mb-4">What would you prefer to eat today?</h1>
        
        {crowdStatus && crowdStatus.status === 'Avoid' && (
          <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-4 text-sm font-medium">
            ⚠️ Crowd Alert: {crowdStatus.reason}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search menu, categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-black/10 rounded-full py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>

      <div className="flex-1 px-4 py-4 mb-20 overflow-y-auto hide-scrollbar">
        {/* Broadcast Banner */}
        {broadcasts.map(b => (
          <div key={b.id} className={cn(
            "rounded-xl p-4 flex gap-3 shadow-md mb-6", 
            b.type === 'Info' || b.type === 'info' ? "bg-amber-500/10 border border-amber-500/30" : "bg-red-500/10 border border-red-500/30"
          )}>
            <div className={cn(
              "w-2 h-full rounded-full shrink-0", 
              b.type === 'Info' || b.type === 'info' ? "bg-amber-500" : "bg-red-500"
            )} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-xs font-bold uppercase", b.type === 'info' ? "text-amber-500" : "text-red-500")}>
                  {b.type === 'info' ? 'Update' : 'Urgent'}
                </span>
                <span className="text-[10px] text-slate-500">{b.timestamp} • {b.staffName}</span>
              </div>
              <p className="text-sm text-slate-300 font-medium leading-snug">{b.message}</p>
            </div>
          </div>
        ))}
        
        {/* Meal Time Tabs */}
        <div className="flex border-b border-slate-800 mb-6">
          {['All', 'Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => (
             <button 
               key={meal}
               onClick={() => setActiveMeal(meal)}
               className={cn(
                  "flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap px-2",
                  activeMeal === meal ? "text-brand-text border-brand-text" : "text-slate-500 border-transparent hover:text-slate-300"
               )}
             >
               {meal}
             </button>
          ))}
        </div>

        {/* What's Special Today */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            What's Special Today ✨
          </h2>
          <button className="text-xs text-sky-500 font-semibold hover:text-sky-400">See All</button>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar mb-6 -mx-4 px-4">
          <CategoryPill active={activePill === 'All'} label="All" onClick={() => setActivePill('All')} />
          <CategoryPill active={activePill === '🍔 Burgers'} label="🍔 Burgers" onClick={() => setActivePill('🍔 Burgers')} />
          <CategoryPill active={activePill === '🍕 Pizza'} label="🍕 Pizza" onClick={() => setActivePill('🍕 Pizza')} />
          <CategoryPill active={activePill === '🍪 Cookies'} label="🍪 Cookies" onClick={() => setActivePill('🍪 Cookies')} />
          <CategoryPill active={activePill === '🍜 Noodles'} label="🍜 Noodles" onClick={() => setActivePill('🍜 Noodles')} />
        </div>

        {/* Horizontal Menu Scroll */}
        <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-4 px-4 mb-8">
          {(() => {
            const filteredMenu = [...menu]
              .filter(item => activeMeal === 'All' || item.category?.toLowerCase() === activeMeal.toLowerCase())
              .filter(item => {
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase().trim();
                  return item.name.toLowerCase().includes(query) || 
                         item.category?.toLowerCase().includes(query);
                }
                if (activePill === 'All') return true;
                const searchTerm = activePill.split(' ')[1]?.toLowerCase() || activePill.toLowerCase();
                const baseTerm = searchTerm.endsWith('s') ? searchTerm.slice(0, -1) : searchTerm;
                return item.name.toLowerCase().includes(baseTerm);
              });
              
            if (filteredMenu.length === 0) {
              return (
                <div className="w-full text-center py-10 text-slate-500 font-medium">
                  No items found for this category.
                </div>
              );
            }

            return filteredMenu.map(item => (
            <div key={item.id} className="min-w-[200px] bg-[#18181B] rounded-2xl overflow-hidden shrink-0 group relative">
              <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                10% Off
              </div>
              <button className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-slate-950/40 flex items-center justify-center backdrop-blur-sm text-white/70 hover:text-white">
                <Heart size={14} />
              </button>
              
              <div className="h-32 w-full relative overflow-hidden bg-slate-800">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {item.isProteinRich && (
                  <div className="absolute bottom-1.5 left-1.5 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-lg">
                    <Dumbbell size={8} /> {item.proteinGrams}g
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-slate-100 text-base mb-1 truncate">{item.name}</h3>
                
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <span className="flex items-center gap-1"><Clock size={12} /> {item.prepTime}</span>
                  <span>•</span>
                  <span>{item.distance}</span>
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-yellow-400 font-bold">{item.rating}</span>
                    <span className="text-[10px] text-slate-500">({item.reviews} Reviews)</span>
                  </div>
                  <div className="font-bold text-white">₹{item.price.toFixed(2)}</div>
                </div>

                <StatusBadge status={item.status} />

                {item.status === 'Available' || item.status === 'Running Low' ? (
                  <button 
                    onClick={() => onBuyItem(item)}
                    className="mt-3 w-full bg-brand hover:bg-brand-light text-white font-bold py-2 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Buy Now
                  </button>
                ) : (
                  <button disabled className="mt-3 w-full bg-slate-800 text-slate-500 font-bold py-2 rounded-xl text-sm cursor-not-allowed">
                    Sold Out
                  </button>
                )}
              </div>
            </div>
            ));
          })()}
        </div>

        {/* Promo Banner */}
        <div className="bg-sky-500 rounded-2xl p-5 flex items-center justify-between relative overflow-hidden mb-8 shadow-lg shadow-sky-500/20">
          <div className="relative z-10">
            <div className="text-white text-lg font-bold w-4/5 mb-3 leading-tight">Up To 30% Off On First Order</div>
            <button className="bg-slate-950/20 hover:bg-slate-950/30 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors">
              Order Now
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-80 mix-blend-overlay">
             <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover rounded-full" alt="Promo" />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-4">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-white text-lg font-bold flex items-center gap-2">Campus Leaderboard</h2>
             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Top Rated Foods</span>
           </div>
           <div className="bg-[#18181B] rounded-2xl border border-slate-800 p-4 space-y-4">
              {[...menu].sort((a,b) => (b.rating * b.reviews) - (a.rating * a.reviews)).slice(0, 3).map((item, i) => (
                 <div key={item.id} className="flex items-center gap-4 cursor-pointer group" onClick={() => onBuyItem(item)}>
                    <div className="w-6 text-center text-lg font-black text-slate-600 group-hover:text-amber-500 transition-colors">#{i+1}</div>
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-800">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1">
                       <h4 className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors">{item.name}</h4>
                       <div className="flex items-center text-[10px] text-slate-400 gap-2 mt-0.5">
                          <span className="flex items-center text-yellow-400 font-bold gap-0.5">
                            <Star size={10} className="fill-yellow-400" /> {item.rating}
                          </span>
                          <span>•</span>
                          <span>{item.reviews} Reviews</span>
                       </div>
                    </div>
                    {i === 0 && <div className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"><Trophy size={18}/></div>}
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}

function CategoryPill({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-colors shrink-0",
        active ? "bg-white text-black" : "bg-[#18181B] text-slate-300 border border-slate-800 hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Finished') {
    return <span className="inline-block px-2 text-[10px] font-bold text-slate-500 bg-slate-800 rounded-sm">FINISHED</span>;
  }
  if (status === 'Running Low') {
    return <span className="inline-block px-2 text-[10px] font-bold text-amber-500 bg-amber-500/10 rounded-sm">RUNNING LOW</span>;
  }
  return <span className="inline-block px-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 rounded-sm">AVAILABLE</span>;
}
