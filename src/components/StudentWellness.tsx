import { useState, useEffect } from 'react';
import { Heart, TrendingUp, Trophy, Calendar, Coffee } from 'lucide-react';
import { api } from '../lib/api';

export default function StudentWellness() {
  const [gpa, setGpa] = useState<number>(8.2);
  const [aiNote, setAiNote] = useState<string>("You marked Tuesday lunch as an 'intentional skip'. Are lab sessions running long?");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Life GPA logic — now from localStorage
    setLoading(true);
    api.calculateGPA('test-id').then(res => {
      if (res && res.gpa) {
        setGpa(res.gpa);
        setAiNote(res.message);
      }
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <div className="px-6 py-12 flex flex-col min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Life GPA</h1>
        <p className="text-sm text-slate-400">Track habits, earn rewards.</p>
      </div>

      <div className="space-y-6">
        
        {/* Scorecard */}
        <div className="bg-[#18181B] rounded-3xl p-6 flex flex-col items-center border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Heart size={120} />
          </div>
          
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Current Score</p>
          
          <div className="relative w-40 h-40 flex flex-col items-center justify-center rounded-full border-8 border-black shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] mb-6">
             <div className="absolute inset-0 rounded-full border-8 border-emerald-500/20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 80%)' }}></div>
             <div className="absolute inset-0 rounded-full border-8 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" style={{ clipPath: `polygon(0 0, ${(gpa/10)*100}% 0, ${(gpa/10)*100}% 100%, 0 100%)` }}></div>
             
             <div className="text-5xl font-black text-white tracking-tighter mb-1">
               {loading ? '...' : gpa.toFixed(1)}
             </div>
             <div className="text-xs font-medium text-emerald-500 tracking-widest uppercase">Excellent</div>
          </div>
          
          <div className="w-full flex justify-between gap-2 text-center divide-x divide-slate-800 border-t border-slate-800 pt-5 mt-2">
             <div className="flex-1 px-2">
                 <div className="text-[10px] text-slate-500 font-medium uppercase mb-1">Streak</div>
                 <div className="text-lg font-bold text-white">4 Days</div>
             </div>
             <div className="flex-1 px-2">
                 <div className="text-[10px] text-slate-500 font-medium uppercase mb-1">Consistency</div>
                 <div className="text-lg font-bold text-white">92%</div>
             </div>
          </div>
        </div>

        {/* Weekly Streak */}
        <div className="bg-[#18181B] rounded-2xl p-5 border border-slate-800">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-white text-sm">Weekly Pattern</h3>
            <Calendar size={14} className="text-slate-500" />
          </div>
          
          <div className="flex justify-between px-2 mb-4">
            <DayDot day="M" status="eaten" />
            <DayDot day="T" status="skip" />
            <DayDot day="W" status="eaten" />
            <DayDot day="T" status="eaten" />
            <DayDot day="F" status="today" />
            <DayDot day="S" status="future" />
            <DayDot day="S" status="future" />
          </div>

          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
            <p className="text-xs text-slate-400 leading-relaxed italic">
              <span className="text-amber-500 font-medium not-italic">AI Note:</span> {loading ? 'Analyzing your patterns...' : aiNote}
            </p>
          </div>
        </div>

        {/* Rewards Tracker */}
        <div className="bg-sky-500/10 rounded-2xl p-5 border border-sky-500/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sky-500 text-sm flex items-center gap-2">
              <Trophy size={14} /> Rewards Tracker
            </h3>
            <span className="text-xs font-bold text-yellow-500 bg-yellow-400/10 px-2 py-0.5 rounded">₹400 Bonus</span>
          </div>
          
          <div className="mb-2 flex justify-between text-[10px] text-sky-200/70 font-medium uppercase">
            <span>Progress to 7-Day Streak</span>
            <span>4 / 7</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 mb-4">
             <div className="bg-sky-500 h-2 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" style={{ width: '57%' }}></div>
          </div>
          <p className="text-[10px] text-sky-200/60 leading-snug">Hit 7 days of consistent meals to earn a ₹400 wallet credit instantly.</p>
        </div>

      </div>
    </div>
  );
}

function DayDot({ day, status }: { day: string, status: 'eaten' | 'skip' | 'missed' | 'today' | 'future' }) {
  const getStyle = () => {
    switch (status) {
      case 'eaten': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/20';
      case 'skip': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/20';
      case 'missed': return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] ring-2 ring-red-500/20';
      case 'today': return 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] ring-4 ring-indigo-500/30';
      case 'future': return 'bg-slate-800';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${getStyle()}`}></div>
      <span className={`text-[10px] font-bold ${status === 'today' ? 'text-indigo-400' : 'text-slate-500'}`}>{day}</span>
    </div>
  );
}
