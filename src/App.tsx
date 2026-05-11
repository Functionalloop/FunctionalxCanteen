import { useState } from 'react';
import { Home, ClipboardList, Activity, Wallet, LogOut, ChevronDown, MapPin, Bell } from 'lucide-react';
import { cn } from './lib/utils';
import type { MenuItem } from './types';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { setCurrentUserId } from './lib/api';
import LoginScreen from './components/LoginScreen';
import StudentHome from './components/StudentHome';
import StudentQueue from './components/StudentQueue';
import StudentWellness from './components/StudentWellness';
import StudentWallet from './components/StudentWallet';
import StudentNotifications from './components/StudentNotifications';
import VendorDashboard from './components/VendorDashboard';
import StudentCheckout from './components/StudentCheckout';
import { useEffect } from 'react';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

function AppRouter() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    setCurrentUserId(user?.uid ?? null);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (user.role === 'vendor') {
    return <VendorApp user={user} onLogout={logout} />;
  }

  return <StudentApp user={user} onLogout={logout} />;
}


type StudentTab = 'home' | 'queue' | 'wellness' | 'wallet' | 'notifications';

function StudentApp({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<StudentTab>('home');
  const [checkoutItem, setCheckoutItem] = useState<MenuItem | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleBuyItem = (item: MenuItem) => {
    setCheckoutItem(item);
  };

  const handleOrderPlaced = () => {
    setCheckoutItem(null);
    setActiveTab('queue');
  };

  if (checkoutItem) {
    return (
      <div className="min-h-screen bg-slate-950 text-zinc-100 font-sans">
        <StudentCheckout
          item={checkoutItem}
          onBack={() => setCheckoutItem(null)}
          onOrderPlaced={handleOrderPlaced}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-zinc-100 font-sans pb-20 flex flex-col">

      {/* Unified Top bar */}
      <div className="sticky top-0 z-50 bg-brand shadow-md border-b border-brand-light/20">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden shrink-0 border border-white/30">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-white/80 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1">
                <MapPin size={10} /> Campus Canteen
              </div>
              <div className="text-sm font-bold text-white truncate leading-tight">
                {user.displayName || 'Student'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <button 
              onClick={() => setActiveTab('notifications')}
              className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/10 shrink-0 hover:bg-white/20 transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <ChevronDown size={14} className={cn("transition-transform", showMenu && "rotate-180")} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 top-11 z-50 bg-[#18181B] border border-slate-800 rounded-xl shadow-2xl shadow-black/40 p-1 w-44">
                  <button
                    onClick={() => { onLogout(); setShowMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-lg relative z-0 overflow-y-auto overflow-x-hidden">
        {activeTab === 'home' && <StudentHome onBuyItem={handleBuyItem} />}
        {activeTab === 'queue' && <StudentQueue />}
        {activeTab === 'wellness' && <StudentWellness />}
        {activeTab === 'wallet' && <StudentWallet />}
        {activeTab === 'notifications' && <StudentNotifications />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-900 z-50 px-6 py-3 pb-safe flex justify-between items-center">
        <NavItem icon={<Home size={22} />} label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<ClipboardList size={22} />} label="Queue" isActive={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
        <NavItem icon={<Activity size={22} />} label="Life GPA" isActive={activeTab === 'wellness'} onClick={() => setActiveTab('wellness')} />
        <NavItem icon={<Wallet size={22} />} label="Wallet" isActive={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} />
      </nav>
    </div>
  );
}


function VendorApp({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-zinc-100 font-sans">
      {/* Vendor top bar */}
      <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-500/20 overflow-hidden shrink-0 border border-sky-500/30">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sky-500 text-sm font-bold">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate leading-tight">
                {user.displayName || 'Vendor'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
            <span className="text-[10px] bg-sky-500/10 text-sky-500 font-bold px-2 py-0.5 rounded uppercase ml-1">Staff</span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/5"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl relative z-0 overflow-y-auto overflow-x-hidden">
        <VendorDashboard />
      </main>
    </div>
  );
}


function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-colors duration-200",
        isActive ? "text-brand-text" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
