import { useState, useEffect } from 'react';
import { Send, TrendingUp, AlertTriangle, ArrowRight, ArrowDownRight, ArrowUpRight, ImageIcon, ChefHat, CheckCircle2, Clock, Package, RefreshCw, Timer, Trash2, Leaf } from 'lucide-react';
import { cn } from '../lib/utils';
import { api, subscribe, STORAGE_KEYS, type MenuTemplate } from '../lib/api';
import { getVendorActionBoard } from '../lib/gemini';
import type { Order, MenuItem, HealthLevel } from '../types';

export default function VendorDashboard() {
  // Template form state
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('breakfast');
  const [templatePrice, setTemplatePrice] = useState('');
  const [templateAllergens, setTemplateAllergens] = useState('');
  const [templateImage, setTemplateImage] = useState('');

  // Templates list
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);

  // Broadcast state
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Action Board state
  const [actionBoard, setActionBoard] = useState<{
    serveDaily: any[]; reviewRecipe: any[]; considerRemoving: any[];
  }>({ serveDaily: [], reviewRecipe: [], considerRemoving: [] });
  const [loadingBoard, setLoadingBoard] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadTemplates();
    loadOrders();
    loadBroadcasts();
    loadMenuItems();

    // Subscribe to order changes + poll
    const unsub = subscribe(STORAGE_KEYS.ORDERS, loadOrders);
    const unsubBroadcasts = subscribe(STORAGE_KEYS.BROADCASTS, loadBroadcasts);
    const interval = setInterval(loadOrders, 3000);
    return () => { unsub(); unsubBroadcasts(); clearInterval(interval); };
  }, []);

  const loadTemplates = async () => {
    const data = await api.getMenuTemplates();
    if (data) setTemplates(data);
  };

  const loadOrders = async () => {
    const data = await api.getOrders();
    setOrders(data);
  };

  const loadBroadcasts = async () => {
    const data = await api.getBroadcasts();
    setBroadcasts(data);
  };

  const loadMenuItems = async () => {
    const data = await api.getMenu();
    setMenuItems(data);
    if (data.length > 0) {
      setLoadingBoard(true);
      getVendorActionBoard(data).then(board => {
        if (board) setActionBoard(board);
        setLoadingBoard(false);
      }).catch(() => setLoadingBoard(false));
    }
  };

  const handleSetHealthLevel = async (itemId: string, level: HealthLevel) => {
    await api.setMenuItemHealthLevel(itemId, level);
    loadMenuItems();
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !templatePrice) return alert('Name and Price are required');

    const allergy_tags = templateAllergens ? templateAllergens.split(',').map(s => s.trim()) : [];
    const image = templateImage.trim() || undefined;
    const price = parseFloat(templatePrice);

    const res = await api.createMenuTemplate({ name: templateName, category: templateCategory, price, allergy_tags, image });

    if (res && res.id) {
      alert('✅ Template Created!');
      setTemplateName('');
      setTemplatePrice('');
      setTemplateAllergens('');
      setTemplateImage('');
      loadTemplates();
    }
  };

  const handleAddToMenu = async (template_id: string) => {
    const res = await api.addFromTemplate(template_id);
    if (res && 'error' in res) {
      alert(`Error: ${res.error}`);
    } else {
      alert("✅ Added to today's menu!");
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) return alert('Enter a broadcast message');
    await api.sendBroadcast(broadcastMsg, isUrgent);
    alert('📢 Broadcast sent!');
    setBroadcastMsg('');
    setIsUrgent(false);
    loadBroadcasts();
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm('Delete this broadcast?')) return;
    await api.deleteBroadcast(id);
    loadBroadcasts();
  };

  const handleSeedMenu = async () => {
    if (!confirm('Seed initial menu items into Firebase? This will only run if the menu is empty.')) return;
    setSeeding(true);
    try {
      const res = await api.seedMenu();
      if (res.seeded) {
        alert(`✅ Seeded ${res.count} menu items into Firebase!`);
      } else {
        alert(`ℹ️ Menu already has ${res.count} items — no seeding needed.`);
      }
    } finally {
      setSeeding(false);
    }
  };

  const handleUpdateOrder = async (orderId: string, status: 'preparing' | 'ready' | 'picked_up', minutes?: number) => {
    // If starting to cook and a timer was set, save it first
    if (status === 'preparing' && minutes) {
      await api.setOrderTimer(orderId, minutes);
    }
    await api.updateOrderStatus(orderId, status);
    loadOrders();
  };

  const handleSetTimer = async (orderId: string, additionalMinutes: number) => {
    // Add more time to an in-progress order
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const currentRemaining = order.estimated_ready_at 
      ? Math.max(0, Math.ceil((new Date(order.estimated_ready_at).getTime() - Date.now()) / 60000))
      : 0;
    await api.setOrderTimer(orderId, currentRemaining + additionalMinutes);
    loadOrders();
  };

  // Categorize orders
  const queuedOrders = orders.filter(o => o.status === 'queued');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const completedOrders = orders.filter(o => o.status === 'picked_up').slice(0, 5);

  return (
    <div className="p-6 md:p-10 flex flex-col min-h-screen bg-slate-950">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Staff Command Center</h1>
          <p className="text-sm text-slate-400">Manage orders, broadcasts, and menu.</p>
        </div>
        <div className="flex gap-2 text-sm flex-wrap">
          <button
            onClick={handleSeedMenu}
            disabled={seeding}
            className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-medium px-3 py-1 rounded-full flex items-center gap-2 transition-colors text-xs disabled:opacity-50"
          >
            {seeding ? '⏳ Seeding...' : '🌱 Seed Menu'}
          </button>
          <span className="bg-emerald-500/10 text-emerald-500 font-medium px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live
          </span>
        </div>
      </div>

      {/* ═══════════════ ORDER MANAGEMENT ═══════════════ */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">📦 Live Order Queue</h2>
            <p className="text-xs text-slate-500">Process incoming student orders in real-time.</p>
          </div>
          <button onClick={loadOrders} className="text-xs text-sky-500 font-semibold hover:text-sky-400 flex items-center gap-1">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {orders.filter(o => o.status !== 'picked_up').length === 0 ? (
          <div className="bg-[#18181B] border border-slate-800 rounded-2xl p-8 text-center mb-6">
            <Package size={40} className="text-slate-700 mx-auto mb-3" />
            <h3 className="text-white font-bold mb-1">No Pending Orders</h3>
            <p className="text-xs text-slate-500">When students place orders, they'll appear here for processing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Queued Column */}
            <div>
              <div className="bg-yellow-500/10 text-yellow-500 border-b-2 border-yellow-500/20 px-4 py-2 rounded-t-xl font-bold text-sm uppercase tracking-wide flex justify-between items-center mb-3">
                <span className="flex items-center gap-2"><Clock size={14} /> In Queue</span>
                <span>{queuedOrders.length}</span>
              </div>
              <div className="space-y-3">
                {queuedOrders.map(order => (
                  <OrderCard key={order.id} order={order} onAction={(mins) => handleUpdateOrder(order.id, 'preparing', mins)} actionLabel="Start Cooking" actionColor="bg-orange-500 hover:bg-orange-600" />
                ))}
              </div>
            </div>

            {/* Preparing Column */}
            <div>
              <div className="bg-orange-500/10 text-orange-500 border-b-2 border-orange-500/20 px-4 py-2 rounded-t-xl font-bold text-sm uppercase tracking-wide flex justify-between items-center mb-3">
                <span className="flex items-center gap-2"><ChefHat size={14} /> Cooking</span>
                <span>{preparingOrders.length}</span>
              </div>
              <div className="space-y-3">
                {preparingOrders.map(order => (
                  <OrderCard key={order.id} order={order} onAction={() => handleUpdateOrder(order.id, 'ready')} onSetTimer={(mins) => handleSetTimer(order.id, mins)} actionLabel="Mark Ready" actionColor="bg-emerald-500 hover:bg-emerald-600" />
                ))}
              </div>
            </div>

            {/* Ready Column */}
            <div>
              <div className="bg-emerald-500/10 text-emerald-500 border-b-2 border-emerald-500/20 px-4 py-2 rounded-t-xl font-bold text-sm uppercase tracking-wide flex justify-between items-center mb-3">
                <span className="flex items-center gap-2"><CheckCircle2 size={14} /> Ready</span>
                <span>{readyOrders.length}</span>
              </div>
              <div className="space-y-3">
                {readyOrders.map(order => (
                  <OrderCard key={order.id} order={order} onAction={() => handleUpdateOrder(order.id, 'picked_up')} actionLabel="Picked Up" actionColor="bg-slate-600 hover:bg-slate-500" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Completed Orders */}
        {completedOrders.length > 0 && (
          <div className="bg-[#18181B] border border-slate-800 rounded-2xl p-4">
            <h3 className="font-bold text-white text-sm mb-3">Recently Completed</h3>
            <div className="space-y-2">
              {completedOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-2 bg-slate-950 rounded-lg text-xs opacity-60">
                  <span className="text-slate-400 font-bold">{order.tokenNo}</span>
                  <span className="text-slate-500">{order.items.map((i: any) => i.name).join(', ')}</span>
                  <span className="text-slate-600">₹{order.total_amount.toFixed(2)}</span>
                  <span className="text-emerald-600 font-bold">DONE</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ BROADCAST + DEMAND ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Broadcast Tool */}
        <div className="lg:col-span-2 bg-[#18181B] rounded-2xl border border-slate-800 flex flex-col">
          <div className="p-5 border-b border-slate-800">
            <h2 className="font-bold text-white mb-1">Live Broadcast</h2>
            <p className="text-xs text-slate-500">Push instant updates to student Home screens.</p>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <textarea 
              placeholder="E.g. Rajma Chawal is running out fast..." 
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-sky-500/50 resize-none h-24 mb-4"
            ></textarea>
            
            <div className="flex flex-wrap gap-2 mb-4">
               <span className="text-[10px] uppercase font-bold text-slate-600 self-center mr-2">Templates:</span>
               <button onClick={() => setBroadcastMsg('Item finished early. Replacing with alternative.')} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-full transition-colors">Item Finished</button>
               <button onClick={() => setBroadcastMsg('Replacing current item with a new option.')} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-full transition-colors">Replacing With</button>
               <button onClick={() => setBroadcastMsg('Main Mess closed temporarily due to cleaning.')} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/20 transition-colors">Mess Closed</button>
            </div>
            
            <div className="mt-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <input type="checkbox" id="urgent" className="accent-red-500" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} />
                 <label htmlFor="urgent" className="text-xs font-bold text-red-500 uppercase tracking-widest">Mark Urgent</label>
              </div>
              <button onClick={handleSendBroadcast} className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-2 rounded-xl text-sm transition-colors flex items-center gap-2">
                Send to All <Send size={14} />
              </button>
            </div>

            {broadcasts.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Active Broadcasts</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {broadcasts.map(b => (
                    <div key={b.id} className="flex justify-between items-start bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[10px] font-bold uppercase", b.type === 'urgent' ? "text-red-500" : "text-amber-500")}>
                            {b.type === 'info' ? 'Update' : b.type}
                          </span>
                          <span className="text-[10px] text-slate-500">{b.timestamp}</span>
                        </div>
                        <p className="text-sm text-slate-300">{b.message}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteBroadcast(b.id)}
                        className="text-slate-500 hover:text-red-500 transition-colors p-1"
                        title="Delete Broadcast"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Demand Queue */}
        <div className="bg-[#18181B] rounded-2xl border border-slate-800 flex flex-col">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-white mb-1">Pre-order Demand</h2>
              <p className="text-xs text-slate-500">Next 60 mins</p>
            </div>
            <div className="text-2xl font-black text-sky-500">{orders.filter(o => o.status !== 'picked_up').length || 0}</div>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-3">
             <DemandRow item="Rajma Chawal" count={67} max={100} color="bg-emerald-500" />
             <DemandRow item="Dal Tadka" count={43} max={100} color="bg-emerald-500" />
             <DemandRow item="Burger Deluxe" count={18} max={100} color="bg-yellow-400" />
             <DemandRow item="Chinese Fried Noodles" count={6} max={100} color="bg-slate-600" />
          </div>
        </div>
      </div>
      
      {/* ═══════════════ VOUCH ACTION BOARD ═══════════════ */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-white">AI Vouch Action Board</h2>
        {loadingBoard && <span className="text-xs text-brand-light animate-pulse">Analyzing menu...</span>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Column title="Serve Daily" count={actionBoard.serveDaily.length} color="text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
           {actionBoard.serveDaily.map((item, i) => (
             <ActionCard key={i} item={item.item} rating={item.rating} subtext={item.subtext} trend={item.trend} />
           ))}
           {actionBoard.serveDaily.length === 0 && !loadingBoard && <p className="text-xs text-slate-500 italic p-2">No items qualified.</p>}
        </Column>

        <Column title="Review Recipe" count={actionBoard.reviewRecipe.length} color="text-yellow-400 bg-yellow-400/10 border-yellow-400/20">
           {actionBoard.reviewRecipe.map((item, i) => (
             <ActionCard key={i} item={item.item} rating={item.rating} subtext={item.subtext} trend={item.trend} />
           ))}
           {actionBoard.reviewRecipe.length === 0 && !loadingBoard && <p className="text-xs text-slate-500 italic p-2">No items qualified.</p>}
        </Column>

        <Column title="Consider Removing" count={actionBoard.considerRemoving.length} color="text-red-500 bg-red-500/10 border-red-500/20">
           {actionBoard.considerRemoving.map((item, i) => (
             <ActionCard key={i} item={item.item} rating={item.rating} subtext={item.subtext} trend={item.trend} />
           ))}
           {actionBoard.considerRemoving.length === 0 && !loadingBoard && <p className="text-xs text-slate-500 italic p-2">No items qualified.</p>}
        </Column>
      </div>

      {/* ═══════════════ MENU TEMPLATES ═══════════════ */}
      <div className="mb-10">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Menu Templates</h2>
            <p className="text-xs text-slate-500">Create reusable menu items and add them to today's menu.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#18181B] rounded-2xl border border-slate-800 p-5 lg:col-span-1 flex flex-col">
            <h3 className="font-bold text-white mb-4">Create New Template</h3>
            <div className="space-y-3 flex-1">
              <input type="text" placeholder="Item Name (e.g. Masala Dosa)" value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-sky-500/50" />
              <div className="flex gap-3">
                <select value={templateCategory} onChange={e => setTemplateCategory(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:border-sky-500/50 appearance-none">
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="snacks">Snacks</option>
                  <option value="dinner">Dinner</option>
                </select>
                <input type="number" placeholder="Price (₹)" value={templatePrice} onChange={e => setTemplatePrice(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-sky-500/50" />
              </div>
              <input type="text" placeholder="Allergens (comma separated)" value={templateAllergens} onChange={e => setTemplateAllergens(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-sky-500/50" />
              <input type="text" placeholder="Image URL (e.g. https://...)" value={templateImage} onChange={e => setTemplateImage(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-sky-500/50" />
            </div>
            <button 
              onClick={handleSaveTemplate}
              className="w-full mt-4 bg-slate-100 hover:bg-white text-black font-bold px-4 py-3 rounded-xl text-sm transition-colors"
            >
              Save Template
            </button>
          </div>

          <div className="bg-[#18181B] rounded-2xl border border-slate-800 p-5 lg:col-span-2 flex flex-col">
             <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
               <h3 className="font-bold text-white">Saved Templates</h3>
               <button onClick={loadTemplates} className="text-xs text-sky-500 font-semibold hover:text-sky-400">Refresh Templates</button>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-2 pr-2">
               {templates.length === 0 ? (
                 <div className="text-center text-slate-500 text-sm py-10">No templates yet. Create one to get started!</div>
               ) : (
                 templates.map(t => (
                   <div key={t.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800/50">
                     <div className="flex items-center gap-3">
                       {t.image ? (
                         <img src={t.image} className="w-10 h-10 rounded-lg object-cover" alt={t.name} />
                       ) : (
                         <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-slate-600 border border-slate-800">
                           <ImageIcon size={16} />
                         </div>
                       )}
                       <div>
                         <div className="text-sm font-bold text-white mb-0.5">{t.name}</div>
                         <div className="text-[10px] text-slate-500 uppercase tracking-wider">{t.category} • ₹{t.price}</div>
                       </div>
                     </div>
                     <button 
                       onClick={() => handleAddToMenu(t.id)}
                       className="bg-brand hover:bg-brand-light text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                     >
                       Add to Today's Menu
                     </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2"><Leaf size={20} className="text-emerald-500" /> Menu Health Ratings</h2>
            <p className="text-xs text-slate-500">Set health level for each menu item. Affects student Life GPA and reward points.</p>
          </div>
          <button onClick={loadMenuItems} className="text-xs text-sky-500 font-semibold hover:text-sky-400 flex items-center gap-1">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="bg-[#18181B] rounded-2xl border border-slate-800 p-5">
          {menuItems.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No menu items. Seed the menu first.</div>
          ) : (
            <div className="space-y-3">
              {menuItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/50">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image && <img src={item.image} className="w-10 h-10 rounded-lg object-cover shrink-0" alt={item.name} />}
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.category} · ₹{item.price}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {([1, 2, 3] as HealthLevel[]).map(level => (
                      <button
                        key={level}
                        onClick={() => handleSetHealthLevel(item.id, level)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                          (item.healthLevel || 1) === level
                            ? level === 3 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                            : level === 2 ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                            : "bg-red-500 text-white shadow-lg shadow-red-500/30"
                            : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                        )}
                        title={level === 1 ? 'Indulgent' : level === 2 ? 'Moderate' : 'Healthy'}
                      >
                        {level === 1 ? '🍟' : level === 2 ? '🥗' : '💚'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"></span> 🍟 Indulgent (Level 1)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> 🥗 Moderate (Level 2)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> 💚 Healthy (Level 3)</span>
          </div>
        </div>
      </div>

      {/* Daily Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <MetricCard title="Total Revenue" value={`₹${orders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(0)}`} trend={`${orders.length} orders`} />
         <MetricCard title="Food Waste Reduced" value="31%" trend="vs last month avg" />
         <MetricCard title="Active Orders" value={String(orders.filter(o => o.status !== 'picked_up').length)} trend="pending right now" />
         <MetricCard title="Avg Rating" value="4.3" trend="+0.2 vs yesterday" />
      </div>

    </div>
  );
}

// ─── Order Card Component ────────────────────────────────────
function OrderCard({ order, onAction, onSetTimer, actionLabel, actionColor }: { 
  order: Order; 
  onAction: (minutes?: number) => void; 
  onSetTimer?: (minutes: number) => void;
  actionLabel: string; 
  actionColor: string;
}) {
  const [timerMinutes, setTimerMinutes] = useState(order.estimated_minutes || 15);
  const [countdown, setCountdown] = useState('');
  const timeAgo = getTimeAgo(order.created_at);

  // Live countdown for preparing orders
  useEffect(() => {
    if (order.status !== 'preparing' || !order.estimated_ready_at) return;

    const tick = () => {
      const remaining = new Date(order.estimated_ready_at!).getTime() - Date.now();
      if (remaining <= 0) {
        setCountdown('00:00');
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [order.status, order.estimated_ready_at]);

  const isOverdue = order.estimated_ready_at && new Date(order.estimated_ready_at).getTime() < Date.now();

  return (
    <div className="bg-[#18181B] border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="text-2xl font-black text-white">{order.tokenNo}</div>
        <span className="text-[10px] text-slate-500">{timeAgo}</span>
      </div>
      <div className="space-y-1.5 mb-3">
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            {item.image && <img src={item.image} className="w-8 h-8 rounded-md object-cover shrink-0" alt="" />}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-white truncate block">{item.name}</span>
              <span className="text-[10px] text-slate-500">×{item.quantity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Timer section — only for queued orders (vendor sets prep time before starting) */}
      {order.status === 'queued' && (
        <div className="mb-3 bg-slate-950 rounded-lg p-3 border border-slate-800/50">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <Timer size={10} /> Set Prep Time
          </div>
          <div className="flex items-center gap-2">
            {[5, 10, 15, 20, 30].map(m => (
              <button
                key={m}
                onClick={() => setTimerMinutes(m)}
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded transition-colors",
                  timerMinutes === m
                    ? "bg-sky-500 text-white" 
                    : "bg-slate-800 text-slate-400 hover:text-white"
                )}
              >
                {m}m
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={120}
              value={timerMinutes}
              onChange={e => setTimerMinutes(Math.max(1, parseInt(e.target.value) || 15))}
              className="w-12 bg-slate-800 border border-slate-700 rounded text-white text-[10px] text-center py-1 focus:outline-none focus:border-sky-500"
            />
            <span className="text-[10px] text-slate-500">min</span>
          </div>
        </div>
      )}

      {/* Countdown for cooking orders */}
      {order.status === 'preparing' && order.estimated_ready_at && (
        <div className={cn(
          "mb-3 rounded-lg p-3 border text-center",
          isOverdue 
            ? "bg-red-500/10 border-red-500/30" 
            : "bg-sky-500/10 border-sky-500/20"
        )}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: isOverdue ? '#ef4444' : '#0ea5e9' }}>
            {isOverdue ? '⚠️ Overdue' : '⏱ Time Remaining'}
          </div>
          <div className={cn(
            "text-2xl font-black font-mono tracking-widest",
            isOverdue ? "text-red-500 animate-pulse" : "text-sky-400"
          )}>
            {countdown}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {order.estimated_minutes}min set • ETA {new Date(order.estimated_ready_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {/* Allow adjusting timer while cooking */}
          {onSetTimer && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <span className="text-[10px] text-slate-500">Adjust:</span>
              {[5, 10].map(m => (
                <button 
                  key={m}
                  onClick={() => onSetTimer(m)} 
                  className="text-[9px] font-bold bg-slate-800 text-sky-400 hover:bg-slate-700 px-2 py-0.5 rounded transition-colors"
                >
                  +{m}m
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ready orders — show completed timer info */}
      {order.status === 'ready' && order.estimated_minutes && (
        <div className="mb-3 bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20 text-center">
          <span className="text-[10px] text-emerald-400 font-bold">✅ Ready • Was set for {order.estimated_minutes}min</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-white">₹{order.total_amount.toFixed(2)}</span>
        <button 
          onClick={() => order.status === 'queued' ? onAction(timerMinutes) : onAction()} 
          className={cn("text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors", actionColor)}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Reusable sub-components ─────────────────────────────────

function DemandRow({ item, count, max, color }: { item: string, count: number, max: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-white mb-1">
        <span>{item}</span>
        <span>{count}</span>
      </div>
      <div className="w-full bg-slate-950 rounded-full h-1.5">
        <div className={cn("h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]", color)} style={{ width: `${(count/max)*100}%` }}></div>
      </div>
    </div>
  );
}

function Column({ title, count, color, children }: { title: string, count: number, color: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className={cn("px-4 py-2 rounded-t-xl border-b-2 font-bold flex justify-between items-center text-sm uppercase tracking-wide", color)}>
        {title} <span>{count}</span>
      </div>
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

function ActionCard({ item, rating, subtext, trend }: { item: string, rating: string, subtext: string, trend: 'up'|'down'|'stale' }) {
  return (
    <div className="bg-[#18181B] border border-slate-800 p-4 rounded-xl flex justify-between items-center hover:border-slate-700 transition-colors cursor-pointer group">
       <div>
         <h4 className="font-bold text-white text-sm mb-1 group-hover:text-yellow-400 transition-colors">{item}</h4>
         <div className="flex items-center gap-2 text-xs">
           <span className="font-bold text-slate-300">{rating}</span>
           <span className="text-slate-600">•</span>
           <span className="text-slate-500 leading-none">{subtext}</span>
         </div>
       </div>
       <div className="text-slate-600">
         {trend === 'up' && <ArrowUpRight size={16} className="text-emerald-500" />}
         {trend === 'down' && <ArrowDownRight size={16} className="text-red-500" />}
         {trend === 'stale' && <ArrowRight size={16} />}
       </div>
    </div>
  );
}

function MetricCard({ title, value, trend }: { title: string, value: string, trend: string }) {
  const isPositive = trend.includes('+') || trend.includes('Reduced') || trend.includes('orders');
  return (
    <div className="bg-[#18181B] border border-slate-800 p-5 rounded-2xl">
      <h4 className="text-xs text-slate-500 font-medium mb-2">{title}</h4>
      <div className="text-2xl font-black text-white mb-2">{value}</div>
      <div className={cn("text-[10px] font-bold flex items-center gap-1", isPositive ? "text-emerald-500" : "text-yellow-400")}>
        {isPositive ? <ArrowUpRight size={12} /> : <AlertTriangle size={12} />} {trend}
      </div>
    </div>
  );
}
