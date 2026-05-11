import { useState, useEffect } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, Star, User, Zap, Gift, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import type { WalletTransaction, Order, RewardCoupon } from '../types';

export default function StudentWallet({ onNavigate }: { onNavigate: (screen: 'profile') => void }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [points, setPoints] = useState(0);
  const [pendingReviews, setPendingReviews] = useState<Order[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<RewardCoupon[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    const [bal, txns, pts, orders] = await Promise.all([
      api.getBalance(),
      api.getTransactions(),
      api.getPoints(),
      api.getMyOrders(),
    ]);
    setBalance(bal);
    setTransactions(txns);
    setPoints(pts);
    setCoupons(api.getAvailableCoupons());

    const reviewable = orders
      .filter(o => o.status === 'picked_up')
      .slice(0, 3);
    setPendingReviews(reviewable);
  };

  const handleTopUp = async () => {
    const res = await api.topUp('test-id', 500);
    if (res && res.balance) {
      setBalance(res.balance);
      api.getTransactions().then(t => setTransactions(t));
      alert(`Top up successful! New balance: ₹${res.balance.toFixed(2)}`);
    }
  };

  const handleRate = (orderId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [orderId]: rating }));
  };

  const handleSubmitReview = async (order: Order) => {
    const rating = ratings[order.id];
    if (!rating) return alert('Please select a star rating first.');

    setSubmittingReview(order.id);
    try {
      for (const item of order.items) {
        await api.rateItem(item.id, rating);
      }

      const pointsSnap = await api.getPoints();
      setPoints(pointsSnap + 5);

      setPendingReviews(prev => prev.filter(o => o.id !== order.id));
      alert(`✅ Review submitted! +5 reward points earned.`);
      loadWalletData();
    } catch {
      alert('Failed to submit review.');
    } finally {
      setSubmittingReview(null);
    }
  };

  const handleRedeem = async (coupon: RewardCoupon) => {
    if (points < coupon.pointsCost) return alert('Not enough points!');
    if (!confirm(`Redeem "${coupon.title}" for ${coupon.pointsCost} points?\n₹${coupon.discount} will be added to your wallet.`)) return;

    setRedeeming(coupon.id);
    try {
      const res = await api.redeemCoupon(coupon.id, coupon.pointsCost, coupon.discount);
      if ('error' in res) {
        alert(`❌ ${res.error}`);
      } else {
        setPoints(res.newPoints);
        setBalance(res.newBalance);
        api.getTransactions().then(t => setTransactions(t));
        alert(`✅ ₹${coupon.discount} added to wallet!`);
      }
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="px-6 py-12 flex flex-col min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Campus Wallet</h1>
          <p className="text-sm text-slate-400">Balance, rewards & reviews.</p>
        </div>
        <button 
          onClick={() => onNavigate('profile')}
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <User size={20} />
        </button>
      </div>

      <div className="space-y-6">
        
        {/* Balance Card */}
        <div className={cn(
          "rounded-3xl p-6 relative overflow-hidden transition-colors",
          balance < 1000 ? "bg-red-500/10 border border-red-500/30 shadow-lg shadow-red-500/5" : "bg-gradient-to-br from-[#18181B] to-[#121214] border border-slate-800 shadow-xl"
        )}>
          <div className={cn(
            "absolute top-0 right-0 w-40 h-40 rounded-full blur-[50px] -mr-10 -mt-10",
            balance < 1000 ? "bg-red-500/20" : "bg-white/5"
          )}></div>

          <div className="flex justify-between items-start mb-4 relative z-10">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest">Current Balance</h2>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
              balance < 1000 ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-slate-800 text-slate-300 border-slate-700"
            )}>
               <Wallet size={18} />
            </div>
          </div>
          
          <div className={cn(
            "text-5xl font-black mb-2 tracking-tight relative z-10",
            balance < 1000 ? "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "text-white"
          )}>
            ₹{balance.toFixed(2)}
          </div>
          
          {balance < 1000 && (
            <p className="text-xs text-red-400 font-medium relative z-10 flex items-center gap-1.5 mb-2 mt-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Balance is low. Top-up recommended.
            </p>
          )}

          <div className="flex gap-3 mt-6 relative z-10">
            <button 
              onClick={handleTopUp}
              className="flex-1 bg-white text-black hover:bg-slate-200 font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add ₹500
            </button>
            {balance < 1000 && (
              <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-red-500/20">
                Notify Parents
              </button>
            )}
          </div>
        </div>

        {/* Reward Points Card */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl p-5 border border-amber-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Trophy size={80} />
          </div>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div>
              <h3 className="font-bold text-white text-sm mb-1">Reward Points</h3>
              <p className="text-[10px] text-slate-500">Earn on every order. Redeem for wallet credit.</p>
            </div>
            <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-1.5 rounded-full">
              <Zap size={14} className="text-amber-400" />
              <span className="text-lg font-black text-amber-400">{points}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 relative z-10">
            {coupons.map(coupon => (
              <button
                key={coupon.id}
                onClick={() => handleRedeem(coupon)}
                disabled={points < coupon.pointsCost || redeeming === coupon.id}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  points >= coupon.pointsCost
                    ? "bg-slate-950/70 border-amber-500/30 hover:border-amber-400 hover:bg-slate-900/80 cursor-pointer"
                    : "bg-slate-950/30 border-slate-800/30 opacity-50 cursor-not-allowed"
                )}
              >
                <div className="text-sm font-bold text-white mb-0.5">
                  {redeeming === coupon.id ? '...' : coupon.title}
                </div>
                <div className="text-[10px] text-amber-400/80 flex items-center gap-1">
                  <Zap size={8} /> {coupon.pointsCost} pts
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pending Reviews */}
        {pendingReviews.length > 0 && (
          <div>
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Star size={14} className="text-yellow-500" /> Rate Your Orders
              <span className="text-[10px] bg-yellow-400/10 text-yellow-500 px-2 py-0.5 rounded font-bold">+5 pts each</span>
            </h3>
            <div className="space-y-3">
              {pendingReviews.map(order => (
                <div key={order.id} className="bg-[#18181B] rounded-2xl p-4 border border-slate-800">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Token {order.tokenNo} · {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</p>
                      <h4 className="text-sm font-bold text-white">
                        {order.items.map(i => i.name).join(', ')}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-500">₹{order.total_amount.toFixed(0)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => handleRate(order.id, star)}
                          className="transition-all duration-150"
                        >
                          <Star
                            size={22}
                            className={cn(
                              "transition-colors",
                              (ratings[order.id] || 0) >= star
                                ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.4)]"
                                : "text-slate-700 hover:text-slate-500"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleSubmitReview(order)}
                      disabled={!ratings[order.id] || submittingReview === order.id}
                      className={cn(
                        "ml-auto text-xs font-bold px-4 py-2 rounded-lg transition-colors",
                        ratings[order.id]
                          ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      )}
                    >
                      {submittingReview === order.id ? '...' : 'Submit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div>
          <h3 className="font-bold text-white text-sm mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <div className="bg-[#18181B] rounded-2xl p-8 text-center border border-slate-800">
              <Wallet size={32} className="text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No transactions yet. Top-up to get started.</p>
            </div>
          ) : (
            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
              {transactions.map((t) => (
                <div key={t.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-4">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-4 border-black shrink-0 relative z-10",
                    t.type === 'credit' ? "bg-emerald-500/20 text-emerald-500" : "bg-slate-800 text-slate-400"
                  )}>
                    {t.type === 'credit' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 pt-1">
                     <div className="bg-[#18181B] p-4 rounded-xl border border-slate-800/50">
                       <div className="flex justify-between items-start mb-1">
                         <h4 className="font-bold text-white text-sm">{t.description}</h4>
                         <span className={cn(
                           "font-bold text-sm text-right",
                           t.type === 'credit' ? "text-emerald-500" : "text-white"
                         )}>
                           {t.type === 'credit' ? '+' : '-'}₹{t.amount.toFixed(2)}
                         </span>
                       </div>
                       <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{t.timestamp}</span>
                          {t.tokenNo && <span className="uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Token {t.tokenNo}</span>}
                       </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
