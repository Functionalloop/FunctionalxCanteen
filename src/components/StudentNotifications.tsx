import { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

export default function StudentNotifications() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBroadcasts().then(data => {
      setBroadcasts(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="px-6 py-8 pb-32">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center text-brand-light">
          <Bell size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-slate-400">Updates from the campus canteen</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading notifications...</p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800">
          <Bell size={32} className="mx-auto mb-3 text-slate-600" />
          <p className="text-white font-medium">All caught up!</p>
          <p className="text-sm text-slate-500">No new notifications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {broadcasts.map(b => (
            <div 
              key={b.id} 
              className={cn(
                "rounded-xl p-5 border relative overflow-hidden",
                b.type === 'Alert' || b.type === 'alert' 
                  ? "bg-red-500/10 border-red-500/30" 
                  : "bg-[#18181B] border-slate-800"
              )}
            >
              <div className="flex gap-4">
                <div className={cn(
                  "shrink-0 mt-1",
                  b.type === 'Alert' || b.type === 'alert' ? "text-red-400" : "text-amber-500"
                )}>
                  {b.type === 'Alert' || b.type === 'alert' ? <AlertTriangle size={20} /> : <Info size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {b.staffName || 'Admin'}
                    </span>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={10} /> {b.timestamp}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm font-medium leading-relaxed",
                    b.type === 'Alert' || b.type === 'alert' ? "text-red-100" : "text-slate-200"
                  )}>
                    {b.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
