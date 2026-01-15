
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings as SettingsIcon,
  ClipboardList
} from 'lucide-react';
import { db, initSettings } from './db';
import Dashboard from './views/Dashboard';
import Customers from './views/Customers';
import DailyRecord from './views/DailyRecord';
import Reports from './views/Reports';
import Settings from './views/Settings';
import CustomerDetail from './views/CustomerDetail';

type View = 'dashboard' | 'customers' | 'daily-record' | 'reports' | 'settings' | 'customer-detail';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initSettings().then(() => setIsInitialized(true));
  }, []);

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
      case 'settings': return <Settings />;
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

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pl-64">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-50">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-700">FarmLedger</h1>
          <p className="text-xs text-gray-400">Pro Edition</p>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavItem active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <NavItem active={activeView === 'daily-record'} onClick={() => setActiveView('daily-record')} icon={<ClipboardList size={20}/>} label="Daily Record" />
          <NavItem active={activeView === 'customers'} onClick={() => setActiveView('customers')} icon={<Users size={20}/>} label="Customers" />
          <NavItem active={activeView === 'reports'} onClick={() => setActiveView('reports')} icon={<BarChart3 size={20}/>} label="Reports" />
          <NavItem active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={20}/>} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {renderView()}
      </main>

      {/* FAB (Floating Action Button) for common mobile tasks */}
      {['dashboard', 'customers'].includes(activeView) && (
        <button 
          onClick={() => setActiveView('daily-record')}
          className="fixed bottom-24 right-6 md:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-40"
        >
          <ClipboardList size={28} />
        </button>
      )}

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-2 z-50">
        <MobileNavItem active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<LayoutDashboard size={20}/>} label="Home" />
        <MobileNavItem active={activeView === 'daily-record'} onClick={() => setActiveView('daily-record')} icon={<ClipboardList size={20}/>} label="Record" />
        <MobileNavItem active={activeView === 'customers'} onClick={() => setActiveView('customers')} icon={<Users size={20}/>} label="Users" />
        <MobileNavItem active={activeView === 'reports'} onClick={() => setActiveView('reports')} icon={<BarChart3 size={20}/>} label="Stats" />
        <MobileNavItem active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={20}/>} label="Config" />
      </nav>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MobileNavItem = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
      active ? 'text-blue-600' : 'text-gray-400'
    }`}
  >
    {icon}
    <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
  </button>
);

export default App;
