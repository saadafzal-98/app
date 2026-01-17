
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
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing System...</p>
    </div>
  );

  return (
    <div className="space-y-8 page-transition pb-10 overflow-x-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Command Center</h1>
          <div className="flex items-center space-x-3 mt-1.5">
            <div className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center space-x-2 border border-emerald-100 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Active</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(new Date())}</p>
          </div>
        </div>
      </header>

      {/* Core Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Outstanding" 
          value={formatPKR(stats.totalOutstanding)} 
          icon={<CreditCard size={18}/>}
          color="rose"
          trend="Attention"
        />
        <StatCard 
          title="Daily Qty" 
          value={`${stats.dailySupplyQty.toFixed(1)}kg`} 
          icon={<Droplets size={18}/>}
          color="emerald"
          trend="In Sync"
        />
        <StatCard 
          title="Weekly Trend" 
          value={`${stats.weeklySupplyQty.toFixed(1)}kg`} 
          icon={<BarChart3 size={18}/>}
          color="amber"
          trend="Stable"
        />
        <StatCard 
          title="Clients" 
          value={stats.totalCustomers.toString()} 
          icon={<Users size={18}/>}
          color="indigo"
          trend="Verified"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pipeline Feed</h2>
            <div className="flex space-x-1">
               <div className="w-2 h-2 rounded-full bg-emerald-500/20"></div>
               <div className="w-2 h-2 rounded-full bg-emerald-500/40"></div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[320px]">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                    <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-4 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {recentTransactions.map((t) => (
                    <tr 
                      key={t.id} 
                      className="group hover:bg-slate-50/80 dark:hover:bg-slate-700/50 cursor-pointer transition-all duration-300"
                      onClick={() => onCustomerSelect(t.customerId)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                           <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 dark:text-slate-400 uppercase text-xs">
                              {t.customerName.charAt(0)}
                           </div>
                           <div className="min-w-0">
                              <p className="font-black text-slate-900 dark:text-white leading-none tracking-tight text-sm truncate">{t.customerName}</p>
                              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest truncate">{formatDate(t.date)}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${
                          t.type === TransactionType.SUPPLY 
                            ? 'bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' 
                            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className={`font-black text-sm md:text-base ${
                          t.type === TransactionType.SUPPLY ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                        </p>
                      </td>
                    </tr>
                  ))}
                  {recentTransactions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                         <div className="flex flex-col items-center opacity-20">
                            <Zap size={48} className="mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Activity Flow</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {recentTransactions.length > 0 && (
               <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 text-center">
                  <button className="text-[9px] font-black text-slate-500 hover:text-emerald-600 uppercase tracking-[0.2em] flex items-center justify-center mx-auto">
                    View Complete Audit <ArrowRight size={12} className="ml-1.5" />
                  </button>
               </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 dark:bg-emerald-950/40 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group border border-white/5">
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Zap size={18} className="text-emerald-400" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Secure Vault</span>
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-tight leading-tight">Data Integrity</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">Local ledger encrypted and synchronized.</p>
                 </div>
                 <button className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95">
                    Trigger Manual Sync
                 </button>
              </div>
              <div className="absolute -right-8 -bottom-8 text-white/5 pointer-events-none group-hover:scale-110 transition-transform">
                 <TrendingUp size={160} />
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
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:translate-y-[-2px] transition-all group overflow-hidden">
      <div className="relative z-10">
        <div className={`p-3 rounded-xl ${colorMap[color]} inline-block mb-4`}>
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{value}</h3>
          <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-1 flex items-center">
             <ArrowUpRight size={8} className="mr-1" /> {trend}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
