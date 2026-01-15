
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Customer, Transaction, TransactionType } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { Users, Droplets, CreditCard, TrendingUp, TrendingDown, Minus, Smartphone, ChevronRight, Info } from 'lucide-react';

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
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const customers = await db.customers.toArray();
      const transactions = await db.transactions
        .orderBy('date')
        .reverse()
        .limit(10)
        .toArray();

      // Today's Stats
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

      // Growth Stats (This week vs Last week)
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const thisWeekTrans = await db.transactions
        .where('date')
        .between(oneWeekAgo, now)
        .toArray();
      
      const lastWeekTrans = await db.transactions
        .where('date')
        .between(twoWeeksAgo, oneWeekAgo)
        .toArray();

      const thisWeekQty = thisWeekTrans
        .filter(t => t.type === TransactionType.SUPPLY)
        .reduce((acc, t) => acc + (t.quantity || 0), 0);
      
      const lastWeekQty = lastWeekTrans
        .filter(t => t.type === TransactionType.SUPPLY)
        .reduce((acc, t) => acc + (t.quantity || 0), 0);

      let growth = 0;
      if (lastWeekQty > 0) {
        growth = ((thisWeekQty - lastWeekQty) / lastWeekQty) * 100;
      } else if (thisWeekQty > 0) {
        growth = 100;
      }

      setStats({
        totalCustomers: customers.length,
        totalOutstanding: customers.reduce((acc, c) => acc + c.currentBalance, 0),
        dailySupplyQty: dailyQty,
        dailySupplyAmount: dailyAmt,
        weeklyGrowth: growth
      });
      setRecentTransactions(transactions);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6 page-transition">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Business Overview</h1>
          <p className="text-gray-500">Real-time summary for {formatDate(new Date())}</p>
        </div>
        <button 
          onClick={() => setShowInstallHelp(!showInstallHelp)}
          className="flex items-center space-x-1 text-xs font-bold bg-blue-50 text-blue-600 px-3 py-2 rounded-full hover:bg-blue-100 transition-colors"
        >
          <Smartphone size={14} />
          <span>Get App on Phone</span>
        </button>
      </header>

      {showInstallHelp && (
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white shadow-xl animate-in slide-in-from-top duration-300 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Smartphone className="mr-2" /> How to Install FarmLedger Pro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="font-bold text-blue-100 uppercase text-[10px] tracking-widest">Android (Chrome)</p>
                <ol className="text-sm space-y-1 list-decimal list-inside text-blue-50">
                  <li>Open this link in <b>Chrome</b> browser</li>
                  <li>Tap the <b>three dots (⋮)</b> in top right</li>
                  <li>Select <b>"Install App"</b> or <b>"Add to Home screen"</b></li>
                </ol>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-blue-100 uppercase text-[10px] tracking-widest">iPhone (Safari)</p>
                <ol className="text-sm space-y-1 list-decimal list-inside text-blue-50">
                  <li>Open this link in <b>Safari</b> browser</li>
                  <li>Tap the <b>Share icon</b> (square with arrow)</li>
                  <li>Scroll down and tap <b>"Add to Home Screen"</b></li>
                </ol>
              </div>
            </div>
            <p className="mt-6 text-xs text-blue-200 italic flex items-center">
              <Info size={12} className="mr-1" /> The app will work offline once installed!
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <Smartphone size={200} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Outstanding Balance" 
          value={formatPKR(stats.totalOutstanding)} 
          subtitle="Receivable from customers"
          icon={<CreditCard className="text-red-600" size={20}/>}
          color="bg-red-50"
        />
        <StatCard 
          title="Today's Supply" 
          value={`${stats.dailySupplyQty.toFixed(2)} kg`} 
          subtitle={`Value: ${formatPKR(stats.dailySupplyAmount)}`}
          icon={<Droplets className="text-blue-600" size={20}/>}
          color="bg-blue-50"
        />
        <StatCard 
          title="Total Customers" 
          value={stats.totalCustomers.toString()} 
          subtitle="Active route members"
          icon={<Users className="text-green-600" size={20}/>}
          color="bg-green-50"
        />
        <StatCard 
          title="Weekly Growth" 
          value={`${stats.weeklyGrowth > 0 ? '+' : ''}${stats.weeklyGrowth.toFixed(1)}%`} 
          subtitle="Supply qty vs last week"
          icon={
            stats.weeklyGrowth > 0 
              ? <TrendingUp className="text-purple-600" size={20}/> 
              : stats.weeklyGrowth < 0 
                ? <TrendingDown className="text-red-600" size={20}/>
                : <Minus className="text-gray-600" size={20}/>
          }
          color="bg-purple-50"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransactions.map((t) => (
                <tr 
                  key={t.id} 
                  className="hover:bg-gray-50 cursor-pointer active:bg-gray-100"
                  onClick={() => onCustomerSelect(t.customerId)}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{t.customerName}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      t.type === TransactionType.SUPPLY 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${
                    t.type === TransactionType.SUPPLY ? 'text-gray-700' : 'text-green-600'
                  }`}>
                    {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">No transactions recorded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon, color }: any) => (
  <div className={`p-4 rounded-xl border border-gray-100 shadow-sm bg-white`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
    </div>
    <div className="mt-1">
      <h3 className="text-xl font-black text-gray-900">{value}</h3>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  </div>
);

export default Dashboard;
