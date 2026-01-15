
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Customer, Transaction, TransactionType, PaymentMethod } from '../types';
import { formatPKR, formatInputDate } from '../utils/formatters';
import { Search, Wallet, Calendar, Banknote, CheckCircle2, FileText } from 'lucide-react';

interface AddPaymentProps { onSuccess: () => void; }

const AddPayment: React.FC<AddPaymentProps> = ({ onSuccess }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: formatInputDate(new Date()),
    amount: 0,
    method: PaymentMethod.CASH,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const init = async () => {
      const custs = await db.customers.toArray();
      setCustomers(custs);
    };
    init();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || formData.amount <= 0) return;

    setLoading(true);
    const dateObj = new Date(formData.date);
    
    // Balance decreases when customer pays
    const balanceAfter = selectedCustomer.currentBalance - formData.amount;

    const transaction: Transaction = {
      customerId: selectedCustomer.id!,
      customerName: selectedCustomer.name,
      date: dateObj,
      type: TransactionType.PAYMENT,
      amount: formData.amount,
      paymentMethod: formData.method,
      notes: formData.notes,
      balanceAfter: balanceAfter
    };

    // Fix: Accessing transaction on db instance which is now correctly recognized as a Dexie instance
    await db.transaction('rw', [db.transactions, db.customers], async () => {
      await db.transactions.add(transaction);
      await db.customers.update(selectedCustomer.id!, {
        currentBalance: balanceAfter,
        totalPaid: selectedCustomer.totalPaid + formData.amount
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
        <h2 className="text-2xl font-bold text-gray-800">Payment Received!</h2>
        <p className="text-gray-500">Updating ledger...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">Record Payment</h1>
        <p className="text-gray-500">Collect payment from customer</p>
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
                  <div className="text-right">
                    <span className={`text-xs font-bold ${c.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      Due: {formatPKR(c.currentBalance)}
                    </span>
                  </div>
                </button>
              )) : (
                <div className="p-4 text-center text-gray-400 italic">No customers found</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Amount */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Banknote size={16} className="mr-1.5" /> Amount (PKR) *
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.amount || ''}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
            />
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="mr-1.5" /> Payment Date *
            </label>
            <input
              required
              type="date"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={formData.method}
              onChange={(e) => setFormData({...formData, method: e.target.value as PaymentMethod})}
            >
              <option value={PaymentMethod.CASH}>Cash</option>
              <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
              <option value={PaymentMethod.CHEQUE}>Cheque</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <FileText size={16} className="mr-1.5" /> Notes (Optional)
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder="Add memo..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>

        {selectedCustomer && formData.amount > 0 && (
          <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm text-green-700">New Outstanding Balance</p>
                <p className="text-xs text-green-600 italic">
                  ({formatPKR(selectedCustomer.currentBalance)} - {formatPKR(formData.amount)})
                </p>
              </div>
              <p className="text-2xl font-black text-green-600">
                {formatPKR(selectedCustomer.currentBalance - formData.amount)}
              </p>
            </div>
          </div>
        )}

        <button
          disabled={!selectedCustomer || formData.amount <= 0 || loading}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-2 ${
            !selectedCustomer || formData.amount <= 0 || loading 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <>
              <Wallet size={22} />
              <span>Register Payment</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddPayment;
