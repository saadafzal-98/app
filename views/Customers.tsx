
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Customer } from '../types';
import { formatPKR, validatePhone } from '../utils/formatters';
import { Search, UserPlus, Phone, Edit2, ChevronRight, X, User, Loader2 } from 'lucide-react';

interface CustomersProps {
  onCustomerSelect: (id: number) => void;
}

const Customers: React.FC<CustomersProps> = ({ onCustomerSelect }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Use strings for input values to prevent leading zero "041" issues
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    supplyRate: '', 
    openingBalance: ''
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

  const handleOpenAdd = async () => {
    const settings = await db.settings.get('global');
    setFormData({
      name: '',
      phone: '',
      supplyRate: (settings?.defaultSupplyRate ?? 10).toString(),
      openingBalance: '0'
    });
    setErrors({});
    setShowModal('add');
  };

  const validate = async (isEdit: boolean) => {
    const newErrors: Record<string, string> = {};
    if (formData.name.trim().length < 2) newErrors.name = "Name must be 2-50 characters";
    if (!validatePhone(formData.phone)) newErrors.phone = "Invalid format: 03XXXXXXXXX";
    
    const existing = await db.customers.where('phone').equals(formData.phone.trim()).first();
    if (existing && (!isEdit || existing.id !== editingCustomer?.id)) {
      newErrors.phone = "Phone number already exists";
    }

    const rate = parseFloat(formData.supplyRate) || 0;
    if (rate < 0) newErrors.supplyRate = "Cannot be negative";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = showModal === 'edit';
    if (await validate(isEdit)) {
      if (isEdit && editingCustomer?.id) {
        await db.customers.update(editingCustomer.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          supplyRate: parseFloat(formData.supplyRate) || 0,
        });
      } else {
        const rate = parseFloat(formData.supplyRate) || 0;
        const balance = parseFloat(formData.openingBalance) || 0;
        const newCustomer: Customer = {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          supplyRate: rate,
          openingBalance: balance,
          currentBalance: balance,
          totalSupplied: 0,
          totalPaid: 0,
          createdAt: new Date()
        };
        await db.customers.add(newCustomer);
      }
      setShowModal(null);
      setEditingCustomer(null);
      loadCustomers();
    }
  };

  const openEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      supplyRate: customer.supplyRate.toString(),
      openingBalance: customer.openingBalance.toString()
    });
    setErrors({});
    setShowModal('edit');
  };

  const handleNumericInput = (field: 'supplyRate' | 'openingBalance', value: string) => {
    // Sanitize: allow only numbers and one decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    // Remove leading zeros but keep 0 if it's the only character
    const noLeadingZeros = sanitized.replace(/^0+(?=\d)/, '');
    setFormData({ ...formData, [field]: noLeadingZeros });
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 page-transition">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Entity Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{customers.length} Registered Routes</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all font-bold shadow-lg"
        >
          <UserPlus size={18} />
          <span className="uppercase tracking-widest text-xs">New Customer</span>
        </button>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Filter by name or phone identifier..."
          className="block w-full pl-12 pr-4 py-4 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div 
            key={customer.id}
            onClick={() => customer.id && onCustomerSelect(customer.id)}
            className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                 <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center font-black text-slate-400 group-hover:text-emerald-500 transition-colors">
                    {customer.name.charAt(0)}
                 </div>
                 <div>
                    <h3 className="font-black text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{customer.name}</h3>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center mt-1 uppercase tracking-wider">
                      <Phone size={12} className="mr-1.5" /> {customer.phone}
                    </p>
                 </div>
              </div>
              <button 
                onClick={(e) => openEdit(customer, e)}
                className="p-2 text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
              >
                <Edit2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Supply Margin</p>
                  <p className="text-xs font-black text-slate-900 dark:text-slate-300">+ Rs {customer.supplyRate}</p>
               </div>
               <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Net Standing</p>
                  <p className={`font-black text-sm ${customer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatPKR(customer.currentBalance)}
                  </p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md overflow-hidden animate-in zoom-in duration-300 shadow-2xl border border-white/10">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center tracking-tight">
                  {showModal === 'edit' ? <Edit2 size={22} className="mr-3 text-emerald-600"/> : <UserPlus size={22} className="mr-3 text-emerald-600"/>}
                  {showModal === 'edit' ? 'Update Profile' : 'Entity Entry'}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                   {showModal === 'edit' ? 'Modifying existing records' : 'New ledger initialization'}
                </p>
              </div>
              <button onClick={() => setShowModal(null)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer Identity</label>
                <input
                  required
                  type="text"
                  className={`w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl outline-none font-bold text-sm dark:text-white focus:border-emerald-500 transition-all ${errors.name ? 'border-rose-500' : 'border-slate-100 dark:border-slate-800'}`}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Full Legal Name"
                />
                {errors.name && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest px-1">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Primary Phone</label>
                <input
                  required
                  type="tel"
                  className={`w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-2xl outline-none font-bold text-sm dark:text-white focus:border-emerald-500 transition-all ${errors.phone ? 'border-rose-500' : 'border-slate-100 dark:border-slate-800'}`}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="03XXXXXXXXX"
                />
                {errors.phone && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest px-1">{errors.phone}</p>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Supply Add-on</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">+</span>
                     <input
                        required
                        type="text"
                        inputMode="decimal"
                        className="w-full pl-8 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-black text-sm dark:text-white focus:border-emerald-500 transition-all"
                        value={formData.supplyRate}
                        onChange={(e) => handleNumericInput('supplyRate', e.target.value)}
                      />
                  </div>
                </div>
                {showModal === 'add' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Opening Bal</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-black text-sm dark:text-white focus:border-emerald-500 transition-all"
                      value={formData.openingBalance}
                      onChange={(e) => handleNumericInput('openingBalance', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
              >
                {showModal === 'edit' ? 'Update Ledger' : 'Confirm Registration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
