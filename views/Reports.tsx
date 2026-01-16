
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Transaction, TransactionType } from '../types';
import { formatPKR, formatDate, formatInputDate } from '../utils/formatters';
import { Calendar, BarChart3, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';

const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState(formatInputDate(new Date(new Date().setDate(new Date().getDate() - 30))));
  const [endDate, setEndDate] = useState(formatInputDate(new Date()));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    totalSupplied: 0,
    totalBilled: 0,
    totalPaid: 0,
    transactionCount: 0
  });

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const trans = await db.transactions
      .where('date')
      .between(start, end)
      .reverse()
      .toArray();

    const billed = trans.filter(t => t.type === TransactionType.SUPPLY).reduce((acc, t) => acc + t.amount, 0);
    const paid = trans.filter(t => t.type === TransactionType.PAYMENT).reduce((acc, t) => acc + t.amount, 0);
    const qty = trans.filter(t => t.type === TransactionType.SUPPLY).reduce((acc, t) => acc + (t.quantity || 0), 0);

    setSummary({
      totalSupplied: qty,
      totalBilled: billed,
      totalPaid: paid,
      transactionCount: trans.length
    });
    setTransactions(trans);
  };

  const exportCSV = () => {
    // Explicitly sort by date descending to ensure CSV matches UI
    const sortedTrans = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    const headers = ['Date', 'Customer', 'Type', 'Quantity', 'Rate', 'Amount', 'Method', 'Balance After'];
    const rows = sortedTrans.map(t => [
      formatDate(t.date),
      `"${t.customerName.replace(/"/g, '""')}"`, // Escape quotes and handle commas
      t.type,
      t.quantity || 0,
      t.rate || 0,
      t.amount,
      t.paymentMethod || '',
      t.balanceAfter
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add BOM for Excel UTF-8 support
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 page-transition">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Business Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Analyze performance and trends</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center justify-center space-x-2 bg-slate-900 dark:bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all font-bold shadow-lg"
        >
          <Download size={18} />
          <span className="uppercase tracking-widest text-xs">Export Sorted CSV</span>
        </button>
      </header>

      <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-emerald-600" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Filter Range:</span>
        </div>
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl">
          <input 
            type="date" 
            className="bg-transparent text-sm font-bold focus:outline-none dark:text-white"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-slate-300 font-bold">→</span>
          <input 
            type="date" 
            className="bg-transparent text-sm font-bold focus:outline-none dark:text-white"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportSummaryCard 
          label="Total Supply Quantity" 
          value={`${summary.totalSupplied.toFixed(2)} kg`} 
          icon={<TrendingUp className="text-blue-600 dark:text-blue-400" size={20}/>}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <ReportSummaryCard 
          label="Total Amount Billed" 
          value={formatPKR(summary.totalBilled)} 
          icon={<BarChart3 className="text-purple-600 dark:text-purple-400" size={20}/>}
          color="bg-purple-50 dark:bg-purple-900/20"
        />
        <ReportSummaryCard 
          label="Total Collections" 
          value={formatPKR(summary.totalPaid)} 
          icon={<TrendingDown className="text-emerald-600 dark:text-emerald-400" size={20}/>}
          color="bg-emerald-50 dark:bg-emerald-900/20"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-extrabold text-slate-900 dark:text-white tracking-tight underline decoration-emerald-500 decoration-4 underline-offset-8">Chronological Log ({transactions.length})</h2>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Newest First</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-black border-b border-slate-100 dark:border-slate-700 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Final Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-5 text-slate-500 dark:text-slate-400 font-bold">{formatDate(t.date)}</td>
                  <td className="px-6 py-5 font-extrabold text-slate-900 dark:text-white">{t.customerName}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                      t.type === TransactionType.SUPPLY ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-6 py-5 text-right font-black text-lg ${
                    t.type === TransactionType.SUPPLY ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center opacity-30">
                       <BarChart3 size={48} className="mb-2" />
                       <p className="text-sm font-black uppercase tracking-widest dark:text-white">No records for this period</p>
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

const ReportSummaryCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
    <div className={`p-3 rounded-2xl ${color} inline-block mb-4`}>{icon}</div>
    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-[0.2em] mb-1">{label}</div>
    <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
  </div>
);

export default Reports;
