
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

    const trans = await db.transactions
      .where('customerId')
      .equals(customerId)
      .reverse()
      .toArray();

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
      // Fix: Accessing transaction method with explicit casting to any to satisfy type checker
      await (db as any).transaction('rw', [db.customers, db.transactions], async () => {
        await db.customers.delete(customerId);
        await db.transactions.where('customerId').equals(customerId).delete();
      });
      onBack();
    }
  };

  if (loading || !customer) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 inline-block"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-blue-600 flex items-center">
          <ArrowLeft size={20} className="mr-1" /> Back
        </button>
        <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-600">
          <Trash2 size={20} />
        </button>
      </div>

      <header className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
          <p className="text-gray-500">{customer.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Outstanding Balance</p>
          <p className={`text-3xl font-black ${customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatPKR(customer.currentBalance)}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard label="Total Quantity" value={`${customer.totalSupplied.toFixed(2)} kg`} icon={<Droplets size={16} />} color="text-blue-600" />
        <MiniCard label="Total Paid" value={formatPKR(customer.totalPaid)} icon={<CreditCard size={16} />} color="text-green-600" />
        <MiniCard label="Avg Daily (30d)" value={`${avgDaily.toFixed(2)} kg`} icon={<LineChart size={16} />} color="text-purple-600" />
        <MiniCard label="Last Supply" value={customer.lastSupplyDate ? formatDate(customer.lastSupplyDate) : 'Never'} icon={<Clock size={16} />} color="text-orange-600" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center space-x-2">
          <FileText size={18} className="text-blue-600" />
          <h2 className="font-bold text-gray-800">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Qty/Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      t.type === TransactionType.SUPPLY ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {t.type === TransactionType.SUPPLY ? `${t.quantity}kg @ ${t.rate}` : '-'}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    t.type === TransactionType.SUPPLY ? 'text-gray-800' : 'text-green-600'
                  }`}>
                    {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-600">{formatPKR(t.balanceAfter)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">No transaction history found</td>
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
    <div className={`flex items-center space-x-1.5 ${color} mb-1`}>
      {icon}
      <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
    </div>
    <div className="text-lg font-bold text-gray-900">{value}</div>
  </div>
);

export default CustomerDetail;
