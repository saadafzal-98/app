
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Customer, Transaction, TransactionType } from '../types';
import { formatPKR, formatInputDate, formatDate, getStartOfDay } from '../utils/formatters';
import { Calendar, Save, CheckCircle2, Weight, Banknote, Tag, Loader2, RotateCcw, Info, History, PlusCircle, AlertCircle } from 'lucide-react';

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

          // Process only if values changed
          if (newQty === oldQty && newPay === oldPay && (oldSupply || oldPayment || (newQty === 0 && newPay === 0))) {
            continue; 
          }

          const dailyRate = farmRate + c.supplyRate;

          // 1. Supply Management
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

          // 2. Payment Management
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

          // 3. RIPPLE: Complete Ground-Up Recalculation
          const allCustomerTrans = await db.transactions
            .where('customerId').equals(c.id!)
            .toArray();

          // CRITICAL: Sort for calculation (Chronological + Supply-First logic)
          allCustomerTrans.sort((a, b) => {
            const dateDiff = a.date.getTime() - b.date.getTime();
            if (dateDiff !== 0) return dateDiff;
            
            // Supply happens first logically (adds to debt), Payment happens second (clears debt)
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
            // Fix the history row
            await db.transactions.update(t.id!, { balanceAfter: runningBalance });
          }

          // Sync the customer's master record
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
      alert("System sync error. Please try again.");
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
        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Ledger Synchronized!</h2>
        <p className="text-gray-500 font-medium">History recalculated from ground up.</p>
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
              <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-green-200 uppercase">New Day</span>
            )}
            {!isNewRecord && !fetching && (
              <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-orange-200 uppercase">Updating History</span>
            )}
            {fetching && <Loader2 className="animate-spin text-blue-500" size={14} />}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Sheet Date</label>
            <input 
              type="date" 
              className="p-2 border border-gray-200 rounded-xl bg-white shadow-sm outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Base Price</label>
            <div className="flex items-center space-x-1 bg-white p-2 border border-gray-200 rounded-xl shadow-sm">
              <span className="text-gray-400 text-xs font-black">Rs</span>
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
        <div className="bg-orange-600 p-4 rounded-xl flex items-center space-x-3 text-white shadow-lg shadow-orange-100 animate-in slide-in-from-top-2">
          <History size={20} />
          <div className="text-xs font-medium leading-relaxed">
            <b>Absolute Ripple Enabled:</b> You are editing historical data. Saving will force a re-calculation of the balance chain from this date forward to today.
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-4 py-4">Customer Name</th>
                <th className="px-4 py-4 text-center">Weight (kg)</th>
                <th className="px-4 py-4 text-center">Cash Rs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-800">{c.name}</div>
                    <div className="text-[10px] text-gray-400 font-black uppercase mt-0.5">
                      Debt: {formatPKR(c.currentBalance)} {c.supplyRate > 0 && <span className="text-blue-500 ml-1">Price: {farmRate + c.supplyRate}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className={`w-full p-3 border rounded-xl text-center font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all ${inputs[c.id!]?.qty ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-gray-200 bg-gray-50/30'}`}
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
                      className={`w-full p-3 border rounded-xl text-center font-black text-green-700 focus:ring-2 focus:ring-green-500 outline-none transition-all ${inputs[c.id!]?.pay ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50/30'}`}
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
        <div className="flex items-center text-[10px] text-gray-400 font-black uppercase bg-gray-100 px-3 py-1.5 rounded-full tracking-widest">
           <RotateCcw size={10} className="mr-1" /> Verified Ripple Mode
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
              <span>{isNewRecord ? 'SAVE NEW RECORD' : 'RE-CALCULATE BALANCES'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DailyRecord;
