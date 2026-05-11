import { useState, useEffect } from 'react';
import { Ticket, Clock, CheckCircle2, ChevronRight, Moon, Users, Package, ChefHat, ShoppingBag, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { api, subscribe, STORAGE_KEYS } from '../lib/api';
import type { Order } from '../types';

export default function StudentQueue({ onNavigate }: { onNavigate: (screen: 'checkout') => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  const loadOrders = async () => {
    const all = await api.getMyOrders();
    const active = all.filter(o => o.status !== 'picked_up');
    setOrders(active);
    setAllOrders(all);
  };

  useEffect(() => {
    loadOrders();
    // Subscribe to order changes
    const unsub = subscribe(STORAGE_KEYS.ORDERS, loadOrders);
    // Also poll every 3 seconds so vendor updates show up
    const interval = setInterval(loadOrders, 3000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const activeOrder = orders.length > 0 ? orders[0] : null;
  const pastOrders = allOrders.filter(o => o.status === 'picked_up').slice(0, 5);

  return (
    <div className="px-6 py-12 flex flex-col min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Queue & Orders</h1>
          <p className="text-sm text-slate-400">Track your food and predict crowds.</p>
        </div>
        <button onClick={loadOrders} className="p-2 text-slate-500 hover:text-white transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="space-y-6">
        
        {/* Active Order(s) */}
        {activeOrder ? (
          <ActiveOrderCard order={activeOrder} />
        ) : (
          <div className="bg-[#18181B] border border-slate-800 rounded-2xl p-8 text-center">
            <ShoppingBag size={40} className="text-slate-700 mx-auto mb-3" />
            <h3 className="text-white font-bold mb-1">No Active Orders</h3>
            <p className="text-xs text-slate-500">Place an order from the Home tab to see it here.</p>
          </div>
        )}

        {/* Other Queued Orders */}
        {orders.length > 1 && (
          <div>
            <h3 className="font-bold text-white text-sm mb-3">Other Active Orders</h3>
            <div className="space-y-2">
              {orders.slice(1).map(order => (
                <div key={order.id} className="bg-[#18181B] border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-black text-white">{order.tokenNo}</div>
                    <div>
                      <div className="text-sm font-bold text-white">{order.items.map((i: any) => i.name).join(', ')}</div>
                      <div className="text-[10px] text-slate-500">₹{order.total_amount.toFixed(2)}</div>
                    </div>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Peak Hours Predictor */}
        <div className="bg-[#18181B] rounded-2xl p-5 border border-slate-800">
          <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
             Campus Peak Hours
          </h3>
          
          <div className="space-y-3 mb-4">
            <PeakBar time="12:30 PM" level={30} label="Quiet" />
            <PeakBar time="1:00 PM" level={90} label="Avoid" color="bg-red-500" />
            <PeakBar time="1:30 PM" level={100} label="Peak" color="bg-red-500" />
            <PeakBar time="2:00 PM" level={60} label="Busy" color="bg-amber-500" />
            <PeakBar time="2:30 PM" level={20} label="Quiet" />
          </div>

          <p className="text-[10px] text-slate-500 text-center">Data seeded from academic timetable.</p>
        </div>

        {/* Past Orders */}
        {pastOrders.length > 0 && (
          <div>
            <h3 className="font-bold text-white text-sm mb-3">Past Orders</h3>
            <div className="space-y-2">
              {pastOrders.map(order => (
                <div key={order.id} className="bg-[#18181B] border border-slate-800/50 rounded-xl p-4 flex justify-between items-center opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-slate-400">{order.tokenNo}</div>
                    <div>
                      <div className="text-sm text-slate-400">{order.items.map((i: any) => i.name).join(', ')}</div>
                      <div className="text-[10px] text-slate-600">₹{order.total_amount.toFixed(2)}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded">COMPLETED</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Night Booking Banner */}
        <button className="w-full bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-2xl p-4 flex items-center gap-4 transition-colors text-left group">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex flex-col items-center justify-center shrink-0 text-indigo-400 group-hover:scale-110 transition-transform">
            <Moon size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-indigo-400 font-bold text-sm mb-1">Night Booking Active</h4>
            <p className="text-xs text-indigo-200/60 leading-snug">Book tomorrow's breakfast tonight before midnight.</p>
          </div>
          <ChevronRight size={18} className="text-indigo-400/50" />
        </button>

        {/* Group Order Flow */}
        <button 
          onClick={() => onNavigate('checkout')}
          className="w-full bg-[#18181B] border border-slate-800 hover:bg-slate-900 rounded-2xl p-4 flex items-center gap-4 transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-white transition-colors">
            <Users size={18} />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm mb-1">Start Group Order</h4>
            <p className="text-xs text-slate-500 leading-snug">Split bills instantly, get one master token.</p>
          </div>
          <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </button>

      </div>
    </div>
  );
}

function ActiveOrderCard({ order }: { order: Order }) {
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);

  // Live countdown timer — ticks every second
  useEffect(() => {
    if (order.status !== 'preparing' || !order.estimated_ready_at) {
      setCountdown('');
      return;
    }

    const tick = () => {
      const remaining = new Date(order.estimated_ready_at!).getTime() - Date.now();
      const totalMs = (order.estimated_minutes || 15) * 60000;
      const elapsed = totalMs - remaining;
      const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
      setProgress(pct);

      if (remaining <= 0) {
        setCountdown('00:00');
        setProgress(100);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [order.status, order.estimated_ready_at, order.estimated_minutes]);

  const isOverdue = order.estimated_ready_at && order.status === 'preparing' && new Date(order.estimated_ready_at).getTime() < Date.now();

  // SVG circle parameters
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-[#18181B] border border-rose-600/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 rounded-full blur-2xl"></div>
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1">Your Token</p>
          <div className="text-4xl font-black text-white">{order.tokenNo}</div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-4 space-y-2">
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3 bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
            {item.image && (
              <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1">
              <div className="text-sm font-bold text-white">{item.name}</div>
              <div className="text-[10px] text-slate-500">Qty: {item.quantity} • ₹{(item.price * item.quantity).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Progress */}
      <div className="mb-5">
        <OrderProgress status={order.status} />
      </div>

      {/* ════ DYNAMIC COUNTDOWN TIMER ════ */}
      {order.status === 'preparing' && order.estimated_ready_at && (
        <div className={cn(
          "rounded-xl p-4 mb-4 border text-center relative overflow-hidden",
          isOverdue ? "bg-red-500/10 border-red-500/30" : "bg-slate-950 border-sky-500/20"
        )}>
          {/* Animated background glow */}
          <div className={cn(
            "absolute inset-0 opacity-20 blur-2xl",
            isOverdue ? "bg-red-600" : "bg-sky-600"
          )} style={{ animation: 'pulse 2s infinite' }}></div>

          <div className="relative z-10 flex items-center justify-center gap-6">
            {/* Circular progress ring */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                {/* Background ring */}
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
                {/* Progress ring */}
                <circle 
                  cx="60" cy="60" r={radius} fill="none" 
                  stroke={isOverdue ? '#ef4444' : '#0ea5e9'} 
                  strokeWidth="8" 
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn(
                  "text-2xl font-black font-mono tracking-wider",
                  isOverdue ? "text-red-500 animate-pulse" : "text-sky-400"
                )}>
                  {countdown || '--:--'}
                </div>
                <div className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                  {isOverdue ? 'OVERDUE' : 'REMAINING'}
                </div>
              </div>
            </div>

            {/* Timer info */}
            <div className="text-left">
              <div className={cn(
                "text-xs font-bold uppercase tracking-wider mb-1",
                isOverdue ? "text-red-500" : "text-sky-500"
              )}>
                {isOverdue ? '⚠️ Taking longer' : '🍳 Cooking Now'}
              </div>
              <div className="text-[10px] text-slate-500 mb-2">
                {order.estimated_minutes} min set by chef
              </div>
              <div className="text-[10px] text-slate-400">
                ETA: <span className="text-white font-bold">
                  {new Date(order.estimated_ready_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waiting message for queued */}
      {order.status === 'queued' && (
        <div className="rounded-xl p-3 mb-4 bg-yellow-500/10 border border-yellow-500/20 text-center">
          <div className="text-xs text-yellow-400 font-medium">
            ⏳ Waiting for vendor to start your order...
          </div>
        </div>
      )}

      {/* Ready celebration */}
      {order.status === 'ready' && (
        <div className="rounded-xl p-4 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-2xl mb-1">🎉</div>
          <div className="text-sm text-emerald-400 font-bold">Your order is READY!</div>
          <div className="text-[10px] text-emerald-300/60 mt-1">Head to the counter to pick up</div>
        </div>
      )}

      <div className="flex items-center gap-3 bg-rose-600/10 rounded-xl p-3 border border-rose-600/20">
        <Ticket className="text-rose-600 shrink-0" size={18} />
        <p className="text-xs text-rose-200 font-medium text-left leading-snug">
          {order.status === 'queued' && "Your order is in the queue. We'll notify you when it starts cooking!"}
          {order.status === 'preparing' && countdown && `Your food is being prepared — ${countdown} remaining`}
          {order.status === 'preparing' && !countdown && "Your food is being prepared right now! 🍳"}
          {order.status === 'ready' && "Your order is READY! Head to the counter to pick up. 🎉"}
        </p>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    queued: { label: 'IN QUEUE', color: 'text-yellow-500 bg-yellow-500/10' },
    preparing: { label: 'COOKING', color: 'text-orange-500 bg-orange-500/10' },
    ready: { label: 'READY!', color: 'text-emerald-500 bg-emerald-500/10 animate-pulse' },
    picked_up: { label: 'DONE', color: 'text-slate-500 bg-slate-800' },
  };
  const c = config[status] || config.queued;
  return <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase", c.color)}>{c.label}</span>;
}

function OrderProgress({ status }: { status: string }) {
  const steps = ['queued', 'preparing', 'ready'];
  const currentIdx = steps.indexOf(status);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => (
        <div key={step} className="flex-1 flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-all",
            idx <= currentIdx 
              ? "bg-rose-600 border-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)]" 
              : "border-slate-700 text-slate-600"
          )}>
            {step === 'queued' && <Clock size={14} />}
            {step === 'preparing' && <ChefHat size={14} />}
            {step === 'ready' && <CheckCircle2 size={14} />}
          </div>
          {idx < steps.length - 1 && (
            <div className={cn("flex-1 h-0.5 rounded", idx < currentIdx ? "bg-rose-600" : "bg-slate-800")}></div>
          )}
        </div>
      ))}
    </div>
  );
}

function PeakBar({ time, level, label, color = "bg-rose-600" }: { time: string, level: number, label: string, color?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 text-right text-[10px] text-slate-500 font-medium font-mono">{time}</div>
      <div className="flex-1 h-2.5 bg-slate-950 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${level}%` }}></div>
      </div>
      <div className={`w-10 text-[10px] font-bold ${level > 80 ? 'text-red-500' : level > 50 ? 'text-amber-500' : 'text-slate-500'}`}>
        {label}
      </div>
    </div>
  );
}
