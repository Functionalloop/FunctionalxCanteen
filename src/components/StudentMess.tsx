import { useState, useEffect } from 'react';
import { Beef, Zap, Crown, ChevronRight, CheckCircle2, Clock, Star, ShoppingBag, ArrowLeft, X, Dumbbell, Flame, Utensils } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import type { MenuItem, MessSubscription, MessPlan } from '../types';

export default function StudentMess({ onBuyItem }: { onBuyItem: (item: MenuItem) => void }) {
  const [tab, setTab] = useState<'subscription' | 'protein'>('subscription');
  const [subscription, setSubscription] = useState<MessSubscription | null>(null);
  const [plans] = useState<MessPlan[]>(api.getMessPlans());
  const [proteinItems, setProteinItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sub, protein] = await Promise.all([
        api.getMySubscription(),
        api.getProteinRichItems(),
      ]);
      setSubscription(sub);
      setProteinItems(protein);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(true);
    const result = await api.subscribeMess(planId as any);
    setSubscribing(false);
    if ('error' in result) {
      showToast(result.error as string, 'error');
    } else {
      showToast('Mess plan activated! 🎉', 'success');
      loadData();
    }
  };

  const handleUseMeal = async () => {
    const result = await api.useMessMeal();
    if ('error' in result) {
      showToast(result.error as string, 'error');
    } else {
      showToast(`Meal used! ${result.mealsLeft} left today.`, 'success');
      loadData();
    }
  };

  const handleCancel = async () => {
    const result = await api.cancelMessSubscription();
    if ('error' in result) {
      showToast(result.error as string, 'error');
    } else {
      showToast('Subscription cancelled.', 'success');
      loadData();
    }
  };

  const daysRemaining = subscription?.active ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-b-3xl px-6 pt-4 pb-6 shadow-sm -mt-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-white">
            <Utensils size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Mess & Nutrition</h1>
            <p className="text-emerald-200 text-sm">Subscriptions & Protein-rich meals</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setTab('subscription')}
            className={cn("flex-1 py-2.5 text-sm font-bold rounded-lg transition-all", tab === 'subscription' ? 'bg-white text-emerald-700 shadow-lg' : 'text-white/70 hover:text-white')}
          >
            🍽️ Mess Plans
          </button>
          <button
            onClick={() => setTab('protein')}
            className={cn("flex-1 py-2.5 text-sm font-bold rounded-lg transition-all", tab === 'protein' ? 'bg-white text-emerald-700 shadow-lg' : 'text-white/70 hover:text-white')}
          >
            💪 Protein Rich
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 mb-20 overflow-y-auto hide-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tab === 'subscription' ? (
          <SubscriptionTab
            subscription={subscription}
            plans={plans}
            subscribing={subscribing}
            daysRemaining={daysRemaining}
            onSubscribe={handleSubscribe}
            onUseMeal={handleUseMeal}
            onCancel={handleCancel}
          />
        ) : (
          <ProteinTab items={proteinItems} onBuyItem={onBuyItem} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
          <div className={cn(
            "flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl text-sm font-bold border",
            toast.type === 'success' ? "bg-emerald-500/90 text-white border-emerald-400/30" : "bg-red-500/90 text-white border-red-400/30"
          )}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}


