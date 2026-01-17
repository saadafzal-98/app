
export enum TransactionType {
  SUPPLY = 'SUPPLY',
  PAYMENT = 'PAYMENT'
}

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  CHEQUE = 'Cheque'
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  supplyRate: number; // PKR per kg added to Farm Rate
  openingBalance: number;
  currentBalance: number;
  totalSupplied: number;
  totalPaid: number;
  lastSupplyDate?: Date;
  createdAt: Date;
}

export interface Transaction {
  id?: number;
  customerId: number;
  customerName: string;
  date: Date;
  type: TransactionType;
  quantity?: number; // for Supply
  rate?: number; // (Farm Rate + Customer Supply Rate)
  amount: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  balanceAfter: number;
}

export interface AppSettings {
  id: string;
  farmRate: number;
  lastBackup?: Date;
}
