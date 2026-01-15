
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
    const headers = ['Date', 'Customer', 'Type', 'Quantity', 'Rate', 'Amount', 'Method'];
    const rows = transactions.map(t => [
      formatDate(t.date),
      t.customerName,
      t.type,
      t.quantity || 0,
      t.rate || 0,
      t.amount,
      t.paymentMethod || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `farm_ledger_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Business Reports</h1>
          <p className="text-gray-500">Analyze performance and trends</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center justify-center space-x-2 bg-gray-800 text-white px-4 py-2.5 rounded-lg hover:bg-black transition-colors font-medium"
        >
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter Range:</span>
        </div>
        <div className="flex items-center space-x-2">
          <input 
            type="date" 
            className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-gray-400">to</span>
          <input 
            type="date" 
            className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ReportSummaryCard 
          label="Total Supply Quantity" 
          value={`${summary.totalSupplied.toFixed(2)} kg`} 
          icon={<TrendingUp className="text-blue-600" size={20}/>}
          color="bg-blue-50"
        />
        <ReportSummaryCard 
          label="Total Amount Billed" 
          value={formatPKR(summary.totalBilled)} 
          icon={<BarChart3 className="text-purple-600" size={20}/>}
          color="bg-purple-50"
        />
        <ReportSummaryCard 
          label="Total Collections" 
          value={formatPKR(summary.totalPaid)} 
          icon={<TrendingDown className="text-green-600" size={20}/>}
          color="bg-green-50"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Filtered Transactions ({transactions.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium">{t.customerName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      t.type === TransactionType.SUPPLY ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    t.type === TransactionType.SUPPLY ? 'text-gray-800' : 'text-green-600'
                  }`}>
                    {t.type === TransactionType.SUPPLY ? '+' : '-'}{formatPKR(t.amount)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">No records found for this period</td>
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
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    </div>
    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">{label}</div>
    <div className="text-2xl font-black text-gray-900">{value}</div>
  </div>
);

export default Reports;
