import { useState, useEffect } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, Camera, Star, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import type { WalletTransaction } from '../types';

export default function StudentWallet({ onNavigate }: { onNavigate: (screen: 'profile') => void }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    api.getBalance().then(b => setBalance(b));
    api.getTransactions().then(t => setTransactions(t));
  }, []);

  const handleTopUp = async () => {
    const res = await api.topUp('test-id', 500);
    if (res && res.balance) {
      setBalance(res.balance);
      api.getTransactions().then(t => setTransactions(t));
      alert(`Top up successful! New balance: ₹${res.balance.toFixed(2)}`);
    }
  };

  return (
    <div className="px-6 py-12 flex flex-col min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Campus Wallet</h1>
          <p className="text-sm text-slate-400">Balance and transactions.</p>
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
          {/* Ambient Glow */}
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
              <Plus size={16} /> Add Funds
            </button>
            {balance < 1000 && (
              <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-red-500/20">
                Notify Parents
              </button>
            )}
          </div>
        </div>

        {/* Action Needed: Rating & Review Hub */}
        <div className="bg-[#18181B] rounded-2xl p-5 border border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-white text-sm mb-1">Pending Review</h3>
              <p className="text-[10px] text-slate-500">Breakfast Pickup • Token #046</p>
            </div>
            <span className="bg-yellow-400/10 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded uppercase">+2 Pts</span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden shrink-0">
               <img src="https://images.unsplash.com/photo-1626082895617-2c6bfcc32746?auto=format&fit=crop&q=80&w=100" alt="Food" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Rajma Chawal</h4>
              <div className="flex gap-1 text-slate-600">
                <Star size={16} className="text-slate-600 hover:text-yellow-400 cursor-pointer transition-colors" />
                <Star size={16} className="text-slate-600 hover:text-yellow-400 cursor-pointer transition-colors" />
                <Star size={16} className="text-slate-600 hover:text-yellow-400 cursor-pointer transition-colors" />
                <Star size={16} className="text-slate-600 hover:text-yellow-400 cursor-pointer transition-colors" />
                <Star size={16} className="text-slate-600 hover:text-yellow-400 cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
          
          <button className="w-full bg-slate-950 border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white rounded-xl py-3 text-xs font-medium transition-colors flex items-center justify-center gap-2">
            <Camera size={14} /> Upload Photo for +2 Wallet Points
          </button>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="font-bold text-white text-sm mb-4">Recent Transactions</h3>
          <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
            {transactions.map((t, i) => (
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
        </div>

      </div>
    </div>
  );
}
