
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Customer, Transaction, TransactionType } from '../types';
import { formatPKR, formatInputDate, formatDate, getStartOfDay } from '../utils/formatters';
import { Save, CheckCircle2, Loader2, RotateCcw, History, ArrowRight } from 'lucide-react';

interface DailyRecordProps { onSuccess: () => void; }

interface DayEntry {
  qty: string;
  pay: string;
}

const DailyRecord: React.FC<DailyRecordProps> = ({ onSuccess }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [farmRate, setFarmRate] = useState<number>(150);
  const [date, setDate] = useState(formatInputDate(new Date()));
  const [inputs, setInputs] = useState<Record<number, DayEntry>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(true);
  const [completed, setCompleted] = useState(false);

  const fetchCounter = useRef(0);

  useEffect(() => {
    const init = async () => {
      const all = await db.customers.toArray();
      const settings = await db.settings.get('global');
      if (settings) setFarmRate(settings.farmRate);
      setCustomers(all);
      
      const initial: Record<number, DayEntry> = {};
      all.forEach(c => { initial[c.id!] = { qty: '', pay: '' }; });
      setInputs(initial);
    };
    init();
  }, []);

  useEffect(() => {
    const fetchExisting = async () => {
      const currentFetchId = ++fetchCounter.current;
      setFetching(true);
      
      const startOfDay = getStartOfDay(date);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      const existingTrans = await db.transactions
        .where('date')
        .between(startOfDay, endOfDay)
        .toArray();

      if (currentFetchId !== fetchCounter.current) return;

      const newInputs: Record<number, DayEntry> = {};
      let foundAny = false;

      customers.forEach(c => {
        const supply = existingTrans.find(t => t.customerId === c.id && t.type === TransactionType.SUPPLY);
        const payment = existingTrans.find(t => t.customerId === c.id && t.type === TransactionType.PAYMENT);
        
        if (supply || payment) foundAny = true;

        newInputs[c.id!] = {
          qty: supply ? supply.quantity?.toString() || '' : '',
          pay: payment ? payment.amount.toString() || '' : ''
        };
      });

      setInputs(newInputs);
      setIsNewRecord(!foundAny);
      setFetching(false);
    };

    if (customers.length > 0) fetchExisting();
  }, [date, customers]);

  const handleInputChange = (id: number, field: 'qty' | 'pay', value: string) => {
    setInputs(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSave = async () => {
    const standardizedDate = getStartOfDay(date);
    setLoading(true);

    try {
      await db.settings.update('global', { farmRate });

      await (db as any).transaction('rw', [db.transactions, db.customers], async () => {
        const start = standardizedDate;
        const end = new Date(standardizedDate);
        end.setHours(23, 59, 59, 999);

        for (const c of customers) {
          const entry = inputs[c.id!];
          const newQty = parseFloat(entry.qty) || 0;
          const newPay = parseFloat(entry.pay) || 0;
          
          const existingTrans = await db.transactions.where('date').between(start, end).toArray();
          const oldSupply = existingTrans.find(t => t.customerId === c.id && t.type === TransactionType.SUPPLY);
          const oldPayment = existingTrans.find(t => t.customerId === c.id && t.type === TransactionType.PAYMENT);
          
          const oldQty = oldSupply?.quantity || 0;
          const oldPay = oldPayment?.amount || 0;

          if (newQty === oldQty && newPay === oldPay && (oldSupply || oldPayment || (newQty === 0 && newPay === 0))) {
            continue; 
          }

          const dailyRate = farmRate + c.supplyRate;

          if (newQty > 0) {
            const amount = newQty * dailyRate;
            if (oldSupply) {
              await db.transactions.update(oldSupply.id!, { quantity: newQty, rate: dailyRate, amount: amount });
            } else {
              await db.transactions.add({
                customerId: c.id!,
                customerName: c.name,
                date: standardizedDate,
                type: TransactionType.SUPPLY,
                quantity: newQty,
                rate: dailyRate,
                amount: amount,
                balanceAfter: 0 
              });
            }
          } else if (oldSupply) {
            await db.transactions.delete(oldSupply.id!);
          }

          if (newPay > 0) {
            if (oldPayment) {
              await db.transactions.update(oldPayment.id!, { amount: newPay });
            } else {
              await db.transactions.add({
                customerId: c.id!,
                customerName: c.name,
                date: standardizedDate,
                type: TransactionType.PAYMENT,
                amount: newPay,
                balanceAfter: 0
              });
            }
          } else if (oldPayment) {
            await db.transactions.delete(oldPayment.id!);
          }

          const allCustomerTrans = await db.transactions
            .where('customerId').equals(c.id!)
            .toArray();

          allCustomerTrans.sort((a, b) => {
            const dateDiff = a.date.getTime() - b.date.getTime();
            if (dateDiff !== 0) return dateDiff;
            if (a.type !== b.type) {
              return a.type === TransactionType.SUPPLY ? -1 : 1;
            }
            return (a.id || 0) - (b.id || 0);
          });

          let runningBalance = c.openingBalance;
          let totalSupplied = 0;
          let totalPaid = 0;
          let lastSupplyDate = c.createdAt;

          for (const t of allCustomerTrans) {
            if (t.type === TransactionType.SUPPLY) {
              runningBalance += t.amount;
              totalSupplied += (t.quantity || 0);
              lastSupplyDate = t.date;
            } else {
              runningBalance -= t.amount;
              totalPaid += t.amount;
            }
            await db.transactions.update(t.id!, { balanceAfter: runningBalance });
          }

          await db.customers.update(c.id!, {
            currentBalance: runningBalance,
            totalSupplied,
            totalPaid,
            lastSupplyDate
          });
        }
      });

      setCompleted(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      console.error(err);
      alert("System Error: Could not synchronize ledger.");
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 page-transition">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-[2rem] flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-50 dark:shadow-none">
          <CheckCircle2 size={56} strokeWidth={2.5} />
        </div>
        <div className="text-center">
           <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sheet Synchronized</h2>
           <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">Chain re-calculated successfully</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto page-transition pb-20 px-1">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Daily Record</h1>
          <div className="flex items-center space-x-3 mt-2">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{formatDate(date)}</span>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
            {isNewRecord ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 uppercase border border-emerald-100 dark:border-emerald-800 tracking-wider">Fresh Session</span>
            ) : (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase border border-amber-100 dark:border-amber-800 tracking-wider">Editing Entry</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 p-2.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
           <div className="flex flex-col px-3 border-r border-slate-100 dark:border-slate-700">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Entry Date</span>
              <input 
                type="date" 
                className="bg-transparent text-sm font-bold outline-none text-slate-900 dark:text-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
           </div>
           <div className="flex flex-col px-3">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Base Rate</span>
              <div className="flex items-center space-x-1">
                 <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black">Rs</span>
                 <input 
                   type="number" 
                   className="bg-transparent text-sm font-black outline-none w-14 text-slate-900 dark:text-white"
                   value={farmRate}
                   onChange={(e) => setFarmRate(parseFloat(e.target.value) || 0)}
                 />
              </div>
           </div>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Customer Entity</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-center">Volume (Kg)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-center">Received (Rs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{c.name}</div>
                    <div className="flex items-center space-x-2 mt-1.5">
                       <span className={`text-[10px] font-black uppercase tracking-wider ${c.currentBalance > 0 ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                          Bal: {formatPKR(c.currentBalance)}
                       </span>
                       <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-600"></span>
                       <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rate: {farmRate + c.supplyRate}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="relative max-w-[140px] mx-auto">
                       <input 
                         type="number" 
                         inputMode="decimal"
                         placeholder="0.00"
                         className={`w-full py-4 text-center font-black text-lg rounded-2xl outline-none transition-all border-2 ${
                           inputs[c.id!]?.qty 
                            ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100' 
                            : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 focus:border-slate-300 dark:focus:border-slate-600'
                         }`}
                         value={inputs[c.id!]?.qty || ''}
                         onChange={(e) => handleInputChange(c.id!, 'qty', e.target.value)}
                       />
                       {inputs[c.id!]?.qty && <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg"><CheckCircle2 size={12} /></div>}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="relative max-w-[140px] mx-auto">
                       <input 
                         type="number" 
                         inputMode="numeric"
                         placeholder="0"
                         className={`w-full py-4 text-center font-black text-lg rounded-2xl outline-none transition-all border-2 ${
                           inputs[c.id!]?.pay 
                            ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100' 
                            : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 focus:border-slate-300 dark:focus:border-slate-600'
                         }`}
                         value={inputs[c.id!]?.pay || ''}
                         onChange={(e) => handleInputChange(c.id!, 'pay', e.target.value)}
                       />
                       {inputs[c.id!]?.pay && <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg"><CheckCircle2 size={12} /></div>}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                   <td colSpan={3} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <Loader2 size={40} className="mb-4 animate-spin text-slate-400" />
                        <p className="font-bold uppercase tracking-widest text-xs dark:text-slate-400">Awaiting Customer Registry</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4">
         <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-800">
               <History size={20} />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Mechanism</p>
               <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Automated Balance Chain Re-Calculation</p>
            </div>
         </div>
         
         <button
           onClick={handleSave}
           disabled={loading || customers.length === 0}
           className="w-full sm:w-auto gradient-primary text-white px-12 py-5 rounded-[1.5rem] font-black shadow-2xl shadow-emerald-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
         >
           {loading ? (
             <Loader2 className="animate-spin h-6 w-6" />
           ) : (
             <>
               <span className="uppercase tracking-[0.1em]">{isNewRecord ? 'Commit Records' : 'Sync History'}</span>
               <ArrowRight size={20} />
             </>
           )}
         </button>
      </div>
    </div>
  );
};

export default DailyRecord;
