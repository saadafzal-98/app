
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings as SettingsIcon,
  ClipboardList,
  Plus,
  Lock,
  Delete
} from 'lucide-react';
import { db, initSettings } from './db';
import Dashboard from './views/Dashboard';
import Customers from './views/Customers';
import DailyRecord from './views/DailyRecord';
import Reports from './views/Reports';
import Settings from './views/Settings';
import CustomerDetail from './views/CustomerDetail';

type View = 'dashboard' | 'customers' | 'daily-record' | 'reports' | 'settings' | 'customer-detail';

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
        <div className={`w-20 h-20 gradient-primary rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl ${error ? 'animate-shake' : ''}`}>
          <Lock size={36} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Ledger Secure</h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Authentication Required</p>
      </div>

      <div className="flex space-x-5 mb-16">
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
              pin.length > i 
                ? 'bg-emerald-500 border-emerald-500 scale-125 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                : 'border-slate-700'
            } ${error ? 'border-rose-500 bg-rose-500 animate-pulse' : ''}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-xs w-full px-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button 
            key={num} 
            onClick={() => handlePress(num.toString())}
            className="w-20 h-20 rounded-full bg-slate-800/50 text-white text-3xl font-bold hover:bg-slate-700 active:scale-90 transition-all border border-slate-700/30 flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div />
        <button 
          onClick={() => handlePress('0')}
          className="w-20 h-20 rounded-full bg-slate-800/50 text-white text-3xl font-bold hover:bg-slate-700 active:scale-90 transition-all border border-slate-700/30 flex items-center justify-center"
        >
          0
        </button>
        <button 
          onClick={() => setPin(pin.slice(0, -1))}
          className="w-20 h-20 rounded-full bg-slate-800/20 text-slate-500 flex items-center justify-center hover:text-white transition-colors active:scale-90"
        >
          <Delete size={28} />
        </button>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
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
      default: return <Dashboard onCustomerSelect={navigateToCustomerDetail} />;
    }
  };

  if (!isInitialized) return null;
  if (isLocked) return <LockScreen correctPin={correctPin} onUnlock={() => setIsLocked(false)} />;

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-0 md:pl-64 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 fixed inset-y-0 left-0 z-50">
        <div className="p-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ledger</h1>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Premium</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavItem active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<LayoutDashboard size={20}/>} label="Overview" />
          <NavItem active={activeView === 'daily-record'} onClick={() => setActiveView('daily-record')} icon={<ClipboardList size={20}/>} label="Daily Sheet" />
          <NavItem active={activeView === 'customers'} onClick={() => setActiveView('customers')} icon={<Users size={20}/>} label="Customers" />
          <NavItem active={activeView === 'reports'} onClick={() => setActiveView('reports'} icon={<BarChart3 size={20}/>} label="Analytics" />
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
            <NavItem active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={20}/>} label="Settings" />
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        <div className="md:hidden flex justify-between items-center mb-6 px-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <h1 className="text-2xl font-black tracking-tight dark:text-white">Ledger</h1>
          </div>
        </div>
        {renderView()}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-20 px-4 z-50 rounded-t-3xl shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
        <MobileNavItem active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<LayoutDashboard size={22}/>} label="Home" />
        <MobileNavItem active={activeView === 'daily-record'} onClick={() => setActiveView('daily-record')} icon={<ClipboardList size={22}/>} label="Sheet" />
        <MobileNavItem active={activeView === 'customers'} onClick={() => setActiveView('customers')} icon={<Users size={22}/>} label="Users" />
        <MobileNavItem active={activeView === 'reports'} onClick={() => setActiveView('reports'} icon={<BarChart3 size={22}/>} label="Stats" />
        <MobileNavItem active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={22}/>} label="Menu" />
      </nav>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${active ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'}`}>
    <span className={active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>{icon}</span>
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const MobileNavItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-all duration-300 ${active ? 'text-emerald-600 dark:text-emerald-400 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-60'}`}>
    <div className={`p-1 ${active ? 'tab-active' : ''}`}>{icon}</div>
    <span className="text-[9px] font-extrabold uppercase tracking-[0.1em]">{label}</span>
  </button>
);

export default App;
