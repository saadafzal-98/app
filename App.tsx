
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings as SettingsIcon,
  ClipboardList,
  Lock,
  Trash2
} from 'lucide-react';
import { db, initSettings } from './db';
import Dashboard from './views/Dashboard';
import Customers from './views/Customers';
import DailyRecord from './views/DailyRecord';
import Reports from './views/Reports';
import Settings from './views/Settings';
import CustomerDetail from './views/CustomerDetail';
import AddSupply from './views/AddSupply';
import AddPayment from './views/AddPayment';

type View = 'dashboard' | 'customers' | 'daily-record' | 'reports' | 'settings' | 'customer-detail' | 'add-supply' | 'add-payment';

const LockScreen: React.FC<{ onUnlock: () => void, correctPin: string }> = ({ onUnlock, correctPin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 500);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 page-transition">
      <div className="mb-12 flex flex-col items-center">
        <div className={`w-24 h-24 gradient-primary rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl ${error ? 'animate-shake' : ''}`}>
          <Lock size={40} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Ledger Pro</h1>
        <p className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Identity Verification Required</p>
      </div>

      <div className="flex space-x-6 mb-16">
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
              pin.length > i 
                ? 'bg-emerald-500 border-emerald-500 scale-125 shadow-[0_0_20px_rgba(16,185,129,0.6)]' 
                : 'border-slate-700'
            } ${error ? 'border-rose-500 bg-rose-500 animate-shake' : ''}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-xs w-full px-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button 
            key={num} 
            onClick={() => handlePress(num.toString())}
            className="w-20 h-20 rounded-2xl bg-slate-800/50 text-white text-3xl font-bold hover:bg-slate-700 active:scale-90 transition-all border border-slate-700/30 flex items-center justify-center backdrop-blur-sm"
          >
            {num}
          </button>
        ))}
        <div />
        <button 
          onClick={() => handlePress('0')}
          className="w-20 h-20 rounded-2xl bg-slate-800/50 text-white text-3xl font-bold hover:bg-slate-700 active:scale-90 transition-all border border-slate-700/30 flex items-center justify-center backdrop-blur-sm"
        >
          0
        </button>
        <button 
          onClick={() => setPin(pin.slice(0, -1))}
          className="w-20 h-20 rounded-2xl bg-slate-800/20 text-slate-500 flex items-center justify-center hover:text-white transition-colors active:scale-90"
        >
          <Trash2 size={28} />
        </button>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out; }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [correctPin, setCorrectPin] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    initSettings().then(async () => {
      const settings = await db.settings.get('global');
      if (settings?.isLockActive && settings.passcode) {
        setCorrectPin(settings.passcode);
        setIsLocked(true);
      }
      setIsInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const navigateToCustomerDetail = (id: number) => {
    setSelectedCustomerId(id);
    setActiveView('customer-detail');
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard onCustomerSelect={navigateToCustomerDetail} />;
      case 'customers': return <Customers onCustomerSelect={navigateToCustomerDetail} />;
      case 'daily-record': return <DailyRecord onSuccess={() => setActiveView('dashboard')} />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings darkMode={darkMode} setDarkMode={setDarkMode} onSecurityUpdate={() => {
        db.settings.get('global').then(s => {
          if (s) setCorrectPin(s.passcode || '');
        });
      }} />;
      case 'customer-detail': 
        return selectedCustomerId ? (
          <CustomerDetail 
            customerId={selectedCustomerId} 
            onBack={() => setActiveView('customers')} 
          />
        ) : null;
      case 'add-supply': return <AddSupply onSuccess={() => setActiveView('dashboard')} />;
      case 'add-payment': return <AddPayment onSuccess={() => setActiveView('dashboard')} />;
      default: return <Dashboard onCustomerSelect={navigateToCustomerDetail} />;
    }
  };

  if (!isInitialized) return null;
  if (isLocked) return <LockScreen correctPin={correctPin} onUnlock={() => setIsLocked(false)} />;

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-0 md:pl-64 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors selection:bg-emerald-100 dark:selection:bg-emerald-900">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 fixed inset-y-0 left-0 z-50">
        <div className="p-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">L</div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Ledger Pro</h1>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">Enterprise Edition</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
          <NavItem active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<LayoutDashboard size={20}/>} label="Executive Home" />
          <NavItem active={activeView === 'daily-record'} onClick={() => setActiveView('daily-record')} icon={<ClipboardList size={20}/>} label="Today's Sheet" />
          <NavItem active={activeView === 'customers'} onClick={() => setActiveView('customers')} icon={<Users size={20}/>} label="Customer Hub" />
          {/* Fix: changed duplicate onClick to icon attribute */}
          <NavItem active={activeView === 'reports'} icon={<BarChart3 size={20}/>} onClick={() => setActiveView('reports')} label="Insights & Stats" />
          
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-700">
            <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">System</p>
            <NavItem active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={20}/>} label="Control Panel" />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6 px-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">L</div>
            <h1 className="text-2xl font-black tracking-tight dark:text-white">Ledger</h1>
          </div>
          <button 
            onClick={() => setActiveView('settings')}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <SettingsIcon size={20} className="text-slate-500" />
          </button>
        </div>
        {renderView()}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-22 px-4 z-50 rounded-t-[2.5rem] shadow-[0_-15px_35px_-5px_rgba(0,0,0,0.08)]">
        <MobileNavItem active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<LayoutDashboard size={24}/>} label="Home" />
        <MobileNavItem active={activeView === 'daily-record'} onClick={() => setActiveView('daily-record')} icon={<ClipboardList size={24}/>} label="Sheet" />
        <MobileNavItem active={activeView === 'customers'} onClick={() => setActiveView('customers')} icon={<Users size={24}/>} label="Clients" />
        <MobileNavItem active={activeView === 'reports'} onClick={() => setActiveView('reports')} icon={<BarChart3 size={24}/>} label="Stats" />
      </nav>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center space-x-3.5 px-5 py-4 rounded-2xl font-bold transition-all duration-300 ${
      active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none' 
        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'
    }`}
  >
    <span className={active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'}>{icon}</span>
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const MobileNavItem = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-all duration-300 ${
      active 
        ? 'text-emerald-600 dark:text-emerald-400 scale-110' 
        : 'text-slate-400 dark:text-slate-500 opacity-60'
    }`}
  >
    <div className={`p-1 ${active ? 'tab-active' : ''}`}>{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-[0.12em]">{label}</span>
  </button>
);

export default App;
