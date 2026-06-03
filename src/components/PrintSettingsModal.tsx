import React, { useState } from 'react';
import { X, Settings, Check } from 'lucide-react';

interface Column {
  header: string;
  key: string;
  isCurrency?: boolean;
  isTotal?: boolean;
  enabled: boolean;
}

interface PrintSettings {
  showBranding: boolean;
  companyName: string;
  companyAddress: string;
  columns: Column[];
}

interface PrintSettingsModalProps {
  title: string;
  availableColumns: { header: string; key: string; isCurrency?: boolean; isTotal?: boolean }[];
  onConfirm: (settings: PrintSettings) => void;
  onCancel: () => void;
}

export default function PrintSettingsModal({
  title,
  availableColumns,
  onConfirm,
  onCancel
}: PrintSettingsModalProps) {
  const [settings, setSettings] = useState<PrintSettings>({
    showBranding: true,
    companyName: 'Your Company Name',
    companyAddress: '123 Business Road, City, Country',
    columns: availableColumns.map(col => ({ ...col, enabled: true }))
  });

  const toggleColumn = (idx: number) => {
    const newColumns = [...settings.columns];
    newColumns[idx].enabled = !newColumns[idx].enabled;
    setSettings({ ...settings, columns: newColumns });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Print Settings - {title}</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Branding Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Branding</h4>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-medium text-gray-700">Include Company Branding</span>
              <button
                onClick={() => setSettings({ ...settings, showBranding: !settings.showBranding })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.showBranding ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showBranding ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            {settings.showBranding && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Company Name</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Company Address</label>
                  <textarea
                    value={settings.companyAddress}
                    onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Columns Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Visible Columns</h4>
            <div className="grid grid-cols-1 gap-2">
              {settings.columns.map((col, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleColumn(idx)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    col.enabled 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-white border-gray-200 text-gray-500 grayscale'
                  }`}
                >
                  <span className="text-sm font-medium">{col.header}</span>
                  {col.enabled && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(settings)}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-200"
          >
            Generate Print
          </button>
        </div>
      </div>
    </div>
  );
}