function SubscriptionTab({ subscription, plans, subscribing, daysRemaining, onSubscribe, onUseMeal, onCancel }: {
  subscription: MessSubscription | null;
  plans: MessPlan[];
  subscribing: boolean;
  daysRemaining: number;
  onSubscribe: (id: string) => void;
  onUseMeal: () => void;
  onCancel: () => void;
}) {
  if (subscription?.active) {
    return (
      <div className="space-y-5">
        {/* Active Subscription Card */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-2xl p-5 border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Active Plan</div>
              <div className="text-2xl font-black text-white">{subscription.planName} Mess</div>
            </div>
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse">
              ACTIVE
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-950/50 rounded-xl p-3 text-center border border-white/5">
              <div className="text-xl font-black text-white">{daysRemaining}</div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Days Left</div>
            </div>
            <div className="bg-slate-950/50 rounded-xl p-3 text-center border border-white/5">
              <div className="text-xl font-black text-emerald-400">{subscription.mealsPerDay - subscription.mealsUsedToday}</div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Meals Today</div>
            </div>
            <div className="bg-slate-950/50 rounded-xl p-3 text-center border border-white/5">
              <div className="text-xl font-black text-white">{subscription.totalMealsRemaining}</div>
              <div className="text-[9px] text-slate-500 font-bold uppercase">Total Left</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Today's Usage</span>
              <span>{subscription.mealsUsedToday}/{subscription.mealsPerDay} meals</span>
            </div>
            <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${(subscription.mealsUsedToday / subscription.mealsPerDay) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Use Meal Button */}
          {subscription.mealsUsedToday < subscription.mealsPerDay && (
            <button
              onClick={onUseMeal}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-emerald-500/20"
            >
              🍽️ Use a Meal
            </button>
          )}

          {subscription.mealsUsedToday >= subscription.mealsPerDay && (
            <div className="text-center py-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400 font-medium">All meals used for today</div>
              <div className="text-[10px] text-slate-600">Resets at midnight</div>
            </div>
          )}
        </div>

        {/* Subscription Details */}
        <div className="bg-[#18181B] rounded-2xl p-4 border border-slate-800">
          <div className="text-xs text-slate-500 font-bold uppercase mb-3">Plan Details</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-400"><span>Started</span><span className="text-white font-bold">{new Date(subscription.startDate).toLocaleDateString()}</span></div>
            <div className="flex justify-between text-slate-400"><span>Expires</span><span className="text-white font-bold">{new Date(subscription.endDate).toLocaleDateString()}</span></div>
            <div className="flex justify-between text-slate-400"><span>Meals/Day</span><span className="text-white font-bold">{subscription.mealsPerDay}</span></div>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-3 text-sm text-red-400 hover:text-red-300 font-bold border border-red-500/20 rounded-xl hover:bg-red-500/5 transition-colors"
        >
          Cancel Subscription
        </button>
      </div>
    );
  }

  // No active subscription — show plans
  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold text-white">Choose Your Mess Plan</h2>
        <p className="text-xs text-slate-500">Save more with monthly meal subscriptions</p>
      </div>

      {plans.map((plan, idx) => (
        <div
          key={plan.id}
          className={cn(
            "rounded-2xl p-5 border relative overflow-hidden transition-all",
            plan.id === 'premium'
              ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30'
              : plan.id === 'standard'
              ? 'bg-gradient-to-br from-sky-500/10 to-indigo-500/5 border-sky-500/30'
              : 'bg-[#18181B] border-slate-800'
          )}
        >
          {plan.id === 'premium' && (
            <div className="absolute top-3 right-3">
              <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Crown size={10} /> BEST VALUE
              </span>
            </div>
          )}
          {plan.id === 'standard' && (
            <div className="absolute top-3 right-3">
              <span className="bg-sky-500/20 text-sky-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                POPULAR
              </span>
            </div>
          )}

          <div className="mb-3">
            <h3 className="text-lg font-black text-white">{plan.name}</h3>
            <p className="text-xs text-slate-500">{plan.description}</p>
          </div>

          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-black text-white">₹{plan.price}</span>
            <span className="text-xs text-slate-500">/{plan.duration} days</span>
          </div>

          <div className="space-y-2 mb-4">
            {plan.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>

          <button
            onClick={() => onSubscribe(plan.id)}
            disabled={subscribing}
            className={cn(
              "w-full font-bold py-3 rounded-xl transition-colors text-sm",
              plan.id === 'premium'
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                : plan.id === 'standard'
                ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            )}
          >
            {subscribing ? 'Processing...' : 'Subscribe Now'}
          </button>
        </div>
      ))}
    </div>
  );
}


function ProteinTab({ items, onBuyItem }: { items: MenuItem[]; onBuyItem: (item: MenuItem) => void }) {
  return (
    <div className="space-y-5">
      {/* Protein Info Banner */}
      <div className="bg-gradient-to-br from-orange-500/10 to-red-500/5 rounded-2xl p-5 border border-orange-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-500/20 rounded-xl">
            <Dumbbell size={20} className="text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Protein Power Zone</h3>
            <p className="text-[10px] text-slate-500">Items with 15g+ protein per serving</p>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5 bg-slate-950/50 rounded-lg px-3 py-1.5 border border-white/5">
            <Flame size={12} className="text-red-400" />
            <span className="text-[10px] text-slate-400 font-bold">{items.length} Items</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950/50 rounded-lg px-3 py-1.5 border border-white/5">
            <Beef size={12} className="text-amber-400" />
            <span className="text-[10px] text-slate-400 font-bold">15g–32g Protein</span>
          </div>
        </div>
      </div>

      {/* Protein Items List */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-[#18181B] border border-slate-800 rounded-2xl overflow-hidden flex group hover:border-orange-500/30 transition-colors">
            <div className="w-28 h-full bg-slate-800 relative overflow-hidden shrink-0">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {/* Protein badge */}
              <div className="absolute bottom-1 left-1 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <Dumbbell size={8} /> {item.proteinGrams}g
              </div>
            </div>
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-white text-sm leading-tight">{item.name}</h3>
                  {item.isProteinRich && (
                    <span className="bg-orange-500/10 text-orange-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-orange-500/20">HIGH</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className={cn(
                    "font-bold px-1.5 py-0.5 rounded",
                    item.dietary === 'Veg' ? 'text-emerald-400 bg-emerald-500/10' : item.dietary === 'Non-Veg' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'
                  )}>{item.dietary}</span>
                  <span className="flex items-center gap-0.5"><Star size={10} className="fill-yellow-400 text-yellow-400" /> {item.rating}</span>
                  <span className="flex items-center gap-0.5"><Clock size={10} /> {item.prepTime}</span>
                </div>
              </div>
              <div className="flex items-end justify-between mt-2">
                <div className="font-black text-white text-lg">₹{item.price}</div>
                {item.status !== 'Finished' ? (
                  <button
                    onClick={() => onBuyItem(item)}
                    className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-xl transition-colors"
                  >
                    <ShoppingBag size={16} />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-600 font-bold bg-slate-800 px-2 py-1 rounded">OUT</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Dumbbell size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No protein-rich items available right now</p>
            <p className="text-[10px] text-slate-600 mt-1">Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
}
