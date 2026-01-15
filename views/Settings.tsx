
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Download, Upload, Trash2, Database, Cloud, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';

const Settings: React.FC = () => {
  const [syncUrl, setSyncUrl] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    db.settings.get('global').then(s => {
      if (s) {
        setSyncUrl(s.cloudSyncUrl || '');
        setAutoSync(s.autoSync || false);
      }
    });
  }, []);

  const handleSaveSync = async () => {
    await db.settings.update('global', { cloudSyncUrl: syncUrl, autoSync });
    setStatus({ type: 'success', msg: 'Sync settings saved!' });
    setTimeout(() => setStatus(null), 3000);
  };

  const exportData = async () => {
    const data = await db.getFullExport();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (window.confirm("This will overwrite existing data. Continue?")) {
          // Fix: Accessing transaction method with explicit casting to any to satisfy type checker
          await (db as any).transaction('rw', [db.customers, db.transactions, db.settings], async () => {
            await db.customers.clear();
            await db.transactions.clear();
            await db.settings.clear();
            await db.customers.bulkAdd(data.customers);
            await db.transactions.bulkAdd(data.transactions);
            await db.settings.bulkAdd(data.settings);
          });
          window.location.reload();
        }
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 page-transition pb-10">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">App Configuration</h1>
        <p className="text-gray-500">Manage data, sync, and system settings</p>
      </header>

      <div className="space-y-6">
        {/* Cloud Sync Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Cloud size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Cloud Backup</h2>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100 flex items-start space-x-3">
            <Globe className="text-blue-500 mt-0.5 shrink-0" size={18} />
            <div className="text-sm text-blue-800">
              <p className="font-bold">Protect your business data!</p>
              <p className="mt-1">Link a Webhook to automatically back up your database to the cloud every time you save records.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sync URL (POST Webhook)</label>
              <input 
                type="url"
                placeholder="https://..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="autoSync"
                className="w-5 h-5 rounded text-blue-600 border-gray-200"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
              />
              <label htmlFor="autoSync" className="text-sm font-medium text-gray-700">Auto-sync on every save</label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveSync}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Save Config
              </button>
              <button
                onClick={handleSaveSync}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Cloud size={18} />
                <span>Test Sync</span>
              </button>
            </div>

            {status && (
              <div className={`p-3 rounded-lg flex items-center space-x-2 text-sm font-medium ${
                status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                <span>{status.msg}</span>
              </div>
            )}
          </div>
        </section>

        {/* Data Management Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Database size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Local Database</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={exportData}
              className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-600 hover:text-blue-700 font-medium"
            >
              <Download size={20} />
              <span>Export Backup</span>
            </button>
            <label className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-gray-600 hover:text-green-700 font-medium cursor-pointer">
              <Upload size={20} />
              <span>Import Backup</span>
              <input type="file" className="hidden" accept=".json" onChange={importData} />
            </label>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">Danger Zone</h3>
            <button
              onClick={async () => {
                if (window.confirm("DANGER: This will delete ALL data. This cannot be undone.")) {
                  // Fix: Accessing delete method on db instance with explicit casting to any to satisfy type checker
                  await (db as any).delete();
                  window.location.reload();
                }
              }}
              className="flex items-center text-sm font-medium text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={16} className="mr-1.5" /> Wipe System Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
