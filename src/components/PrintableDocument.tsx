import React, { useEffect } from 'react';

interface PrintableDocumentProps {
  title: string;
  documentNo: string;
  date: string;
  entityName: string;
  entityLabel: string;
  status?: string;
  items: any[];
  columns: { header: string; key: string; isCurrency?: boolean; isTotal?: boolean }[];
  totalAmount?: number;
  onClose: () => void;
  branding?: {
    show: boolean;
    companyName: string;
    companyAddress: string;
  };
}

export default function PrintableDocument({
  title,
  documentNo,
  date,
  entityName,
  entityLabel,
  status,
  items,
  columns,
  totalAmount,
  onClose,
  branding
}: PrintableDocumentProps) {
  
  useEffect(() => {
    const handleAfterPrint = () => {
      onClose();
    };
    
    window.addEventListener('afterprint', handleAfterPrint);
    
    // Trigger print after a short delay to allow rendering
    const timer = setTimeout(() => {
      window.print();
    }, 500); // Increased delay for better rendering

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div className="print-only print-section bg-white p-8 min-h-screen text-black font-sans">
      {/* Branding Header */}
      {branding?.show && (
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
              {branding.companyName.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{branding.companyName}</h2>
              <p className="text-sm text-gray-500 whitespace-pre-line">{branding.companyAddress}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-black text-gray-200 uppercase tracking-tighter">{title}</h1>
          </div>
        </div>
      )}

      {!branding?.show && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-wider">{title}</h1>
        </div>
      )}
      
      <div className="flex justify-between mb-12">
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{entityLabel}</p>
          <p className="text-xl font-bold text-gray-900">{entityName}</p>
        </div>
        <div className="text-right space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-right">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Document No</span>
            <span className="text-sm font-bold">{documentNo}</span>
            
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Date</span>
            <span className="text-sm font-bold">{new Date(date).toLocaleDateString()}</span>
            
            {status && (
              <>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Status</span>
                <span className="text-sm font-bold uppercase">{status.replace(/_/g, ' ')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <table className="w-full text-left border-collapse mb-12">
        <thead>
          <tr className="border-b-2 border-gray-800">
            {columns.map((col, idx) => (
              <th key={idx} className={`py-3 text-xs font-bold uppercase tracking-widest text-gray-500 ${col.isCurrency || col.isTotal ? 'text-right' : ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <tr key={idx}>
              {columns.map((col, colIdx) => {
                const val = item[col.key];
                let displayVal = val;
                if (col.isCurrency) {
                  displayVal = `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                } else if (col.isTotal) {
                  const total = Number(item.quantity || 0) * Number(item.unit_price || 0);
                  displayVal = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
                return (
                  <td key={colIdx} className={`py-4 text-sm ${col.isCurrency || col.isTotal ? 'text-right font-mono' : 'text-gray-700'}`}>
                    {displayVal}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {totalAmount !== undefined && (
        <div className="flex justify-end mb-24">
          <div className="w-72 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Amount</span>
              <span className="text-2xl font-black text-indigo-600 font-mono">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-24">
        <div className="text-center">
          <div className="border-t-2 border-gray-200 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Authorized Signature</p>
            <p className="mt-8 text-sm text-gray-300 italic">Sign here</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t-2 border-gray-200 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recipient Signature</p>
            <p className="mt-8 text-sm text-gray-300 italic">Sign here</p>
          </div>
        </div>
      </div>
      
      <div className="mt-12 pt-8 border-t border-gray-100 text-center">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">Generated by Inventory Management System</p>
      </div>
    </div>
  );
}
