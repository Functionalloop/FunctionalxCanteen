import { useState, useEffect } from 'react';
import { Home, ClipboardList, Activity, Wallet, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import type { MenuItem } from './types';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { setCurrentUserId } from './lib/api';
import LoginScreen from './components/LoginScreen';
import StudentHome from './components/StudentHome';
import StudentQueue from './components/StudentQueue';
import StudentWellness from './components/StudentWellness';
import StudentWallet from './components/StudentWallet';
import VendorDashboard from './components/VendorDashboard';
import StudentCheckout from './components/StudentCheckout';
import StudentProfile from './components/StudentProfile';

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
          <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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


type StudentTab = 'home' | 'queue' | 'wellness' | 'wallet';
type StudentScreen = 'main' | 'checkout' | 'profile';

function StudentApp({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<StudentTab>('home');
  const [activeScreen, setActiveScreen] = useState<StudentScreen>('main');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const handleNavigate = (screen: StudentScreen) => {
    setActiveScreen(screen);
  };

  const handleBuyItem = (item: MenuItem) => {
    setSelectedItem(item);
    setActiveScreen('checkout');
  };

  const handleOrderPlaced = () => {
    setSelectedItem(null);
    setActiveScreen('main');
    setActiveTab('queue');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-zinc-100 font-sans pb-20 md:pb-0 flex flex-col md:flex-row">
      <main className="flex-1 mx-auto w-full max-w-md bg-slate-950 md:border-r md:border-zinc-800 relative z-0 overflow-y-auto overflow-x-hidden">
        {activeScreen === 'main' && (
          <>
            {activeTab === 'home' && <StudentHome onNavigate={handleNavigate} onBuyItem={handleBuyItem} />}
            {activeTab === 'queue' && <StudentQueue onNavigate={handleNavigate} />}
            {activeTab === 'wellness' && <StudentWellness />}
            {activeTab === 'wallet' && <StudentWallet onNavigate={handleNavigate} />}
          </>
        )}

        {activeScreen === 'checkout' && (
          <StudentCheckout
            item={selectedItem}
            onBack={() => handleNavigate('main')}
            onOrderPlaced={handleOrderPlaced}
          />
        )}
        {activeScreen === 'profile' && <StudentProfile onBack={() => handleNavigate('main')} onLogout={onLogout} user={user} />}

        {activeScreen === 'main' && (
          <nav className="fixed bottom-0 w-full max-w-md bg-zinc-950 border-t border-zinc-900 z-50 px-6 py-3 pb-safe flex justify-between items-center">
            <NavItem icon={<Home size={24} />} label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavItem icon={<ClipboardList size={24} />} label="Queue" isActive={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
            <NavItem icon={<Activity size={24} />} label="Wellness" isActive={activeTab === 'wellness'} onClick={() => setActiveTab('wellness')} />
            <NavItem icon={<Wallet size={24} />} label="Wallet" isActive={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} />
          </nav>
        )}
      </main>

      <div className="hidden md:flex w-64 p-6 bg-zinc-950 border-l border-zinc-900 flex-col gap-6">
        <h2 className="text-xl font-semibold text-white tracking-tight">FunctionalCanteen</h2>

        <div className="bg-[#18181B] rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-rose-600/20 overflow-hidden shrink-0 border border-rose-600/30">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-rose-600 text-sm font-bold">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{user.displayName || 'Student'}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] bg-rose-600/10 text-rose-500 font-bold px-2 py-0.5 rounded uppercase">Student</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="mt-auto flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 transition-colors px-2"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}


function VendorApp({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-zinc-100 font-sans flex flex-col md:flex-row">
      <main className="flex-1 mx-auto w-full max-w-6xl bg-slate-950 md:border-r md:border-zinc-800 relative z-0 overflow-y-auto overflow-x-hidden">
        <VendorDashboard />
      </main>

      <div className="hidden md:flex w-64 p-6 bg-zinc-950 border-l border-zinc-900 flex-col gap-6">
        <h2 className="text-xl font-semibold text-white tracking-tight">FunctionalCanteen</h2>

        <div className="bg-[#18181B] rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-sky-500/20 overflow-hidden shrink-0 border border-sky-500/30">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sky-500 text-sm font-bold">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{user.displayName || 'Vendor'}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] bg-sky-500/10 text-sky-500 font-bold px-2 py-0.5 rounded uppercase">Vendor Staff</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="mt-auto flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 transition-colors px-2"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}


function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-colors duration-200",
        isActive ? "text-rose-600" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
