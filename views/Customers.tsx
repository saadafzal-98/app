
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Customer } from '../types';
import { formatPKR, validatePhone } from '../utils/formatters';
import { Search, UserPlus, Phone, Edit2, ChevronRight, X, User } from 'lucide-react';

interface CustomersProps {
  onCustomerSelect: (id: number) => void;
}

const Customers: React.FC<CustomersProps> = ({ onCustomerSelect }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    supplyRate: 0, // Hardcoded default
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = showModal === 'edit';
    if (await validate(isEdit)) {
      if (isEdit && editingCustomer?.id) {
        await db.customers.update(editingCustomer.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          supplyRate: Number(formData.supplyRate),
        });
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
      loadCustomers();
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-gray-500">{customers.length} total profiles</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: '', phone: '', supplyRate: 0, openingBalance: 0 });
            setShowModal('add');
          }}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <UserPlus size={18} />
          <span>New Customer</span>
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search name or phone..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => (
          <div 
            key={customer.id}
            onClick={() => customer.id && onCustomerSelect(customer.id)}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{customer.name}</h3>
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <Phone size={14} className="mr-1.5" /> {customer.phone}
                </p>
              </div>
              <button 
                onClick={(e) => openEdit(customer, e)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-400 uppercase font-medium">Balance</span>
              <span className={`font-bold ${customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPKR(customer.currentBalance)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-400">No customers found</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold flex items-center">
                {showModal === 'edit' ? <Edit2 size={18} className="mr-2 text-blue-600"/> : <UserPlus size={18} className="mr-2 text-blue-600"/>}
                {showModal === 'edit' ? 'Edit Customer' : 'Register Customer'}
              </h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  required
                  type="text"
                  className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (11 Digits) *</label>
                <input
                  required
                  type="tel"
                  className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.phone ? 'border-red-500' : 'border-gray-200'}`}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="03XXXXXXXXX"
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supply Rate (PKR) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.supplyRate ? 'border-red-500' : 'border-gray-200'}`}
                    value={formData.supplyRate}
                    onChange={(e) => setFormData({...formData, supplyRate: parseFloat(e.target.value) || 0})}
                  />
                  {errors.supplyRate && <p className="text-xs text-red-500 mt-1">{errors.supplyRate}</p>}
                </div>
                {showModal === 'add' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opening Bal (PKR)</label>
                    <input
                      type="number"
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.openingBalance || ''}
                      onChange={(e) => setFormData({...formData, openingBalance: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                )}
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors mt-4 shadow-md active:scale-[0.98]"
              >
                {showModal === 'edit' ? 'Update Details' : 'Register Customer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
