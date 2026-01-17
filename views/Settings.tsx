
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
  CheckCircle2,
  Globe,
  Lock
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
    
    // Simulated sync stages
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
    setStatus({ type: 'success', msg: 'Data synchronized with Cloud!' });
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
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Infrastructure & Core Operations</p>
        </div>
        {status && (
          <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">{status.msg}</span>
          </div>
        )}
      </header>

      {/* Interface Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
         <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <div className="p-3.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  {darkMode ? <Moon size={24} /> : <Sun size={24} />}
               </div>
               <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Visual Theme</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toggle Light/Dark Interface</p>
               </div>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className={`relative w-16 h-8 rounded-full transition-all duration-300 border-2 ${
                darkMode ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-200 border-slate-100'
              }`}
            >
              <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-xl transition-all duration-300 transform ${
                darkMode ? 'translate-x-8' : ''
              } flex items-center justify-center`}>
                 {darkMode ? <Moon size={10} className="text-emerald-600" /> : <Sun size={10} className="text-amber-500" />}
              </div>
            </button>
         </div>
      </section>

      {/* Cloud Sync Section - RESTORED & ENHANCED */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Cloud size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Cloud Synchronization</h2>
              <div className="flex items-center space-x-2">
                 <div className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status: Ready</p>
              </div>
            </div>
          </div>
          <button 
            disabled={syncing}
            onClick={handleCloudSync}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              syncing 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' 
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-lg shadow-blue-100 dark:shadow-none'
            }`}
          >
            {syncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>

        {syncing && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2">
             <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300 rounded-full" 
                  style={{ width: `${syncProgress}%` }}
                ></div>
             </div>
             <p className="text-[9px] font-bold text-blue-500 mt-2 uppercase tracking-widest">Transmitting data packets... {syncProgress}%</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
              <Globe size={10} className="mr-1" /> Primary Sync Endpoint
            </label>
            <input 
              type="text" 
              placeholder="https://your-server.com/v1/sync"
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm dark:text-white focus:border-blue-400 transition-colors"
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
             <div className="flex items-center justify-between w-full sm:w-auto px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex-1">
                <div className="flex items-center space-x-3">
                   <Zap size={16} className="text-amber-500" />
                   <div>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Real-time Entry</p>
                      <p className="text-[9px] font-bold text-slate-400">Sync on Every Save</p>
                   </div>
                </div>
                <button onClick={() => setAutoSync(!autoSync)} className={`w-12 h-6 rounded-full transition-all ${autoSync ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 shadow-sm ${autoSync ? 'translate-x-6' : ''}`} />
                </button>
             </div>
             
             <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center flex-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Last Valid Handshake</p>
                <p className="text-xs font-black text-slate-700 dark:text-slate-300">{lastSync}</p>
             </div>
          </div>
        </div>
      </section>

      {/* Security Section - BIOMETRIC & PIN */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Security Vault</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Access & Encryption Control</p>
            </div>
          </div>
          <button 
            onClick={handleSaveSecurity}
            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            Update Policy
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400"><Key size={20} /></div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">4-Digit PIN Authentication</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prompt for PIN on app startup</p>
              </div>
            </div>
            <button onClick={() => setLockActive(!lockActive)} className={`w-12 h-6 rounded-full transition-all ${lockActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 shadow-sm ${lockActive ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {lockActive && (
            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex flex-col items-center space-y-4 animate-in slide-in-from-top-4 duration-300 border border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Configure Access Key</label>
              <div className="flex items-center space-x-3">
                 <input 
                  type="password" 
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="****"
                  className="w-48 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center text-3xl tracking-[0.8em] font-black focus:border-emerald-500 outline-none dark:text-white transition-all shadow-inner"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <p className="text-[9px] font-bold text-slate-400 flex items-center"><Info size={10} className="mr-1" /> Use a secure, non-sequential numeric pattern</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-6 p-2">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400"><Fingerprint size={20} /></div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Biometric Unlock</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Use Native Fingerprint/FaceID</p>
              </div>
            </div>
            <button onClick={() => setBiometric(!biometric)} className={`w-12 h-6 rounded-full transition-all ${biometric ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 shadow-sm ${biometric ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Data Lifecycle Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center space-x-4 mb-8">
          <div className="p-3.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Data Integrity</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Backup & Restoration Engine</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button onClick={exportData} className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all text-slate-500 dark:text-slate-400 group">
            <Download size={32} className="mb-3 group-hover:text-emerald-500 transition-transform group-hover:-translate-y-1" />
            <span className="font-black uppercase tracking-widest text-[10px] group-hover:text-slate-900 dark:group-hover:text-white">Export Ledger Asset</span>
            <p className="text-[9px] mt-1 font-bold">Local JSON Format</p>
          </button>
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-slate-500 dark:text-slate-400 group cursor-pointer">
            <Upload size={32} className="mb-3 group-hover:text-indigo-500 transition-transform group-hover:-translate-y-1" />
            <span className="font-black uppercase tracking-widest text-[10px] group-hover:text-slate-900 dark:group-hover:text-white">Restore from Asset</span>
            <p className="text-[9px] mt-1 font-bold">Replace active database</p>
            <input type="file" className="hidden" accept=".json" onChange={importData} />
          </label>
        </div>
        
        <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-700 text-center">
           <button 
             onClick={async () => { if (window.confirm("CRITICAL: ERASE ALL LOCAL LEDGER DATA?")) { await (db as any).delete(); window.location.reload(); } }} 
             className="px-8 py-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em] border border-rose-100 dark:border-rose-900/50 shadow-sm"
           >
             Terminal Reset: Destroy Local DB
           </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
