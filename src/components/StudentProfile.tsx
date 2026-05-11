import { User, Lock, Bell, Shield, Globe, CreditCard, FileText, HelpCircle, ChevronRight, ArrowLeft, LogOut } from 'lucide-react';
import type { AppUser } from '../lib/AuthContext';

interface ProfileProps {
  onBack: () => void;
  onLogout: () => void;
  user: AppUser;
}

export default function StudentProfile({ onBack, onLogout, user }: ProfileProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-2">
        <button onClick={onBack} className="p-1 text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">Profile</h1>
        <div className="w-8"></div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 flex items-center justify-between rounded-2xl mx-4 mb-2">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-800 rounded-full overflow-hidden shrink-0 border border-slate-700">
               {user.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-rose-600 text-xl font-bold bg-rose-600/10">
                   {(user.displayName || user.email || '?')[0].toUpperCase()}
                 </div>
               )}
            </div>
            <div>
               <h2 className="text-base font-bold text-rose-600">{user.displayName || 'Student'}</h2>
               <p className="text-xs text-slate-500">{user.email}</p>
               <span className="inline-block mt-1 text-[10px] bg-rose-600/10 text-rose-500 font-bold px-2 py-0.5 rounded uppercase">
                 {user.role}
               </span>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-12 hide-scrollbar">
        
        {/* General */}
        <div>
           <h3 className="text-[13px] font-medium text-slate-400 mb-3 ml-1">General</h3>
           <div className="space-y-2">
              <ProfileItem icon={<User size={18}/>} label="Edit Profile" />
              <ProfileItem icon={<Lock size={18}/>} label="Change Password" />
              <ProfileItem icon={<Bell size={18}/>} label="Notifications" />
              <ProfileItem icon={<Shield size={18}/>} label="Security" />
              <ProfileItem icon={<Globe size={18}/>} label="Language" />
              <ProfileItem icon={<CreditCard size={18}/>} label="Payment Account" />
           </div>
        </div>

        {/* Preferences */}
        <div>
           <h3 className="text-[13px] font-medium text-slate-400 mb-3 ml-1">Preferences</h3>
           <div className="space-y-2">
              <ProfileItem icon={<FileText size={18}/>} label="Legal and Policies" />
              <ProfileItem icon={<HelpCircle size={18}/>} label="Help & Support" />
           </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 p-4 rounded-2xl border border-red-500/30 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} /> Log out
        </button>

      </div>
    </div>
  );
}

function ProfileItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#18181B] rounded-2xl border border-white/5 cursor-pointer hover:bg-slate-900 transition-colors">
       <div className="flex items-center gap-3">
          <div className="text-slate-400">{icon}</div>
          <span className="text-sm font-bold text-white">{label}</span>
       </div>
       <ChevronRight size={18} className="text-slate-600" />
    </div>
  );
}
