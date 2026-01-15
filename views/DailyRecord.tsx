
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Customer, Transaction, TransactionType } from '../types';
import { formatPKR, formatInputDate, formatDate } from '../utils/formatters';
import { Calendar, Save, CheckCircle2, Weight, Banknote, Tag, Loader2, RotateCcw, Info, History, PlusCircle, AlertCircle } from 'lucide-react';

interface DailyRecordProps { onSuccess: () => void; }

interface DayEntry {
  qty: string;
  pay: string;
  supplyId?: number;
  paymentId?: number;
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
  const [syncing, setSyncing] = useState(false);

  // Use a ref to prevent race conditions during rapid date switching
  const fetchCounter = useRef(0);

  // Initialize customers and settings
  useEffect(() => {
    const init = async () => {
      const all = await db.customers.toArray();
      const settings = await db.settings.get('global');
      if (settings) setFarmRate(settings.farmRate);
      setCustomers(all);
      
      // Default state: empty inputs
      const initial: Record<number, DayEntry> = {};
      all.forEach(c => { initial[c.id!] = { qty: '', pay: '' }; });
      setInputs(initial);
    };
    init();
  }, []);

  // Fetch Existing Records when Date changes
  useEffect(() => {
    const fetchExisting = async () => {
      const currentFetchId = ++fetchCounter.current;
      setFetching(true);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingTrans = await db.transactions
        .where('date')
        .between(startOfDay, endOfDay)
        .toArray();

      // If a newer fetch started, ignore this result
      if (currentFetchId !== fetchCounter.current) return;

      const newInputs: Record<number, DayEntry> = {};
      let foundAny = false;

      customers.forEach(c => {
        const supply = existingTrans.find(t => t.customerId === c.id && t.type === TransactionType.SUPPLY);
        const payment = existingTrans.find(t => t.customerId === c.id && t.type === TransactionType.PAYMENT);
        
        if (supply || payment) foundAny = true;

        newInputs[c.id!] = {
          qty: supply ? supply.quantity?.toString() || '' : '',
          pay: payment ? payment.amount.toString() || '' : '',
          supplyId: supply?.id,
          paymentId: payment?.id
        };
      });

      // If no data found, reset to empty inputs immediately
      if (!foundAny) {
        const empty: Record<number, DayEntry> = {};
        customers.forEach(c => { empty[c.id!] = { qty: '', pay: '' }; });
        setInputs(empty);
      } else {
        setInputs(newInputs);
      }

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
    const dateObj = new Date(date);
    dateObj.setHours(12, 0, 0, 0); 

    setLoading(true);

    try {
      await db.settings.update('global', { farmRate });

      await db.transaction('rw', [db.transactions, db.customers], async () => {
        for (const c of customers) {
          const entry = inputs[c.id!];
          const newQty = parseFloat(entry.qty) || 0;
          const newPay = parseFloat(entry.pay) || 0;
          
          const start = new Date(date).setHours(0,0,0,0);
          const end = new Date(date).setHours(23,59,59,999);
          const existingTrans = await db.transactions.where('date').between(start, end).toArray();
          const oldSupply = existingTrans.find(t => t.customerId === c.id && t.type === TransactionType.SUPPLY);
          const oldPayment = existingTrans.find(t => t.customerId === c.id && t.type === TransactionType.PAYMENT);
          
          const oldQty = oldSupply?.quantity || 0;
          const oldPay = oldPayment?.amount || 0;

          // Optimization: Skip if nothing changed
          if (newQty === oldQty && newPay === oldPay && (oldSupply || oldPayment || (newQty === 0 && newPay === 0))) {
            continue; 
          }

          const dailyRate = farmRate + c.supplyRate;

          // Manage Supply Transaction
          if (newQty > 0) {
            const amount = newQty * dailyRate;
            if (oldSupply) {
              await db.transactions.update(oldSupply.id!, { quantity: newQty, rate: dailyRate, amount: amount });
            } else {
              await db.transactions.add({
                customerId: c.id!,
                customerName: c.name,
                date: dateObj,
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

          // Manage Payment Transaction
          if (newPay > 0) {
            if (oldPayment) {
              await db.transactions.update(oldPayment.id!, { amount: newPay });
            } else {
              await db.transactions.add({
                customerId: c.id!,
                customerName: c.name,
                date: dateObj,
                type: TransactionType.PAYMENT,
                amount: newPay,
                balanceAfter: 0
              });
            }
          } else if (oldPayment) {
            await db.transactions.delete(oldPayment.id!);
          }

          // RIPPLE: Recalculate everything for this customer from start to finish
          // This ensures any mistake in history is corrected throughout the ledger
          const allCustomerTrans = await db.transactions
            .where('customerId').equals(c.id!)
            .sortBy('date');

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

      // Cloud Sync logic
      const settings = await db.settings.get('global');
      if (settings?.autoSync && settings?.cloudSyncUrl) {
        setSyncing(true);
        try {
          const data = await db.getFullExport();
          await fetch(settings.cloudSyncUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } catch (e) { console.warn("Sync failed"); }
        setSyncing(false);
      }

      setCompleted(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      console.error(err);
      alert("Error saving records.");
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in zoom-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">History Updated!</h2>
        <p className="text-gray-500">{syncing ? "Secure Cloud Backup..." : "Finalizing..."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto page-transition pb-10 px-1">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daily Record Sheet</h1>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-gray-500 font-medium">Date: {formatDate(date)}</p>
            {isNewRecord && !fetching && (
              <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-green-200">NO DATA FOUND</span>
            )}
            {!isNewRecord && !fetching && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-200">EDITING RECORD</span>
            )}
            {fetching && <Loader2 className="animate-spin text-blue-500" size={14} />}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Sheet Date</label>
            <input 
              type="date" 
              className="p-2 border border-gray-200 rounded-xl bg-white shadow-sm outline-none text-sm font-bold"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Base Price</label>
            <div className="flex items-center space-x-1 bg-white p-2 border border-gray-200 rounded-xl shadow-sm">
              <span className="text-gray-400 text-xs font-bold">Rs</span>
              <input 
                type="number" 
                className="outline-none text-sm font-black w-14 bg-transparent"
                value={farmRate}
                onChange={(e) => setFarmRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </header>

      {!isNewRecord && (
        <div className="bg-blue-600 p-3 rounded-xl flex items-center space-x-3 text-white shadow-lg shadow-blue-100 animate-in slide-in-from-top-2">
          <History size={18} />
          <div className="text-xs font-medium">
            <b>Historical Edit:</b> You are modifying a past record. Saving will fix all future balances for these customers.
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
              <tr>
                <th className="px-4 py-4">Customer Name</th>
                <th className="px-4 py-4 text-center">Weight (kg)</th>
                <th className="px-4 py-4 text-center">Cash Rs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/20">
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-800">{c.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                      Bal: {formatPKR(c.currentBalance)} {c.supplyRate > 0 && <span className="text-blue-500 ml-1">Price: {farmRate + c.supplyRate}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className={`w-full p-3 border rounded-xl text-center font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all ${inputs[c.id!]?.qty ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200'}`}
                      value={inputs[c.id!]?.qty || ''}
                      onChange={(e) => handleInputChange(c.id!, 'qty', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      inputMode="numeric"
                      step="1"
                      placeholder="0"
                      className={`w-full p-3 border rounded-xl text-center font-black text-green-700 focus:ring-2 focus:ring-green-500 outline-none transition-all ${inputs[c.id!]?.pay ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                      value={inputs[c.id!]?.pay || ''}
                      onChange={(e) => handleInputChange(c.id!, 'pay', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-4">
        <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase bg-gray-100 px-3 py-1.5 rounded-full">
           <RotateCcw size={10} className="mr-1" /> Ledger Ripple Sync Active
        </div>
        <button
          onClick={handleSave}
          disabled={loading || customers.length === 0}
          className="w-full sm:w-auto bg-blue-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {loading ? (
            <Loader2 className="animate-spin h-6 w-6" />
          ) : (
            <>
              <Save size={20} />
              <span>{isNewRecord ? 'SAVE NEW RECORD' : 'UPDATE & FIX HISTORY'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DailyRecord;
