
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Customer, TransactionType } from '../types';
import { formatPKR, validatePhone } from '../utils/formatters';
import { Search, UserPlus, Phone, Edit2, X, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface CustomersProps {
  onCustomerSelect: (id: number) => void;
}

const Customers: React.FC<CustomersProps> = ({ onCustomerSelect }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    supplyRate: 0, 
    openingBalance: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const all = await db.customers.toArray();
    setCustomers(all);
    setLoading(false);
  };

  const validate = async (isEdit: boolean) => {
    const newErrors: Record<string, string> = {};
    if (formData.name.trim().length < 2) newErrors.name = "Name must be 2-50 characters";
    if (!validatePhone(formData.phone)) newErrors.phone = "Invalid format: 03XXXXXXXXX (11 digits)";
    
    const existing = await db.customers.where('phone').equals(formData.phone).first();
    if (existing && (!isEdit || existing.id !== editingCustomer?.id)) {
      newErrors.phone = "Phone number already exists";
    }

    if (formData.supplyRate < 0 || formData.supplyRate > 999) newErrors.supplyRate = "Rate must be 0-999";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const recalculateCustomerBalance = async (customerId: number, newOpeningBalance: number) => {
    await (db as any).transaction('rw', [db.transactions, db.customers], async () => {
      // Get all transactions for this customer sorted by date
      const transactions = await db.transactions
        .where('customerId')
        .equals(customerId)
        .toArray();
      
      // Sort in place to ensure chronological order for balance calculation
      transactions.sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        if (a.type !== b.type) return a.type === TransactionType.SUPPLY ? -1 : 1;
        return (a.id || 0) - (b.id || 0);
      });

      let runningBalance = newOpeningBalance;
      let totalSupplied = 0;
      let totalPaid = 0;

      for (const t of transactions) {
        if (t.type === TransactionType.SUPPLY) {
          runningBalance += t.amount;
          totalSupplied += (t.quantity || 0);
        } else {
          runningBalance -= t.amount;
          totalPaid += t.amount;
        }
        // Update the cached balanceAfter in the transaction record
        await db.transactions.update(t.id!, { balanceAfter: runningBalance });
      }

      // Final update to customer record
      await db.customers.update(customerId, {
        openingBalance: newOpeningBalance,
        currentBalance: runningBalance,
        totalSupplied,
        totalPaid
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = showModal === 'edit';
    if (await validate(isEdit)) {
      setProcessing(true);
      try {
        if (isEdit && editingCustomer?.id) {
          const oldOpening = editingCustomer.openingBalance;
          const newOpening = Number(formData.openingBalance);
          
          // Update basic details
          await db.customers.update(editingCustomer.id, {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            supplyRate: Number(formData.supplyRate),
          });

          // If opening balance changed, we must recalculate the entire chain
          if (oldOpening !== newOpening) {
            await recalculateCustomerBalance(editingCustomer.id, newOpening);
          }
        } else {
          const newCustomer: Customer = {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            supplyRate: Number(formData.supplyRate),
            openingBalance: Number(formData.openingBalance),
            currentBalance: Number(formData.openingBalance),
            totalSupplied: 0,
            totalPaid: 0,
            createdAt: new Date()
          };
          await db.customers.add(newCustomer);
        }
        setShowModal(null);
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', supplyRate: 0, openingBalance: 0 });
        await loadCustomers();
      } catch (err) {
        console.error(err);
        alert("Error saving customer data.");
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Permanently delete this customer and all their records? This cannot be undone.")) {
      setProcessing(true);
      try {
        await (db as any).transaction('rw', [db.customers, db.transactions], async () => {
          await db.customers.delete(id);
          await db.transactions.where('customerId').equals(id).delete();
        });
        setShowModal(null);
        setEditingCustomer(null);
        await loadCustomers();
      } catch (err) {
        console.error(err);
        alert("Failed to delete customer.");
      } finally {
        setProcessing(false);
      }
    }
  };

  const openEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      supplyRate: customer.supplyRate,
      openingBalance: customer.openingBalance
    });
    setShowModal('edit');
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 page-transition">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Customer Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{customers.length} total profiles active</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: '', phone: '', supplyRate: 0, openingBalance: 0 });
            setShowModal('add');
          }}
          className="flex items-center justify-center space-x-2 bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all font-bold shadow-lg shadow-emerald-100 dark:shadow-none"
        >
          <UserPlus size={18} />
          <span className="uppercase tracking-widest text-xs">Register New</span>
        </button>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Search identity or phone..."
          className="block w-full pl-12 pr-4 py-4 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div 
            key={customer.id}
            onClick={() => customer.id && onCustomerSelect(customer.id)}
            className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 transition-colors">
                  <span className="text-xl font-black uppercase">{customer.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white leading-tight">{customer.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mt-1">
                    <Phone size={10} className="mr-1" /> {customer.phone}
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => openEdit(customer, e)}
                className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
              >
                <Edit2 size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50 dark:border-slate-700">
               <div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Opening</p>
                 <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{formatPKR(customer.openingBalance)}</p>
               </div>
               <div className="text-right">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Current Balance</p>
                 <p className={`font-black ${customer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                   {formatPKR(customer.currentBalance)}
                 </p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && !loading && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700">
          <div className="opacity-20 flex flex-col items-center">
             <UserPlus size={64} className="mb-4" />
             <p className="text-sm font-black uppercase tracking-[0.2em]">No records found</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                 <div className="p-3 bg-emerald-600 text-white rounded-2xl">
                   {showModal === 'edit' ? <Edit2 size={20}/> : <UserPlus size={20}/>}
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                     {showModal === 'edit' ? 'Update Profile' : 'Registry Entry'}
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Identification System</p>
                 </div>
              </div>
              <button onClick={() => setShowModal(null)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name *</label>
                  <input
                    required
                    disabled={processing}
                    type="text"
                    className={`w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl outline-none font-bold dark:text-white transition-all ${errors.name ? 'border-rose-500' : 'border-transparent focus:border-emerald-500'}`}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter customer name"
                  />
                  {errors.name && <p className="text-[10px] text-rose-500 font-bold ml-1 uppercase">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Link *</label>
                  <input
                    required
                    disabled={processing}
                    type="tel"
                    className={`w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl outline-none font-bold dark:text-white transition-all ${errors.phone ? 'border-rose-500' : 'border-transparent focus:border-emerald-500'}`}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="03XXXXXXXXX"
                  />
                  {errors.phone && <p className="text-[10px] text-rose-500 font-bold ml-1 uppercase">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supply Delta (PKR) *</label>
                  <input
                    required
                    disabled={processing}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl outline-none font-bold dark:text-white transition-all ${errors.supplyRate ? 'border-rose-500' : 'border-transparent focus:border-emerald-500'}`}
                    value={formData.supplyRate === 0 ? '' : formData.supplyRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({...formData, supplyRate: isNaN(val) || val < 0 ? 0 : val});
                    }}
                    placeholder="0.00"
                  />
                  {errors.supplyRate && <p className="text-[10px] text-rose-500 font-bold ml-1 uppercase">{errors.supplyRate}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Balance (PKR)</label>
                  <input
                    disabled={processing}
                    type="number"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold dark:text-white transition-all"
                    value={formData.openingBalance === 0 ? '' : formData.openingBalance}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFormData({...formData, openingBalance: isNaN(val) ? 0 : val});
                    }}
                    placeholder="Initial debt/credit"
                  />
                </div>
              </div>

              {showModal === 'edit' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl flex items-start space-x-3">
                   <AlertCircle className="text-amber-600 shrink-0" size={18} />
                   <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase leading-relaxed tracking-wider">
                     Warning: Changing the Opening Balance will trigger a full re-calculation of the entire ledger history for this customer.
                   </p>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <button 
                  type="submit"
                  disabled={processing}
                  className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin" /> : <span>{showModal === 'edit' ? 'Commit Updates' : 'Authorize Registration'}</span>}
                </button>
                
                {showModal === 'edit' && editingCustomer?.id && (
                  <button 
                    type="button"
                    disabled={processing}
                    onClick={() => handleDelete(editingCustomer.id!)}
                    className="w-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-rose-100 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Trash2 size={14} />
                    <span>Terminate Record</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
