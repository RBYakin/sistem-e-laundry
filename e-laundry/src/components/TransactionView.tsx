import React, { useState } from 'react';
import { Search, ShoppingCart, Printer, ChevronDown } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionViewProps {
  transactions: Transaction[];
  currentUser: { id: string; role: 'admin' | 'pegawai' | 'pelanggan'; nama: string };
  onUpdateStatus: (id: string, nextStatus: 'masuk' | 'proses' | 'selesai' | 'diambil') => void;
  onConfirmPayment: (id: string, method?: 'qris' | 'cod') => void;
  onOpenReceipt: (tx: Transaction) => void;
  onRefresh: () => void;
  loadingId: string | null;
}

export default function TransactionView({
  transactions,
  currentUser,
  onUpdateStatus,
  onConfirmPayment,
  onOpenReceipt,
  onRefresh,
  loadingId
}: TransactionViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Weight edit states for pegawai/admin online order check
  const [activeWeightEditTx, setActiveWeightEditTx] = useState<Transaction | null>(null);
  const [weightsMap, setWeightsMap] = useState<Record<string, string>>({}); // product_id -> weight string
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [weightError, setWeightError] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'masuk':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">Antrian Masuk</span>;
      case 'proses':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-150 animate-pulse">Sedang Proses</span>;
      case 'selesai':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-150">Selesai Cuci</span>;
      case 'diambil':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">Sudah Diambil</span>;
      default:
        return null;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    if (status === 'lunas') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200">Lunas</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-150">Belum Bayar</span>;
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWeightEditTx) return;
    setWeightError('');

    const payloadItems = Object.entries(weightsMap).map(([productId, weightStr]) => {
      const val = parseFloat(weightStr as string);
      if (isNaN(val) || val <= 0) {
        return null;
      }
      return {
        product_id: productId,
        qty: val
      };
    });

    if (payloadItems.includes(null)) {
      setWeightError('Wajib memasukkan angka berat kg yang valid (lebih besar dari 0)!');
      return;
    }

    setIsSavingWeights(true);
    try {
      const res = await fetch(`/api/transactions/${activeWeightEditTx.id}/update-weight`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payloadItems })
      });
      if (res.ok) {
        onRefresh();
        setActiveWeightEditTx(null);
      } else {
        const d = await res.json();
        setWeightError(d.message || 'Gagal menyimpan penimbangan.');
      }
    } catch (err) {
      setWeightError('Kesalahan koneksi server.');
    } finally {
      setIsSavingWeights(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchSearch = t.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.customer_phone.includes(searchTerm);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || t.status_pembayaran === paymentFilter;

    return matchSearch && matchStatus && matchPayment;
  });

  return (
    <div id="tx-manager-wrapper" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Transaksi</h1>
        <p className="text-sm text-slate-500">
          {currentUser.role === 'pelanggan' 
            ? 'Pantau histori pengerjaan laundry Anda di bawah ini.' 
            : 'Kelola status pengerjaan, pelunasan pembayaran, dan pencetakan nota otomatis.'}
        </p>
      </div>

      {/* Search and Filtering bar */}
      <div id="filter-bar" className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="tx-search-input"
            type="text"
            placeholder="Cari kode invoice atau nama pelanggan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* Filter select elements */}
        <div id="filter-selectors" className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="relative">
            <select
              id="filter-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white font-bold text-xs text-slate-700 pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Status Cuci</option>
              <option value="masuk">Antrian Masuk</option>
              <option value="proses">Sedang Proses</option>
              <option value="selesai">Selesai Cuci</option>
              <option value="diambil">Sudah Diambil</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Payment status filter */}
          <div className="relative">
            <select
              id="filter-payment-select"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="appearance-none bg-white font-bold text-xs text-slate-700 pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Semua Status Bayar</option>
              <option value="belum_bayar">Belum Bayar</option>
              <option value="lunas">Lunas</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Transactions Tabular Data List styled as clean Bento Grid table container */}
      <div id="tx-history-table-container" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShoppingCart className="w-12 h-12 mx-auto stroke-1 mb-3 text-slate-300" />
            <p className="text-sm font-medium">Tidak ada transaksi yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="px-6 py-4">Invoice ID / Tanggal</th>
                  <th className="px-6 py-4">Pelanggan</th>
                  <th className="px-6 py-4">Layanan / Detail Item</th>
                  <th className="px-6 py-4 text-right">Total Transaksi</th>
                  <th className="px-6 py-4 text-center">Metode / Bayar</th>
                  <th className="px-6 py-4 text-center">Status Laundry</th>
                  <th className="px-6 py-4 text-center">Aksi / Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTransactions.map((tx) => {
                  const displayDate = new Date(tx.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                      {/* Invoice & Date Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 text-xs">{tx.invoice_id}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{displayDate}</div>
                      </td>

                      {/* Customer Info Column */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 text-xs">{tx.customer_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{tx.customer_phone}</div>
                      </td>

                      {/* Items Details Column */}
                      <td className="px-6 py-4">
                        <div className="max-w-[180px] space-y-0.5">
                          {tx.items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="text-xs text-slate-600 truncate">
                              • {it.nama_produk} ({it.qty} {it.nama_produk.includes('kg') || it.nama_produk.includes('Cuci') ? 'kg' : 'pcs'})
                            </div>
                          ))}
                          {tx.items.length > 2 && (
                            <span className="text-[10px] text-indigo-600 font-medium">+{tx.items.length - 2} layanan lainnya</span>
                          )}
                        </div>
                      </td>

                      {/* Total Price Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-right font-sans font-bold text-slate-900">
                        {formatRupiah(tx.total_harga)}
                      </td>

                      {/* Payment Status Column */}
                      <td className="px-6 py-4 text-center space-y-1">
                        <div>
                          {getPaymentStatusBadge(tx.status_pembayaran)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">
                          {tx.metode_pembayaran === 'qris' ? '⚡ QRIS' : '💵 COD'}
                        </div>
                      </td>

                      {/* Laundry Progress Status */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {getStatusBadge(tx.status)}
                      </td>

                      {/* Actions Buttons */}
                      <td className="px-6 py-4 text-center space-y-1 md:space-y-0 md:space-x-1.5 whitespace-nowrap">
                        {/* View Receipt / Print nota always available */}
                        <button
                          id={`btn-view-receipt-${tx.id}`}
                          onClick={() => onOpenReceipt(tx)}
                          className="inline-flex items-center gap-1.5 justify-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-xs text-indigo-700 font-bold rounded-xl transition-all border border-indigo-100 cursor-pointer"
                          title="Cetak Nota / View Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Nota
                        </button>

                        {/* Customer-restricted display with advanced weights & status toggle flow */}
                        {currentUser.role !== 'pelanggan' && (() => {
                          const hasKiloan = tx.items.some(it => 
                            it.nama_produk.toLowerCase().includes('kilo') || 
                            it.nama_produk.toLowerCase().includes('cuci') || 
                            it.nama_produk.toLowerCase().includes('setrika')
                          );

                          return (
                            <>
                              {hasKiloan && (
                                <button
                                  onClick={() => {
                                    const initialWeights: Record<string, string> = {};
                                    tx.items.forEach(it => {
                                      initialWeights[it.product_id] = String(it.qty || '');
                                    });
                                    setWeightsMap(initialWeights);
                                    setActiveWeightEditTx(tx);
                                    setWeightError('');
                                  }}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer ml-1 animate-pulse"
                                  title="Timbang atau Update Berat Laundry"
                                >
                                  ⚖️ Timbang Berat
                                </button>
                              )}

                              {tx.status_pembayaran === 'belum_bayar' ? (
                                <button
                                  onClick={() => onConfirmPayment(tx.id, tx.metode_pembayaran)}
                                  disabled={loadingId === tx.id}
                                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors ml-1 disabled:opacity-50 cursor-pointer"
                                  title="Bayar Lunas"
                                >
                                  Lunas?
                                </button>
                              ) : (
                                <>
                                  {tx.status === 'masuk' && (
                                    <button
                                      onClick={() => onUpdateStatus(tx.id, 'proses')}
                                      disabled={loadingId === tx.id}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer ml-1"
                                    >
                                      Kerjakan
                                    </button>
                                  )}
                                  {tx.status === 'proses' && (
                                    <button
                                      onClick={() => onUpdateStatus(tx.id, 'selesai')}
                                      disabled={loadingId === tx.id}
                                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer ml-1"
                                    >
                                      Selesai
                                    </button>
                                  )}
                                  {tx.status === 'selesai' && (
                                    <button
                                      onClick={() => onUpdateStatus(tx.id, 'diambil')}
                                      disabled={loadingId === tx.id}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer ml-1"
                                    >
                                      Diambil
                                    </button>
                                  )}
                                  <span className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 text-[11px] font-extrabold rounded-xl border border-green-200 ml-1">
                                    ✓ Lunas
                                  </span>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Timbang / Edit Weight Modal overlay */}
      {activeWeightEditTx && (
        <div id="modal-timbang-berat" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-150">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">⚖️ Timbang Item Kiloan</h3>
              <p className="text-[11px] text-gray-400">Masukkan berat riil timbangan kassa untuk menentukan harga.</p>
            </div>

            {weightError && (
              <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold rounded-xl">
                {weightError}
              </div>
            )}

            <form onSubmit={handleSaveWeights} className="space-y-4">
              <div className="space-y-3">
                {activeWeightEditTx.items.map((it, idx) => {
                  const isKiloanProduct = it.nama_produk.toLowerCase().includes('kilo') || 
                                          it.nama_produk.toLowerCase().includes('cuci') || 
                                          it.nama_produk.toLowerCase().includes('setrika');
                  if (!isKiloanProduct) return null;

                  return (
                    <div key={idx} className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block">{it.nama_produk}</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          required
                          min="0.1"
                          placeholder="Masukkan berat dalam kg (ex: 2.5)"
                          value={weightsMap[it.product_id] || ''}
                          onChange={(e) => setWeightsMap(prev => ({ ...prev, [it.product_id]: e.target.value }))}
                          className="w-full text-xs font-mono border border-slate-200 rounded-xl p-3 pr-10 focus:border-indigo-500 focus:outline-hidden"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-sans">kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveWeightEditTx(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingWeights}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSavingWeights ? 'Menyimpan...' : 'Simpan & Hitung'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
