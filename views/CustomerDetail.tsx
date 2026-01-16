
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Customer, Transaction, TransactionType } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { ArrowLeft, Trash2, Calendar, Droplets, CreditCard, Clock, LineChart, FileText } from 'lucide-react';

interface CustomerDetailProps {
  customerId: number;
  onBack: () => void;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({ customerId, onBack }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [avgDaily, setAvgDaily] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    const cust = await db.customers.get(customerId);
    if (!cust) return;

    // Fetch all transactions for this customer
    const trans = await db.transactions
      .where('customerId')
      .equals(customerId)
      .toArray();

    // Sort for UI: Newest Date first. 
    // For same date: Payment on top (latest state), Supply below it.
    trans.sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      
      // If same day, Payment (final day state) should be displayed above Supply
      if (a.type !== b.type) {
        return a.type === TransactionType.PAYMENT ? -1 : 1;
      }
      return (b.id || 0) - (a.id || 0);
    });

    // Calc average quantity for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSupplies = trans.filter(t => 
      t.type === TransactionType.SUPPLY && t.date >= thirtyDaysAgo
    );
    const sum = recentSupplies.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    setAvgDaily(recentSupplies.length > 0 ? sum / recentSupplies.length : 0);

    setCustomer(cust);
    setTransactions(trans);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure? This will delete the customer and all their transaction history.")) {
      await (db as any).transaction('rw', [db.customers, db.transactions], async () => {
        await db.customers.delete(customerId);
        await db.transactions.where('customerId').equals(customerId).delete();
      });
      onBack();
    }
  };

  if (loading || !customer) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 inline-block"></div></div>;

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-blue-600 flex items-center transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Back
        </button>
        <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-600 transition-colors">
          <Trash2 size={20} />
        </button>
      </div>

      <header className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
          <p className="text-gray-500 font-medium">{customer.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Current Ledger Balance</p>
          <p className={`text-3xl font-black ${customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatPKR(customer.currentBalance)}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard label="Total Quantity" value={`${customer.totalSupplied.toFixed(2)} kg`} icon={<Droplets size={16} />} color="text-blue-600" />
        <MiniCard label="Total Paid" value={formatPKR(customer.totalPaid)} icon={<CreditCard size={16} />} color="text-green-600" />
        <MiniCard label="Avg Daily (30d)" value={`${avgDaily.toFixed(2)} kg`} icon={<LineChart size={16} />} color="text-purple-600" />
        <MiniCard label="Last Supply" value={customer.lastSupplyDate ? formatDate(customer.lastSupplyDate) : 'Never'} icon={<Clock size={16} />} color="text-orange-600" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-800">Statement of Account</h2>
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase">Sorted by Newest</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
              <tr>
                <th className="px-4 py-4">Date</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4 text-right">Qty/Rate</th>
                <th className="px-4 py-4 text-right">Amount</th>
                <th className="px-4 py-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t, idx) => (
                <tr key={t.id} className={`hover:bg-blue-50/30 transition-colors ${idx === 0 ? 'bg-blue-50/10' : ''}`}>
                  <td className="px-4 py-4 text-gray-600 font-medium whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      t.type === TransactionType.SUPPLY ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-gray-500 font-mono">
                    {t.type === TransactionType.SUPPLY ? `${t.quantity}kg @ ${t.rate}` : '-'}
                  </td>
                  <td className={`px-4 py-4 text-right font-black ${
                    t.type === TransactionType.SUPPLY ? 'text-gray-800' : 'text-green-600'
                  }`}>
                    {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                  </td>
                  <td className={`px-4 py-4 text-right font-black ${idx === 0 ? 'text-blue-700' : 'text-gray-600'}`}>
                    {formatPKR(t.balanceAfter)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-400 italic">
                    No transactions recorded for this customer yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MiniCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
    <div className={`flex items-center space-x-1.5 ${color} mb-1.5`}>
      {icon}
      <span className="text-[10px] uppercase font-black tracking-widest">{label}</span>
    </div>
    <div className="text-lg font-black text-gray-900">{value}</div>
  </div>
);

export default CustomerDetail;
