
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { Customer, Transaction, AppSettings } from './types';

export interface ExtendedSettings extends AppSettings {
  cloudSyncUrl?: string;
  autoSync?: boolean;
  passcode?: string;
  isLockActive?: boolean;
  biometricEnabled?: boolean;
}

export class FarmLedgerDB extends Dexie {
  customers!: Table<Customer>;
  transactions!: Table<Transaction>;
  settings!: Table<ExtendedSettings>;

  constructor() {
    super('FarmLedgerDB');
    (this as any).version(1).stores({
      customers: '++id, &phone, name',
      transactions: '++id, customerId, date, type',
      settings: 'id'
    });
  }

  async getFullExport() {
    const customers = await this.customers.toArray();
    const transactions = await this.transactions.toArray();
    const settings = await this.settings.toArray();
    return {
      customers,
      transactions,
      settings,
      timestamp: new Date().toISOString()
    };
  }
}

export const db = new FarmLedgerDB();

export async function initSettings() {
  const existing = await db.settings.get('global');
  if (!existing) {
    await db.settings.add({ 
      id: 'global', 
      farmRate: 150, 
      autoSync: false,
      isLockActive: false,
      biometricEnabled: false,
      passcode: ''
    });
  }
}
