
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Customer, Transaction, TransactionType } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { ArrowLeft, Trash2, Droplets, CreditCard, Clock, LineChart, FileText, Share2, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      .toArray();

    // UI SORTING: Newest first
    trans.sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      if (a.type !== b.type) {
        return a.type === TransactionType.PAYMENT ? -1 : 1;
      }
      return (b.id || 0) - (a.id || 0);
    });

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

  const shareWhatsApp = () => {
    if (!customer) return;
    const message = `*Ledger Statement: ${customer.name}*\n` +
      `Date: ${formatDate(new Date())}\n` +
      `--------------------------\n` +
      `📦 Total Supplied: ${customer.totalSupplied.toFixed(2)} kg\n` +
      `💰 Total Paid: ${formatPKR(customer.totalPaid)}\n` +
      `--------------------------\n` +
      `📌 *Current Balance: ${formatPKR(customer.currentBalance)}*\n\n` +
      `_Generated via Ledger Pro_`;
    
    const encoded = encodeURIComponent(message);
    const phone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone.startsWith('0') ? '92' + phone.substring(1) : phone}?text=${encoded}`, '_blank');
  };

  const generatePDF = () => {
    if (!customer) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105);
    doc.text('LEDGER STATEMENT', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${formatDate(new Date())}`, 105, 28, { align: 'center' });
    
    // Customer Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text(`Name: ${customer.name}`, 14, 45);
    doc.text(`Phone: ${customer.phone}`, 14, 52);
    doc.text(`Current Balance: ${formatPKR(customer.currentBalance)}`, 14, 59);

    // Summary Box
    doc.setDrawColor(241, 245, 249);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(140, 40, 56, 25, 3, 3, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.text('Summary', 145, 48);
    doc.setTextColor(15, 23, 42);
    doc.text(`Supplied: ${customer.totalSupplied.toFixed(1)}kg`, 145, 55);
    doc.text(`Paid: ${formatPKR(customer.totalPaid)}`, 145, 62);

    // Table
    const tableData = transactions.map(t => [
      formatDate(t.date),
      t.type,
      t.type === TransactionType.SUPPLY ? `${t.quantity}kg @ ${t.rate}` : '-',
      `${t.type === TransactionType.SUPPLY ? '+' : '-'}${formatPKR(t.amount)}`,
      formatPKR(t.balanceAfter)
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Date', 'Type', 'Rate Info', 'Amount', 'Balance']],
      body: tableData,
      headStyles: { fillColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 75 }
    });

    doc.save(`Ledger_${customer.name}_${formatDate(new Date())}.pdf`);
  };

  const handleDelete = async () => {
    if (window.confirm("Permanently delete this customer and all their records?")) {
      await (db as any).transaction('rw', [db.customers, db.transactions], async () => {
        await db.customers.delete(customerId);
        await db.transactions.where('customerId').equals(customerId).delete();
      });
      onBack();
    }
  };

  if (loading || !customer) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 inline-block"></div></div>;

  return (
    <div className="space-y-6 page-transition pb-10">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Back
        </button>
        <div className="flex items-center space-x-2">
           <button onClick={shareWhatsApp} className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:scale-105 transition-transform">
             <Share2 size={20} />
           </button>
           <button onClick={generatePDF} className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:scale-105 transition-transform">
             <FileDown size={20} />
           </button>
           <button onClick={handleDelete} className="p-2.5 text-rose-400 hover:text-rose-600 transition-colors ml-2">
             <Trash2 size={20} />
           </button>
        </div>
      </div>

      <header className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{customer.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{customer.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total Outstanding</p>
          <p className={`text-3xl font-black ${customer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatPKR(customer.currentBalance)}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniCard label="Total Quantity" value={`${customer.totalSupplied.toFixed(2)} kg`} icon={<Droplets size={16} />} color="text-emerald-600 dark:text-emerald-400" bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
        <MiniCard label="Total Paid" value={formatPKR(customer.totalPaid)} icon={<CreditCard size={16} />} color="text-indigo-600 dark:text-indigo-400" bgColor="bg-indigo-50 dark:bg-indigo-900/20" />
        <MiniCard label="Avg Daily (30d)" value={`${avgDaily.toFixed(2)} kg`} icon={<LineChart size={16} />} color="text-purple-600 dark:text-purple-400" bgColor="bg-purple-50 dark:bg-purple-900/20" />
        <MiniCard label="Last Supply" value={customer.lastSupplyDate ? formatDate(customer.lastSupplyDate) : 'Never'} icon={<Clock size={16} />} color="text-amber-600 dark:text-amber-400" bgColor="bg-amber-50 dark:bg-amber-900/20" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-extrabold text-slate-900 dark:text-white tracking-tight">Ledger Statement</h2>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Log</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-black border-b border-slate-100 dark:border-slate-700 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Timeline</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4 text-right">Metrics</th>
                <th className="px-6 py-4 text-right">Volume</th>
                <th className="px-6 py-4 text-right">Final Bal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {transactions.map((t, idx) => (
                <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${idx === 0 ? 'bg-emerald-50/20 dark:bg-emerald-900/10' : ''}`}>
                  <td className="px-6 py-5 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                      t.type === TransactionType.SUPPLY 
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600' 
                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right text-slate-400 font-bold text-[11px]">
                    {t.type === TransactionType.SUPPLY ? `${t.quantity}kg @ ${t.rate}` : t.paymentMethod}
                  </td>
                  <td className={`px-6 py-5 text-right font-black ${
                    t.type === TransactionType.SUPPLY ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                  </td>
                  <td className={`px-6 py-5 text-right font-black ${idx === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {formatPKR(t.balanceAfter)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                       <Clock size={40} className="mb-2" />
                       <p className="text-xs font-black uppercase tracking-widest">No transaction trail</p>
                    </div>
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

const MiniCard = ({ label, value, icon, color, bgColor }: any) => (
  <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
    <div className={`flex items-center justify-center w-8 h-8 rounded-xl ${bgColor} ${color} mb-3`}>
      {icon}
    </div>
    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">{label}</div>
    <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
  </div>
);

export default CustomerDetail;
