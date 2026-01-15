
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Customer, Transaction, TransactionType } from '../types';
import { formatPKR, formatInputDate } from '../utils/formatters';
import { Search, Droplets, Calendar, Weight, DollarSign, CheckCircle2 } from 'lucide-react';

interface AddSupplyProps {
  onSuccess: () => void;
}

const AddSupply: React.FC<AddSupplyProps> = ({ onSuccess }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [farmRate, setFarmRate] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: formatInputDate(new Date()),
    quantity: 0
  });

  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const init = async () => {
      const custs = await db.customers.toArray();
      const settings = await db.settings.get('global');
      setCustomers(custs);
      if (settings) setFarmRate(settings.farmRate);
    };
    init();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const dailyRate = selectedCustomer ? (farmRate + selectedCustomer.supplyRate) : 0;
  const dailyAmount = formData.quantity * dailyRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || formData.quantity <= 0) return;

    setLoading(true);
    const dateObj = new Date(formData.date);
    
    const balanceAfter = selectedCustomer.currentBalance + dailyAmount;

    const transaction: Transaction = {
      customerId: selectedCustomer.id!,
      customerName: selectedCustomer.name,
      date: dateObj,
      type: TransactionType.SUPPLY,
      quantity: formData.quantity,
      rate: dailyRate,
      amount: dailyAmount,
      balanceAfter: balanceAfter
    };

    // Fix: Accessing transaction on db instance which is now correctly recognized as a Dexie instance
    await db.transaction('rw', [db.transactions, db.customers], async () => {
      await db.transactions.add(transaction);
      await db.customers.update(selectedCustomer.id!, {
        currentBalance: balanceAfter,
        totalSupplied: selectedCustomer.totalSupplied + formData.quantity,
        lastSupplyDate: dateObj
      });
    });

    setLoading(false);
    setCompleted(true);
    setTimeout(() => {
      onSuccess();
    }, 1500);
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in zoom-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Supply Added!</h2>
        <p className="text-gray-500">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Daily Supply Entry</h1>
        <p className="text-gray-500">Record milk/produce delivery</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        {/* Customer Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : searchTerm}
              onFocus={() => {
                if (selectedCustomer) {
                  setSearchTerm('');
                  setSelectedCustomer(null);
                }
                setIsDropdownOpen(true);
              }}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
            />
          </div>

          {isDropdownOpen && !selectedCustomer && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center transition-colors"
                  onClick={() => {
                    setSelectedCustomer(c);
                    setIsDropdownOpen(false);
                  }}
                >
                  <div>
                    <span className="font-semibold text-gray-800">{c.name}</span>
                    <span className="block text-xs text-gray-500">{c.phone}</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600">Rate: +{c.supplyRate}</span>
                </button>
              )) : (
                <div className="p-4 text-center text-gray-400 italic">No customers found</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Date */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="mr-1.5" /> Date *
            </label>
            <input
              required
              type="date"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Weight size={16} className="mr-1.5" /> Quantity (kg) *
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.1"
              max="999.99"
              placeholder="0.00"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
            />
          </div>
        </div>

        {/* Calculation Summary */}
        {selectedCustomer && (
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 animate-in slide-in-from-bottom-2 duration-300">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center">
              <DollarSign size={18} className="mr-1" /> Calculation Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Base Farm Rate:</span>
                <span className="font-medium">{formatPKR(farmRate)}/kg</span>
              </div>
              <div className="flex justify-between text-sm text-blue-700">
                <span>Customer Add-on:</span>
                <span className="font-medium">+{formatPKR(selectedCustomer.supplyRate)}/kg</span>
              </div>
              <div className="border-t border-blue-200 pt-3 flex justify-between">
                <span className="font-bold text-blue-900">Final Daily Rate:</span>
                <span className="font-bold text-blue-900">{formatPKR(dailyRate)}/kg</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm text-blue-700">Daily Total ({formData.quantity} kg):</span>
                <span className="text-2xl font-black text-blue-600">{formatPKR(dailyAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          disabled={!selectedCustomer || formData.quantity <= 0 || loading}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-2 ${
            !selectedCustomer || formData.quantity <= 0 || loading 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <>
              <Droplets size={22} />
              <span>Confirm Supply Entry</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddSupply;
