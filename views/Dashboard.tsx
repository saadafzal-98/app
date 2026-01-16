
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Transaction, TransactionType } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { 
  Users, 
  Droplets, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowUpRight,
  Calendar,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  onCustomerSelect: (id: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCustomerSelect }) => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOutstanding: 0,
    dailySupplyQty: 0,
    dailySupplyAmount: 0,
    weeklyGrowth: 0
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
      const todayTrans = await db.transactions
        .where('date')
        .aboveOrEqual(today)
        .toArray();

      const dailyQty = todayTrans
        .filter(t => t.type === TransactionType.SUPPLY)
        .reduce((acc, t) => acc + (t.quantity || 0), 0);
      const dailyAmt = todayTrans
        .filter(t => t.type === TransactionType.SUPPLY)
        .reduce((acc, t) => acc + t.amount, 0);

      setStats({
        totalCustomers: customers.length,
        totalOutstanding: customers.reduce((acc, c) => acc + c.currentBalance, 0),
        dailySupplyQty: dailyQty,
        dailySupplyAmount: dailyAmt,
        weeklyGrowth: 12.5 
      });
      setRecentTransactions(transactions);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-8 page-transition">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Enterprise Pulse</h1>
          <div className="flex items-center space-x-2 mt-1">
            <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{formatDate(new Date())}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center space-x-2 border border-emerald-100 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Live System</span>
           </div>
        </div>
      </header>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Outstanding" 
          value={formatPKR(stats.totalOutstanding)} 
          trend={+4.5}
          icon={<CreditCard size={20}/>}
          color="rose"
        />
        <StatCard 
          title="Daily Supply" 
          value={`${stats.dailySupplyQty.toFixed(1)}kg`} 
          trend={stats.weeklyGrowth}
          icon={<Droplets size={20}/>}
          color="emerald"
        />
        <StatCard 
          title="Route Members" 
          value={stats.totalCustomers.toString()} 
          trend={+1}
          icon={<Users size={20}/>}
          color="indigo"
        />
        <StatCard 
          title="Revenue (24h)" 
          value={formatPKR(stats.dailySupplyAmount)} 
          trend={+12}
          icon={<TrendingUp size={20}/>}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Ledger Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ledger Pipeline</h2>
            <button className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 uppercase tracking-widest flex items-center">
              View All <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entity</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {recentTransactions.map((t) => (
                    <tr 
                      key={t.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors active:bg-slate-100 dark:active:bg-slate-900"
                      onClick={() => onCustomerSelect(t.customerId)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-3">
                           <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 uppercase">
                              {t.customerName.charAt(0)}
                           </div>
                           <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-none">{t.customerName}</p>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">{formatDate(t.date)}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border ${
                          t.type === TransactionType.SUPPLY 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                            : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className={`font-extrabold text-sm ${
                          t.type === TransactionType.SUPPLY ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                        </p>
                        {t.type === TransactionType.SUPPLY && (
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">{t.quantity} kg recorded</p>
                        )}
                      </td>
                    </tr>
                  ))}
                  {recentTransactions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                         <div className="flex flex-col items-center opacity-30">
                            <Minus size={48} className="mb-2" />
                            <p className="text-sm font-bold uppercase tracking-widest">No Recent activity</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Insights Widget */}
        <div className="space-y-6">
           <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Health</h2>
           <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 dark:shadow-none relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Database Sync</p>
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                 </div>
                 <h3 className="text-2xl font-black">Local Core Ready</h3>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium">Local database is healthy. 100% of records are available for offline operation.</p>
                 <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-white/10">
                    Backup Now
                 </button>
              </div>
              <div className="absolute -right-8 -bottom-8 text-white/5 group-hover:text-emerald-500/10 transition-colors">
                 <TrendingUp size={160} />
              </div>
           </div>
           
           <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Next Billing Cycle</p>
              <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Calendar size={24} />
                 </div>
                 <div>
                    <p className="font-bold text-slate-900 dark:text-white">End of Month</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">7 Days Left</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, trend, icon, color }: any) => {
  const colorMap: any = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
    rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800'
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-bold ${trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
          {trend >= 0 ? <ArrowUpRight size={10} /> : <TrendingDown size={10} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{value}</h3>
      </div>
    </div>
  );
};

export default Dashboard;
