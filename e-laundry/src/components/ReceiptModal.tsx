import { useState } from 'react';
import { X, Printer, Check, Copy, Milestone, CheckCircle2 } from 'lucide-react';
import { Transaction } from '../types';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`Nomina Tagihan: ${formatRupiah(transaction.total_harga)}\nInvoice: ${transaction.invoice_id}\nLunas: ${transaction.status_pembayaran.toUpperCase()}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    // Standard system print utility trigger
    window.print();
  };

  const displayDate = new Date(transaction.created_at).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate Turnaround Estimate
  const createdAt = new Date(transaction.created_at);
  let durationDays = 3; // Default reguler
  const serviceNamesLower = transaction.items.map(item => (item.nama_produk || '').toLowerCase()).join(', ');
  if (
    serviceNamesLower.includes('kilat') ||
    serviceNamesLower.includes('express') ||
    serviceNamesLower.includes('ekspres') ||
    serviceNamesLower.includes('24 jam')
  ) {
    durationDays = 1;
  } else if (
    serviceNamesLower.includes('setrika saja') ||
    serviceNamesLower.includes('setrika aja') ||
    serviceNamesLower.includes('2 hari')
  ) {
    durationDays = 2;
  }
  const estimatedDate = new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const displayEstDate = estimatedDate.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' WIB';

  return (
    <div id="receipt-modal-overlay" className="scale-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto print:p-0 print:bg-white">
      {/* Container Card */}
      <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-5 print:shadow-none print:p-2 print:border-0 print:max-w-full">
        
        {/* Actions header (Hidden in standard printing) */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 print:hidden">
          <h3 className="text-sm font-bold text-gray-800">Cetak/Pratinjau Nota</h3>
          <button
            id="btn-close-receipt-modal"
            onClick={onClose}
            className="p-1 hover:bg-gray-150 rounded-lg transition-colors text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THERMAL PAPER DESIGN AREA */}
        <div id="thermal-receipt-paper" className="bg-[#fcfbf9] border border-gray-150 rounded-xl p-5 font-mono text-xs text-gray-700 shadow-3xs space-y-4 print:border-0 print:bg-white print:p-0 print:shadow-none">
          
          {/* Outlet branding header */}
          <div className="text-center space-y-1">
            <h2 className="text-md font-bold tracking-tight text-gray-900 font-sans uppercase">E-LAUNDRY SMART</h2>
            <p className="text-[10px] text-gray-500">Jalan Raya Telang Kamal Bangkalan</p>
            <p className="text-[9px] text-gray-400">WA: 085236839100</p>
            <div className="border-b border-dashed border-gray-300 pt-2" />
          </div>

          {/* Transaction metadata logs */}
          <div className="space-y-1 text-[10px] text-gray-600">
            <div className="flex justify-between">
              <span>No. Invoice:</span>
              <span className="font-bold text-gray-900">{transaction.invoice_id}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu Cuci:</span>
              <span>{displayDate}</span>
            </div>
            <div className="flex justify-between text-indigo-650 font-semibold">
              <span>Estimasi Selesai:</span>
              <span>{displayEstDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span className="font-bold text-gray-800">{transaction.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{transaction.cashier_name}</span>
            </div>
            <div className="border-b border-dashed border-gray-300 pt-2" />
          </div>

          {/* Item details lists */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Daftar Cucian</span>
            
            <div className="space-y-1">
              {transaction.items.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold text-gray-800">
                    <span>{it.nama_produk}</span>
                    <span>{formatRupiah(it.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{it.qty} {it.nama_produk.includes('kg') ? 'kg' : 'pcs'} x {formatRupiah(it.harga)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-b border-dashed border-gray-300 pt-2" />
          </div>

          {/* Total aggregates */}
          <div className="space-y-1 md:space-y-1.5 text-right">
            <div className="flex justify-between font-bold text-sm text-gray-900">
              <span>Grand Total:</span>
              <span>{formatRupiah(transaction.total_harga)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Metode Pembayaran:</span>
              <span className="uppercase font-bold text-gray-800">{transaction.metode_pembayaran}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Status Pelunasan:</span>
              <span className={`font-black uppercase ${transaction.status_pembayaran === 'lunas' ? 'text-green-600' : 'text-rose-600'}`}>
                {transaction.status_pembayaran}
              </span>
            </div>
          </div>

          {/* Footers */}
          <div className="text-center pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-400 space-y-1 font-sans">
            <p className="font-semibold text-gray-500">Terima kasih atas kepercayaan Anda!</p>
            <p>Pakaian bersih, wangi & higienis adalah komitmen kami.</p>
            <p className="text-[8px] text-gray-300 font-mono">Powered by E-Laundry Local Smart</p>
          </div>

        </div>

        {/* Buttons (Hidden in standard printing) */}
        <div className="flex flex-col gap-2 pt-2 print:hidden">
          <button
            id="btn-print-thermal-receipt"
            onClick={handlePrint}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-3xs"
          >
            <Printer className="w-4 h-4" />
            Cetak Nota Thermal
          </button>

          <button
            id="btn-copy-receipt-link"
            onClick={handleCopyLink}
            className="w-full py-2 border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Disalin ke Clipboard
              </>
            ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Salin Info Nota
                </>
              )}
          </button>
        </div>

      </div>
    </div>
  );
}
