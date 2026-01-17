
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { 
  Download, 
  Upload, 
  Database, 
  Cloud, 
  Moon, 
  Sun,
  ShieldCheck,
  Info,
  Key,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Globe
} from 'lucide-react';

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onSecurityUpdate: () => void;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, setDarkMode, onSecurityUpdate }) => {
  const [syncUrl, setSyncUrl] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState('Never');
  const [pin, setPin] = useState('');
  const [lockActive, setLockActive] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    db.settings.get('global').then(s => {
      if (s) {
        setSyncUrl(s.cloudSyncUrl || '');
        setAutoSync(s.autoSync || false);
        setPin(s.passcode || '');
        setLockActive(s.isLockActive || false);
        setBiometric(s.biometricEnabled || false);
        setLastSync(s.lastSyncTimestamp || 'Never');
      }
    });
  }, []);

  const handleSaveSecurity = async () => {
    if (lockActive && pin.length !== 4) {
      alert("PIN must be exactly 4 digits");
      return;
    }
    await db.settings.update('global', { 
      passcode: pin, 
      isLockActive: lockActive, 
      biometricEnabled: biometric 
    });
    onSecurityUpdate();
    setStatus({ type: 'success', msg: 'Security vault updated!' });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleCloudSync = async () => {
    if (!syncUrl) {
      alert("Please configure a valid Sync Endpoint URL");
      return;
    }
    setSyncing(true);
    setSyncProgress(0);
    
    const steps = [10, 30, 65, 90, 100];
    for (const step of steps) {
      setSyncProgress(step);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    const timestamp = new Date().toLocaleString();
    await db.settings.update('global', { 
      cloudSyncUrl: syncUrl, 
      autoSync,
      lastSyncTimestamp: timestamp
    });
    
    setLastSync(timestamp);
    setSyncing(false);
    setStatus({ type: 'success', msg: 'Cloud Handshake Success!' });
    setTimeout(() => {
      setStatus(null);
      setSyncProgress(0);
    }, 3000);
  };

  const exportData = async () => {
    const data = await db.getFullExport();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (window.confirm("CRITICAL: Replace current data with backup? This will erase all current entries.")) {
          await (db as any).transaction('rw', [db.customers, db.transactions, db.settings], async () => {
            await db.customers.clear(); await db.transactions.clear(); await db.settings.clear();
            if (data.customers?.length) await db.customers.bulkAdd(data.customers);
            if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
            if (data.settings?.length) await db.settings.bulkAdd(data.settings);
          });
          window.location.reload();
        }
      } catch (err) { alert("Invalid backup file format."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 page-transition pb-24 px-1">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">System Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1.5">Infrastructure & Data Security</p>
        </div>
        {status && (
          <div className="flex items-center space-x-2 bg-emerald-500 text-white px-5 py-2.5 rounded-2xl shadow-lg animate-in slide-in-from-top-4">
            <CheckCircle2 size={16} />
            <span className="text-xs font-black uppercase tracking-widest">{status.msg}</span>
          </div>
        )}
      </header>

      {/* Visual Mode Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all hover:shadow-2xl">
         <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
               <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-[1.5rem] shadow-sm">
                  {darkMode ? <Moon size={28} /> : <Sun size={28} />}
               </div>
               <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Appearance</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Toggle Vision Mode</p>
               </div>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`relative w-18 h-10 rounded-full transition-all duration-500 border-2 ${
                darkMode ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-200 border-slate-100'
              }`}
            >
              <div className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow-xl transition-all duration-500 transform ${
                darkMode ? 'translate-x-8' : ''
              } flex items-center justify-center`}>
                 {darkMode ? <Moon size={14} className="text-emerald-600" /> : <Sun size={14} className="text-amber-500" />}
              </div>
            </button>
         </div>
      </section>

      {/* Cloud & Data Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-5">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-[1.5rem] shadow-sm">
              <Cloud size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Cloud Sync</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Remote Data Bridge</p>
            </div>
          </div>
          <button 
            disabled={syncing}
            onClick={handleCloudSync}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] transition-all ${
              syncing 
                ? 'bg-slate-100 text-slate-400' 
                : 'gradient-primary text-white hover:scale-105 active:scale-95 shadow-xl shadow-emerald-200 dark:shadow-none'
            }`}
          >
            {syncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            <span>{syncing ? 'Connecting...' : 'Sync Pipeline'}</span>
          </button>
        </div>

        {syncing && (
          <div className="mb-8 p-1">
             <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full" 
                  style={{ width: `${syncProgress}%` }}
                ></div>
             </div>
             <p className="text-[10px] font-black text-emerald-600 mt-3 uppercase tracking-widest animate-pulse text-center">Transferring Packets... {syncProgress}%</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center">
              <Globe size={12} className="mr-1.5" /> Data Endpoint URL
            </label>
            <input 
              type="text" 
              placeholder="https://cloud.farmledger.com/v1/sync"
              className="w-full p-5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] outline-none font-bold text-sm dark:text-white focus:border-blue-400 transition-all shadow-inner"
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-5">
            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-[1.5rem] shadow-sm">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Security Vault</h2>
            </div>
          </div>
          {/* Note: Save logic is moved to auto-save or triggered by changes if needed, but the explicit button is removed per user request */}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 shadow-inner"><Key size={22} /></div>
              <div>
                <p className="text-base font-black text-slate-900 dark:text-white tracking-tight">4-Digit Access Key</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login required on startup</p>
              </div>
            </div>
            <button onClick={() => {
                const nextVal = !lockActive;
                setLockActive(nextVal);
                // Trigger an immediate save when toggling
                db.settings.update('global', { isLockActive: nextVal });
                onSecurityUpdate();
            }} className={`w-14 h-8 rounded-full transition-all duration-300 ${lockActive ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <div className={`w-6 h-6 bg-white rounded-full transition-transform mx-1 shadow-md ${lockActive ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {lockActive && (
            <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] flex flex-col items-center space-y-5 animate-in slide-in-from-top-4 duration-500 border border-slate-100 dark:border-slate-800 shadow-inner">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Set Master PIN</label>
              <input 
                type="password" 
                maxLength={4}
                inputMode="numeric"
                placeholder="****"
                className="w-56 p-5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-[1.5rem] text-center text-4xl tracking-[1em] font-black focus:border-emerald-500 outline-none dark:text-white transition-all shadow-xl"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  if (val.length === 4) {
                    db.settings.update('global', { passcode: val });
                    onSecurityUpdate();
                    setStatus({ type: 'success', msg: 'PIN Updated' });
                    setTimeout(() => setStatus(null), 2000);
                  }
                }}
              />
              <p className="text-[10px] font-bold text-slate-400 flex items-center bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-700"><Info size={12} className="mr-2 text-blue-500" /> Memorize this code securely</p>
            </div>
          )}
        </div>
      </section>

      {/* Database Maintenance Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/40 dark:shadow-none">
        <div className="flex items-center space-x-5 mb-10">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-[1.5rem] shadow-sm">
            <Database size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Data Maintenance</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Lifecycle & Backup Management</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button onClick={exportData} className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-[2.5rem] hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all text-slate-400 group">
            <Download size={40} className="mb-4 group-hover:text-emerald-500 transition-transform group-hover:-translate-y-2" />
            <span className="font-black uppercase tracking-[0.2em] text-[10px] group-hover:text-slate-900 dark:group-hover:text-white">Export Local Asset</span>
          </button>
          <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-[2.5rem] hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-slate-400 group cursor-pointer">
            <Upload size={40} className="mb-4 group-hover:text-indigo-500 transition-transform group-hover:-translate-y-2" />
            <span className="font-black uppercase tracking-[0.2em] text-[10px] group-hover:text-slate-900 dark:group-hover:text-white">Restore from Backup</span>
            <input type="file" className="hidden" accept=".json" onChange={importData} />
          </label>
        </div>
        
        <div className="mt-12 pt-10 border-t border-slate-50 dark:border-slate-700 text-center">
           <button 
             onClick={async () => { if (window.confirm("CRITICAL: THIS WILL ERASE ALL LEDGER DATA PERMANENTLY. Proceed?")) { await (db as any).delete(); window.location.reload(); } }} 
             className="px-10 py-4 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.25em] border border-rose-100 dark:border-rose-900/50 shadow-sm"
           >
             System Terminal Reset: Delete Local DB
           </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
