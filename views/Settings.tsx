
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { 
  Download, 
  Upload, 
  Trash2, 
  Database, 
  Cloud, 
  Moon, 
  Sun,
  ShieldCheck,
  Zap,
  Info,
  Key,
  Fingerprint,
  RefreshCw,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onSecurityUpdate: () => void;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, setDarkMode, onSecurityUpdate }) => {
  const [syncUrl, setSyncUrl] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [pin, setPin] = useState('');
  const [lockActive, setLockActive] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    db.settings.get('global').then(s => {
      if (s) {
        setSyncUrl(s.cloudSyncUrl || '');
        setAutoSync(s.autoSync || false);
        setPin(s.passcode || '');
        setLockActive(s.isLockActive || false);
        setBiometric(s.biometricEnabled || false);
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
    // Simulate data sync logic
    await db.settings.update('global', { cloudSyncUrl: syncUrl, autoSync });
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSyncing(false);
    setStatus({ type: 'success', msg: 'Data packets synchronized successfully!' });
    setTimeout(() => setStatus(null), 3000);
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
        if (window.confirm("CRITICAL: Replace current data with backup?")) {
          await (db as any).transaction('rw', [db.customers, db.transactions, db.settings], async () => {
            await db.customers.clear(); await db.transactions.clear(); await db.settings.clear();
            if (data.customers?.length) await db.customers.bulkAdd(data.customers);
            if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
            if (data.settings?.length) await db.settings.bulkAdd(data.settings);
          });
          window.location.reload();
        }
      } catch (err) { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 page-transition pb-20 px-1">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Management Console</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Infrastructure & Privacy Control</p>
        </div>
        {status && (
          <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">{status.msg}</span>
          </div>
        )}
      </header>

      {/* Interface Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
         <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
               <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  {darkMode ? <Moon size={22} /> : <Sun size={22} />}
               </div>
               <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Interface</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase">Dark mode toggle</p>
               </div>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`relative w-16 h-8 rounded-full transition-colors border-2 ${darkMode ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-200 border-slate-100'}`}>
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform transform ${darkMode ? 'translate-x-8' : ''}`} />
            </button>
         </div>
      </section>

      {/* Cloud Sync Section - RESTORED */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Cloud size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Cloud Synchronization</h2>
              <p className="text-xs font-bold text-slate-400 uppercase">Remote Data Persistence</p>
            </div>
          </div>
          <button 
            disabled={syncing}
            onClick={handleCloudSync}
            className={`p-3 rounded-2xl transition-all ${syncing ? 'bg-slate-100 dark:bg-slate-700' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:scale-105 active:scale-95'}`}
          >
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw size={20} />}
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sync Endpoint URL</label>
            <input 
              type="text" 
              placeholder="https://your-api.com/sync"
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm dark:text-white focus:border-blue-400 transition-colors"
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
            <div className="flex items-center space-x-2">
               <Zap size={14} className="text-amber-500" />
               <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Auto-Sync on Entry</span>
            </div>
            <button onClick={() => setAutoSync(!autoSync)} className={`w-12 h-6 rounded-full transition-colors ${autoSync ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${autoSync ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Security Section - BIOMETRIC & PIN */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Security Vault</h2>
              <p className="text-xs font-bold text-slate-400 uppercase">Access Protection</p>
            </div>
          </div>
          <button 
            onClick={handleSaveSecurity}
            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            Update Security
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Key size={18} className="text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Activate PIN Lock</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Requires PIN on launch</p>
              </div>
            </div>
            <button onClick={() => setLockActive(!lockActive)} className={`w-12 h-6 rounded-full transition-colors ${lockActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${lockActive ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {lockActive && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex flex-col space-y-2 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4-Digit Access PIN</label>
              <input 
                type="password" 
                maxLength={4}
                inputMode="numeric"
                placeholder="****"
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-center text-2xl tracking-[1em] font-black focus:border-emerald-500 outline-none dark:text-white"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-6">
            <div className="flex items-center space-x-3">
              <Fingerprint size={18} className="text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Enable Biometric Login</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Native FaceID / Fingerprint</p>
              </div>
            </div>
            <button onClick={() => setBiometric(!biometric)} className={`w-12 h-6 rounded-full transition-colors ${biometric ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${biometric ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Data Lifecycle Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Database size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Backup Engine</h2>
            <p className="text-xs font-bold text-slate-400 uppercase">Infrastructure Control</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button onClick={exportData} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all text-slate-500 dark:text-slate-400 group">
            <Download size={32} className="mb-3 group-hover:text-emerald-500" />
            <span className="font-black uppercase tracking-widest text-[10px] group-hover:text-slate-900 dark:group-hover:text-white">Export Backup</span>
          </button>
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-slate-500 dark:text-slate-400 group cursor-pointer">
            <Upload size={32} className="mb-3 group-hover:text-indigo-500" />
            <span className="font-black uppercase tracking-widest text-[10px] group-hover:text-slate-900 dark:group-hover:text-white">Restore Backup</span>
            <input type="file" className="hidden" accept=".json" onChange={importData} />
          </label>
        </div>
        
        <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-700 text-center">
           <button onClick={async () => { if (window.confirm("ERASE ALL DATA?")) { await (db as any).delete(); window.location.reload(); } }} className="px-6 py-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest">
             Destroy Local Database
           </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
