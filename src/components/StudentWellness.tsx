import { useState, useEffect } from 'react';
import { Heart, Trophy, Calendar, Gift, Sparkles, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { getWellnessInsight } from '../lib/gemini';
import type { RewardCoupon } from '../types';

type DayStatus = 'eaten' | 'today' | 'future' | 'missed';

function getWeekDayStatuses(orderDates: string[]): DayStatus[] {
  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7; // Mon=0 ... Sun=6

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - todayIndex);
  startOfWeek.setHours(0, 0, 0, 0);

  const orderDaySet = new Set<number>();
  for (const d of orderDates) {
    const dt = new Date(d);
    if (dt >= startOfWeek) {
      const dayIdx = (dt.getDay() + 6) % 7;
      orderDaySet.add(dayIdx);
    }
  }

  const statuses: DayStatus[] = [];
  for (let i = 0; i < 7; i++) {
    if (i === todayIndex) {
      statuses.push('today');
    } else if (i > todayIndex) {
      statuses.push('future');
    } else {
      statuses.push(orderDaySet.has(i) ? 'eaten' : 'missed');
    }
  }
  return statuses;
}

export default function StudentWellness() {
  const [gpa, setGpa] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [aiNote, setAiNote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<RewardCoupon[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [bonusChecked, setBonusChecked] = useState(false);
  const [weekStatuses, setWeekStatuses] = useState<DayStatus[]>(Array(7).fill('future'));
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.calculateGPA('me');
      if (res) {
        setGpa(res.gpa ?? 0);
        setStreak(res.streak ?? 0);
        setPoints(res.points ?? 0);
        setTotalOrders(res.orderDates?.length ?? 0);

        setWeekStatuses(getWeekDayStatuses(res.orderDates || []));

        const insight = await getWellnessInsight({
          gpa: res.gpa ?? 0,
          streak: res.streak ?? 0,
          recentMeals: res.recentMeals || [],
          points: res.points ?? 0,
        });
        setAiNote(insight);
      }
      setCoupons(api.getAvailableCoupons());

      if (!bonusChecked) {
        setBonusChecked(true);
        const bonusRes = await api.awardWeeklyBonus();
        if (bonusRes.awarded) {
          setPoints(bonusRes.newPoints);
        }
      }
    } catch (err) {
      console.error('Wellness load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (coupon: RewardCoupon) => {
    if (points < coupon.pointsCost) return alert('Not enough points!');
    if (!confirm(`Redeem "${coupon.title}" for ${coupon.pointsCost} points? This will add ₹${coupon.discount} to your wallet.`)) return;

    setRedeeming(coupon.id);
    try {
      const res = await api.redeemCoupon(coupon.id, coupon.pointsCost, coupon.discount);
      if ('error' in res) {
        alert(`❌ ${res.error}`);
      } else {
        setPoints(res.newPoints);
        alert(`✅ Coupon redeemed! ₹${coupon.discount} added to your wallet.`);
      }
    } finally {
      setRedeeming(null);
    }
  };

  const gpaLabel = gpa >= 8 ? 'Excellent' : gpa >= 6 ? 'Good' : gpa >= 4 ? 'Fair' : gpa > 0 ? 'Needs Work' : 'No Data';
  const gpaColor = gpa >= 8 ? 'text-emerald-500' : gpa >= 6 ? 'text-sky-500' : gpa >= 4 ? 'text-amber-500' : 'text-red-500';
  const gpaBorderColor = gpa >= 8 ? 'border-emerald-500' : gpa >= 6 ? 'border-sky-500' : gpa >= 4 ? 'border-amber-500' : 'border-red-500';
  const gpaGlow = gpa >= 8 ? 'shadow-[0_0_15px_rgba(16,185,129,0.5)]' : gpa >= 6 ? 'shadow-[0_0_15px_rgba(14,165,233,0.5)]' : '';

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="px-6 py-12 flex flex-col min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Life GPA</h1>
        <p className="text-sm text-slate-400">Track habits, earn rewards, redeem coupons.</p>
      </div>

      <div className="space-y-6">

        <div className="bg-[#18181B] rounded-3xl p-6 flex flex-col items-center border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Heart size={120} />
          </div>
          
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Current Score</p>
          
          <div className={cn("relative w-40 h-40 flex flex-col items-center justify-center rounded-full border-8 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mb-6")}>
             <div className="absolute inset-0 rounded-full border-8 border-emerald-500/20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 80%)' }}></div>
             <div className={cn("absolute inset-0 rounded-full border-8", gpaBorderColor, gpaGlow)} style={{ clipPath: `polygon(0 0, ${(gpa/10)*100}% 0, ${(gpa/10)*100}% 100%, 0 100%)` }}></div>
             
             <div className="text-5xl font-black text-white tracking-tighter mb-1">
               {loading ? '...' : gpa.toFixed(1)}
             </div>
             <div className={cn("text-xs font-medium tracking-widest uppercase", gpaColor)}>{gpaLabel}</div>
          </div>
          
          <div className="w-full flex justify-between gap-2 text-center divide-x divide-slate-800 border-t border-slate-800 pt-5 mt-2">
             <div className="flex-1 px-2">
                 <div className="text-[10px] text-slate-500 font-medium uppercase mb-1">Streak</div>
                 <div className="text-lg font-bold text-white">{streak} Days</div>
             </div>
             <div className="flex-1 px-2">
                 <div className="text-[10px] text-slate-500 font-medium uppercase mb-1">Orders</div>
                 <div className="text-lg font-bold text-white">{totalOrders}</div>
             </div>
             <div className="flex-1 px-2">
                 <div className="text-[10px] text-slate-500 font-medium uppercase mb-1">Points</div>
                 <div className="text-lg font-bold text-amber-400 flex items-center justify-center gap-1">
                   <Zap size={14} /> {points}
                 </div>
             </div>
          </div>
        </div>

        <div className="bg-[#18181B] rounded-2xl p-5 border border-slate-800">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-white text-sm">This Week</h3>
            <Calendar size={14} className="text-slate-500" />
          </div>
          
          <div className="flex justify-between px-2 mb-4">
            {DAY_LABELS.map((label, i) => (
              <DayDot key={i} day={label} status={weekStatuses[i]} />
            ))}
          </div>

          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
            <p className="text-xs text-slate-400 leading-relaxed italic">
              <span className="text-amber-500 font-medium not-italic flex items-center gap-1 mb-1">
                <Sparkles size={12} /> Gemini AI Insight
              </span>
              {loading ? 'Analyzing your patterns...' : aiNote}
            </p>
          </div>
        </div>

        {gpa >= 8 && (
          <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 text-center">
            <p className="text-xs text-emerald-400 font-bold">
              🎉 GPA above 8! You earn 25 bonus points every week automatically.
            </p>
          </div>
        )}

        {totalOrders === 0 && !loading && (
          <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-800 text-center">
            <p className="text-sm text-slate-400 mb-1">No orders yet</p>
            <p className="text-[10px] text-slate-500">Place your first order to start building your Life GPA and earn reward points.</p>
          </div>
        )}

        <div className="bg-amber-500/10 rounded-2xl p-5 border border-amber-500/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
              <Gift size={14} /> Redeem Coupons
            </h3>
            <span className="text-xs font-bold text-amber-500 bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">
              <Zap size={10} /> {points} pts
            </span>
          </div>
          
          <div className="space-y-2">
            {coupons.map(coupon => (
              <div key={coupon.id} className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                <div>
                  <div className="text-sm font-bold text-white">{coupon.title}</div>
                  <div className="text-[10px] text-slate-500">{coupon.pointsCost} points required</div>
                </div>
                <button
                  onClick={() => handleRedeem(coupon)}
                  disabled={points < coupon.pointsCost || redeeming === coupon.id}
                  className={cn(
                    "text-xs font-bold px-4 py-2 rounded-lg transition-colors",
                    points >= coupon.pointsCost
                      ? "bg-amber-500 hover:bg-amber-600 text-black"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  )}
                >
                  {redeeming === coupon.id ? '...' : 'Redeem'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-sky-500/10 rounded-2xl p-5 border border-sky-500/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sky-500 text-sm flex items-center gap-2">
              <Trophy size={14} /> How Points Work
            </h3>
          </div>
          <div className="space-y-2 text-xs text-sky-200/70">
            <div className="flex justify-between"><span>Every order placed</span><span className="font-bold text-sky-400">+10 pts</span></div>
            <div className="flex justify-between"><span>Moderately healthy item (Level 2)</span><span className="font-bold text-sky-400">+2 pts/item</span></div>
            <div className="flex justify-between"><span>Very healthy item (Level 3)</span><span className="font-bold text-sky-400">+5 pts/item</span></div>
            <div className="flex justify-between"><span>Weekly bonus (GPA ≥ 8)</span><span className="font-bold text-emerald-400">+25 pts/week</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}

function DayDot({ day, status }: { day: string, status: DayStatus }) {
  const getStyle = () => {
    switch (status) {
      case 'eaten': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/20';
      case 'missed': return 'bg-red-500/40 ring-2 ring-red-500/10';
      case 'today': return 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] ring-4 ring-indigo-500/30';
      case 'future': return 'bg-slate-800';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${getStyle()}`}></div>
      <span className={`text-[10px] font-bold ${status === 'today' ? 'text-indigo-400' : status === 'eaten' ? 'text-emerald-500' : 'text-slate-500'}`}>{day}</span>
    </div>
  );
}
