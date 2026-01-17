
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Transaction, TransactionType } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { 
  Users, 
  Droplets, 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight,
  BarChart3,
  Zap,
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  onCustomerSelect: (id: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCustomerSelect }) => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOutstanding: 0,
    dailySupplyQty: 0,
    weeklySupplyQty: 0,
    dailySupplyAmount: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const customers = await db.customers.toArray();
      const transactions = await db.transactions
        .orderBy('date')
        .reverse()
        .limit(8)
        .toArray();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);

      const todayTrans = await db.transactions
        .where('date')
        .aboveOrEqual(today)
        .toArray();
        
      const weekTrans = await db.transactions
        .where('date')
        .aboveOrEqual(lastWeek)
        .toArray();

      const dailyQty = todayTrans
        .filter(t => t.type === TransactionType.SUPPLY)
        .reduce((acc, t) => acc + (t.quantity || 0), 0);
      const dailyAmt = todayTrans
        .filter(t => t.type === TransactionType.SUPPLY)
        .reduce((acc, t) => acc + t.amount, 0);
        
      const weeklyQty = weekTrans
        .filter(t => t.type === TransactionType.SUPPLY)
        .reduce((acc, t) => acc + (t.quantity || 0), 0);

      setStats({
        totalCustomers: customers.length,
        totalOutstanding: customers.reduce((acc, c) => acc + c.currentBalance, 0),
        dailySupplyQty: dailyQty,
        weeklySupplyQty: weeklyQty,
        dailySupplyAmount: dailyAmt
      });
      setRecentTransactions(transactions);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Enterprise Hub</p>
    </div>
  );

  return (
    <div className="space-y-8 page-transition pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Main Command</h1>
          <div className="flex items-center space-x-3 mt-1.5">
            <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center space-x-2 border border-emerald-100 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">System Active</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDate(new Date())}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <div className="hidden lg:flex flex-col text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Volume Today</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.dailySupplyQty.toFixed(1)} <span className="text-sm font-bold opacity-40">Kg</span></p>
           </div>
        </div>
      </header>

      {/* Core Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Customer Dues" 
          value={formatPKR(stats.totalOutstanding)} 
          icon={<CreditCard size={20}/>}
          color="rose"
          trend="Action Required"
        />
        <StatCard 
          title="Daily Output" 
          value={`${stats.dailySupplyQty.toFixed(1)}kg`} 
          icon={<Droplets size={20}/>}
          color="emerald"
          trend="+4% from yesterday"
        />
        <StatCard 
          title="Weekly Trend" 
          value={`${stats.weeklySupplyQty.toFixed(1)}kg`} 
          icon={<BarChart3 size={20}/>}
          color="amber"
          trend="In Sync"
        />
        <StatCard 
          title="Active Clients" 
          value={stats.totalCustomers.toString()} 
          icon={<Users size={20}/>}
          color="indigo"
          trend="Full Capacity"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ledger Pipeline (Main Feed) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Recent Activity</h2>
            <div className="flex space-x-2">
               <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {recentTransactions.map((t) => (
                    <tr 
                      key={t.id} 
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-700/50 cursor-pointer transition-all duration-300"
                      onClick={() => onCustomerSelect(t.customerId)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-4">
                           <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 dark:text-slate-400 uppercase group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                              {t.customerName.charAt(0)}
                           </div>
                           <div>
                              <p className="font-black text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-emerald-600 transition-colors">{t.customerName}</p>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-widest">{formatDate(t.date)}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.18em] border ${
                          t.type === TransactionType.SUPPLY 
                            ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' 
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className={`font-black text-lg ${
                          t.type === TransactionType.SUPPLY ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                        </p>
                        {t.type === TransactionType.SUPPLY && (
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-widest">{t.quantity} kg</p>
                        )}
                      </td>
                    </tr>
                  ))}
                  {recentTransactions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-24 text-center">
                         <div className="flex flex-col items-center opacity-20">
                            <Zap size={64} className="mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest">System idle: No data flow</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {recentTransactions.length > 0 && (
               <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 text-center">
                  <button className="text-xs font-black text-slate-500 hover:text-emerald-600 uppercase tracking-[0.2em] flex items-center justify-center mx-auto transition-colors">
                    Access Historical Logs <ArrowRight size={14} className="ml-2" />
                  </button>
               </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
           <div className="bg-slate-900 dark:bg-emerald-950/40 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-300 dark:shadow-none relative overflow-hidden group border border-white/5">
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                      <Zap size={20} className="text-emerald-400" />
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Encrypted</span>
                    </div>
                 </div>
                 <div>
                    <h3 className="text-2xl font-black tracking-tight leading-tight">Data Integrity Guard</h3>
                    <p className="text-sm text-slate-400 mt-2 font-medium leading-relaxed">Your local database is encrypted and healthy. Manual backup is recommended weekly.</p>
                 </div>
                 <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-900/40 active:scale-95">
                    Sync Ledger Now
                 </button>
              </div>
              <div className="absolute -right-12 -bottom-12 text-white/5 group-hover:text-emerald-500/10 transition-all duration-700 group-hover:scale-125">
                 <TrendingUp size={240} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, trend }: any) => {
  const colorMap: any = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
    rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800'
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 group relative overflow-hidden">
      <div className="relative z-10">
        <div className={`p-4 rounded-2xl ${colorMap[color]} inline-block mb-6 transition-transform group-hover:rotate-12`}>
          {icon}
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-600 transition-colors">{value}</h3>
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-2 flex items-center">
             <ArrowUpRight size={10} className="mr-1" /> {trend}
          </p>
        </div>
      </div>
      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
         {icon}
      </div>
    </div>
  );
};

export default Dashboard;
