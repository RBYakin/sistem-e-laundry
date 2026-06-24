import { useState, useEffect, FormEvent } from 'react';
import {
  Clock,
  CheckCircle,
  Smartphone,
  MapPin,
  FileText,
  Check,
  Award,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Send,
  AlertCircle,
  Archive,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Transaction, Product } from '../types';

interface CustomerOrderViewProps {
  transactions: Transaction[];
  products: Product[];
  currentUser: { id: string; nama: string; no_telp: string; alamat: string };
  onTriggerQRISPayment: (id: string) => Promise<boolean>;
  onOpenReceipt: (tx: Transaction) => void;
  onAddOnlineTransaction: (data: {
    pelanggan_id: string | null;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    items: { product_id: string; qty: number }[];
    metode_pembayaran: 'qris' | 'cod';
    status_pembayaran: 'belum_bayar' | 'lunas';
  }) => Promise<void>;
  onUpdateUser: (updatedUser: any) => void;
  loading: boolean;
}

export default function CustomerOrderView({
  transactions = [],
  products = [],
  currentUser,
  onTriggerQRISPayment,
  onOpenReceipt,
  onAddOnlineTransaction,
  onUpdateUser,
  loading
}: CustomerOrderViewProps) {
  // Navigation inside Customer Hub
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'order' | 'history'>('status');

  // Profile Edit States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editPhone, setEditPhone] = useState(currentUser.no_telp || '');
  const [editAddress, setEditAddress] = useState(currentUser.alamat || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Online Order Form States
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [customAddress, setCustomAddress] = useState(currentUser.alamat || '');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'cod'>('cod');
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Track currently selected invoice for active focus payment
  const [activePaymentTx, setActivePaymentTx] = useState<Transaction | null>(null);
  
  // QRIS Countdown timer state
  const [qrisTimer, setQrisTimer] = useState(300); // 5 minutes countdown
  const [qrisPaidStatus, setQrisPaidStatus] = useState<'idle' | 'pending' | 'success'>('idle');

  // Pagination for all orders in history tab
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Trigger countdown when QRIS modal opens
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activePaymentTx) {
      setQrisTimer(300);
      setQrisPaidStatus('pending');
      interval = setInterval(() => {
        setQrisTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activePaymentTx]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    const phoneVal = editPhone.trim();
    const addressVal = editAddress.trim();

    if (!/^[0-9]{10,13}$/.test(phoneVal)) {
      setProfileError('Format Nomor HP salah! Wajib berisi digit angka saja sepanjang 10-13 digit.');
      return;
    }

    if (addressVal.length < 5) {
      setProfileError('Format Alamat salah! Alamat terlalu pendek, minimal 5 karakter.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          no_telp: phoneVal,
          alamat: addressVal
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileSuccess(true);
        onUpdateUser(data.user);
        setTimeout(() => {
          setShowProfileModal(false);
          setProfileSuccess(false);
        }, 1200);
      } else {
        setProfileError(data.message || 'Gagal menyimpan pembaruan profil.');
      }
    } catch (err) {
      setProfileError('Koneksi server gagal saat menyimpan profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Show all active transactions (status !== 'diambil') so none are missed
  const activeOrders = transactions.filter(t => t.status !== 'diambil');
  const pastOrders = transactions.filter(t => t.status === 'diambil').slice(0, 5);

  // Compute pagination subset of transactions for history tab
  const totalPages = Math.ceil(transactions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  // Auto adjust page range safely
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [transactions, totalPages, currentPage]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getStepColorClass = (currentStatus: string, step: 'masuk' | 'proses' | 'selesai') => {
    const orderMap: Record<string, number> = { 'masuk': 1, 'proses': 2, 'selesai': 3, 'diambil': 4 };
    const currentNum = orderMap[currentStatus] || 1;
    const stepNum = orderMap[step];

    if (currentNum >= stepNum) {
      if (step === 'selesai' && currentNum === 3) return 'bg-purple-600 text-white border-purple-600';
      if (currentNum > stepNum) return 'bg-emerald-600 text-white border-emerald-600';
      return 'bg-blue-600 text-white border-blue-600';
    }
    return 'bg-white text-gray-400 border-gray-200';
  };

  const handleQRISPaymentSuccess = async () => {
    if (!activePaymentTx) return;
    const ok = await onTriggerQRISPayment(activePaymentTx.id);
    if (ok) {
      setQrisPaidStatus('success');
      setTimeout(() => {
        setActivePaymentTx(null);
        setQrisPaidStatus('idle');
      }, 1800);
    }
  };

  // Adjust product quantities inside online order view
  const adjustQuantity = (productId: string, delta: number, isKiloan: boolean) => {
    setSelectedQuantities(prev => {
      const current = prev[productId] || 0;
      let next = current + delta;
      
      // Floating numbers or discrete steps depending on kilo vs pcs
      if (isKiloan) {
        next = Math.round(next * 10) / 10;
      }
      
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Compute live price estimate
  const getOrderTotal = () => {
    return Object.entries(selectedQuantities).reduce((total, [prodId, qty]) => {
      const prod = products.find(p => p.id === prodId);
      if (!prod) return total;
      return total + (prod.harga * Number(qty));
    }, 0);
  };

  // Handle Online Booking Submit action step
  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setOrderError('');

    const orderItems = Object.entries(selectedQuantities).map(([productId, qty]) => ({
      product_id: productId,
      qty: Number(qty)
    }));

    if (orderItems.length === 0) {
      setOrderError('Silakan pilih minimal satu jenis layanan laundry di bawah ini terlebih dahulu!');
      return;
    }

    const selectedKiloanItems = orderItems.filter(item => {
      const prod = products.find(p => p.id === item.product_id);
      return prod && prod.jenis === 'kiloan';
    });
    if (selectedKiloanItems.length > 1) {
      setOrderError('Format Gagal! Anda hanya bisa memilih maksimal 1 layanan kiloan dalam satu kali transaksi.');
      return;
    }

    const addressVal = customAddress.trim();
    const nameVal = (currentUser.nama || '').trim();
    const phoneVal = (currentUser.no_telp || '').trim();

    if (!/^[a-zA-Z\s]{2,50}$/.test(nameVal)) {
      setOrderError('Format Nama Pelanggan salah! Harus berupa huruf sepanjang 2-50 karakter.');
      return;
    }

    if (!/^[0-9]{10,13}$/.test(phoneVal)) {
      setOrderError('Format Nomor HP salah! Wajib berisi digit angka saja sepanjang 10-13 digit.');
      return;
    }

    if (addressVal.length < 5) {
      setOrderError('Format Alamat penjemputan salah! Alamat minimal berisi 5 karakter.');
      return;
    }

    try {
      await onAddOnlineTransaction({
        pelanggan_id: currentUser.id,
        customer_name: currentUser.nama,
        customer_phone: currentUser.no_telp,
        customer_address: customAddress,
        items: orderItems,
        metode_pembayaran: paymentMethod,
        status_pembayaran: 'belum_bayar'
      });

      setOrderSuccess(true);
      setSelectedQuantities({});
      setOrderError('');
      
      // Toggle back to dashboard lists after 2.5 seconds success screen flash
      setTimeout(() => {
        setOrderSuccess(false);
        setActiveSubTab('status');
      }, 2500);

    } catch (err) {
      setOrderError('Gagal mengirimkan order online local. Silakan coba kembali.');
    }
  };

  const minutes = String(Math.floor(qrisTimer / 60)).padStart(2, '0');
  const seconds = String(qrisTimer % 60).padStart(2, '0');

  return (
    <div id="customer-dashboard-container" className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-750 text-white p-6 rounded-3xl shadow-md space-y-2 relative overflow-hidden border border-indigo-800 animate-fade-in">
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200 bg-indigo-800/40 px-2.5 py-1 rounded-xl w-fit">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Member Area Terintegrasi
        </div>
        <h1 className="text-xl sm:text-2xl font-black">Selamat Datang, {currentUser.nama}!</h1>
        <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-lg">Pantau status pengerjaan pakaian local Anda secara mandiri atau lakukan order laundry online instan di bawah ini.</p>
      </div>

      {/* Sub-tab segment controls with NEW 'Riwayat Pesanan' navbar link */}
      <div id="customer-subtab-bar" className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 shadow-2xs">
        <button
          id="btn-subtab-view-status"
          onClick={() => setActiveSubTab('status')}
          className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'status'
              ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-slate-250/20'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600" />
          Status Cucian Saya
        </button>
        <button
          id="btn-subtab-order-online"
          onClick={() => { setActiveSubTab('order'); setOrderError(''); }}
          className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'order'
              ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-slate-250/20'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
        >
          <Plus className="w-4 h-4 text-emerald-500" />
          Order Laundry Online
        </button>
        <button
          id="btn-subtab-history-records"
          onClick={() => { setActiveSubTab('history'); setCurrentPage(1); }}
          className={`flex-1 py-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-white text-indigo-950 shadow-xs ring-1 ring-slate-250/20'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
          }`}
        >
          <Archive className="w-4 h-4 text-purple-600" />
          Riwayat Pesanan ({transactions.length})
        </button>
      </div>

      {activeSubTab === 'status' && (
        <div className="space-y-6 animate-fade-in">
          {/* Profiling and Support row */}
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Profil Saya</h3>
            <button
              onClick={() => {
                setEditPhone(currentUser.no_telp || '');
                setEditAddress(currentUser.alamat || '');
                setProfileError('');
                setShowProfileModal(true);
              }}
              className="px-3.5 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:text-indigo-805 font-bold text-indigo-750 text-xs rounded-xl cursor-pointer transition-colors"
            >
              Ubah Alamat / Nomor HP
            </button>
          </div>
          <div id="customer-profile-bar" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No. Handphone WA</span>
                <span className="text-xs font-bold text-slate-700 font-mono block truncate">{currentUser.no_telp || '-'}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3 md:col-span-2">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alamat Rumah Terdaftar</span>
                <span className="text-xs font-bold text-slate-700 truncate block">{currentUser.alamat || '-'}</span>
              </div>
            </div>
          </div>

          {/* ACTIVE ORDERS / TRANSACTION PROCESS TRAX */}
          <div className="space-y-4">
            <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Cucian sedang / akan diproses ({activeOrders.length})
            </h2>

            {activeOrders.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl text-slate-400">
                <Award className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Wah! Belum ada cucian aktif Anda saat ini.</p>
                <p className="text-xs text-slate-400 mt-1">Coba lakukan pemesanan online via menu "Order Laundry Online" di atas!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {activeOrders.map((tx) => {
                  const dateStr = new Date(tx.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });

                  // Calculate Turnaround Estimate based on selected product types
                  const createdAt = new Date(tx.created_at);
                  let durationDays = 3; // default is 3 days
                  const serviceNamesLower = tx.items.map(it => (it.nama_produk || '').toLowerCase()).join(', ');
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
                  const displayEstDate = estimatedDate.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) + ', ' + String(estimatedDate.getHours()).padStart(2, '0') + ':' + String(estimatedDate.getMinutes()).padStart(2, '0');

                  return (
                    <div key={tx.id} id={`customer-tx-card-${tx.id}`} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-6">
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">{tx.invoice_id}</span>
                            {tx.status_pembayaran === 'lunas' ? (
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-250">Lunas</span>
                            ) : (
                              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-250">Belum Bayar</span>
                            )}
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
                              Estimasi Selesai: {displayEstDate} WIB
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">Diserahkan pada: {dateStr}</span>
                        </div>

                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => onOpenReceipt(tx)}
                            className="p-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Detail Nota
                          </button>

                          {tx.status_pembayaran === 'belum_bayar' && (
                            <button
                              onClick={() => setActivePaymentTx(tx)}
                              className="p-2 px-3.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              Simulasi Bayar QRIS
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Order Process Interactive Steps */}
                      <div className="py-2 space-y-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Proses Pengerjaan</span>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
                          {/* Desktop connecting guide lines */}
                          <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100 -z-10 hidden sm:block" />

                          {/* Step 1: Tarik antrian */}
                          <div className="flex items-center sm:flex-col gap-3 text-left sm:text-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-black shrink-0 ${getStepColorClass(tx.status, 'masuk')}`}>
                              {tx.status !== 'masuk' ? <Check className="w-4.5 h-4.5" /> : '1'}
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-slate-700 block">Antrian Masuk</span>
                              <span className="text-[10px] text-slate-400 block">Cucian diterima kassa</span>
                            </div>
                          </div>

                          {/* Step 2: Proses Cuci */}
                          <div className="flex items-center sm:flex-col gap-3 text-left sm:text-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-black shrink-0 ${getStepColorClass(tx.status, 'proses')}`}>
                              {(tx.status === 'selesai' || tx.status === 'diambil') ? <Check className="w-4.5 h-4.5" /> : '2'}
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-slate-700 block">Sedang Cuci / Setrika</span>
                              <span className="text-[10px] text-slate-400 block">Proses sterilisasi & setrika</span>
                            </div>
                          </div>

                          {/* Step 3: Selesai */}
                          <div className="flex items-center sm:flex-col gap-3 text-left sm:text-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-black shrink-0 ${getStepColorClass(tx.status, 'selesai')}`}>
                              {tx.status === 'diambil' ? <Check className="w-4.5 h-4.5" /> : '3'}
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-slate-700 block">Siap Diambil</span>
                              <span className="text-[10px] text-slate-400 block">Packing rapi higienis</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items Ordered Breakdown */}
                      <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Rincian Layanan</span>
                        <div className="divide-y divide-slate-100">
                          {tx.items.map((item, idx) => (
                            <div key={idx} className="py-1.5 flex justify-between text-xs font-medium text-slate-700">
                              <span>• {item.nama_produk}</span>
                              <span className="font-mono text-slate-500">{item.qty} {item.nama_produk.toLowerCase().includes('pcs') ? 'pcs' : 'kg'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary list */}
                      <div className="bg-indigo-50/50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs border border-indigo-100/30">
                        <div>
                          <span className="text-slate-500 font-medium">Beban Biaya Laundry: </span>
                          <span className="font-black text-indigo-950 font-sans text-sm">{formatRupiah(tx.total_harga)}</span>
                        </div>

                        <div className="text-slate-500 flex items-center gap-1.5 font-bold">
                          <Smartphone className="w-4 h-4 text-indigo-600" />
                          Metode: <span className="font-bold text-indigo-700 uppercase">{tx.metode_pembayaran}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PAST ORDERS HISTORIES CHECK (First 5 orders summary) */}
          <div className="space-y-3 pt-4">
            <h2 className="text-md font-bold text-slate-800">Histori Cucian Terakhir yang Sudah Diambil ({pastOrders.length})</h2>

            {pastOrders.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada histori laundry yang diselesaikan.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs divide-y divide-slate-100">
                {pastOrders.map((tx) => (
                  <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{tx.invoice_id}</span>
                        <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded border border-emerald-150 font-bold">Lunas / Diambil</span>
                      </div>
                      <span className="text-slate-400 block">Metode Pembayaran: <span className="uppercase font-semibold">{tx.metode_pembayaran}</span></span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <span className="font-bold text-slate-850 font-sans">{formatRupiah(tx.total_harga)}</span>
                      <button
                        onClick={() => onOpenReceipt(tx)}
                        className="p-1.5 px-3 bg-slate-150 hover:bg-slate-250 text-[11px] font-bold text-slate-700 rounded-xl transition-all cursor-pointer"
                      >
                        Buka Nota
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'order' && (
        /* ONLINE ORDER FORM VIEW */
        <div id="online-order-form-container" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          
          {orderSuccess ? (
            <div id="booking-success" className="p-12 text-center text-emerald-650 space-y-4 animate-scale-in">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-250">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Pemesanan Online Berhasil Terkirim!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Kurir kami akan segera menghubungi WhatsApp Anda untuk melakukan penjemputan pakaian kotor ke alamat Anda.</p>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              
              <div className="pb-3 border-b border-slate-150">
                <span className="text-xs font-extrabold uppercase tracking-wide text-indigo-650 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  Pesan Layanan Mandiri Online
                </span>
                <p className="text-xs text-slate-400 mt-0.5">Pilih produk/layanan laundry dan masukkan berat/jumlahnya secara mandiri.</p>
              </div>

              {orderError && (
                <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {orderError}
                </div>
              )}

              {/* Prefilled Profile Info Summary card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150/55">
                <div className="text-xs space-y-1">
                  <span className="text-slate-400 font-semibold block">Nama Pemesan</span>
                  <span className="font-bold text-slate-800">{currentUser.nama}</span>
                </div>
                <div className="text-xs space-y-1 font-mono">
                  <span className="text-slate-400 font-semibold font-sans block">WhatsApp Terdaftar</span>
                  <span className="font-bold text-slate-800">{currentUser.no_telp || '-'}</span>
                </div>
              </div>

              {/* Grid Products / Services selector with clear hover behavior for kiloan services */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 block">Pilih Layanan & Masukkan Estimasi Jumlah:</label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {products.map(prod => {
                    const isSelected = !!selectedQuantities[prod.id];
                    const qty = selectedQuantities[prod.id] || 0;
                    const isKiloan = prod.jenis === 'kiloan';

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          if (isKiloan) {
                            setSelectedQuantities(prev => {
                              const copy = { ...prev };
                              if (copy[prod.id] !== undefined) {
                                delete copy[prod.id];
                              } else {
                                // Clear other kiloan products first to guarantee only 1 and exactly 1 kiloan service is selected
                                Object.keys(copy).forEach(k => {
                                  const otherProd = products.find(p => p.id === k);
                                  if (otherProd && otherProd.jenis === 'kiloan') {
                                    delete copy[k];
                                  }
                                });
                                copy[prod.id] = 1; // Set default 1
                              }
                              return copy;
                            });
                          }
                        }}
                        className={`p-4 border rounded-2xl transition-all duration-300 flex items-center justify-between ${
                          isKiloan 
                            ? 'cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/5 hover:scale-[1.01] active:scale-[0.99]' 
                            : ''
                        } ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-300' 
                            : 'border-slate-200 bg-white hover:border-slate-350 shadow-3xs'
                        }`}
                        title={isKiloan ? "Klik untuk memilih layanan kiloan ini" : ""}
                      >
                        <div className="space-y-1.5 max-w-[210px] pointer-events-none">
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg inline-block ${
                            isKiloan ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-50 text-rose-800'
                          }`}>
                            {prod.jenis} {isKiloan && '• Hover & Klik'}
                          </span>
                          <h4 className="text-xs font-extrabold text-slate-800 truncate">{prod.nama}</h4>
                          <span className="text-xs font-extrabold text-indigo-600 block">
                            {formatRupiah(prod.harga)} 
                            <span className="text-[10px] text-slate-400 font-normal"> / {prod.satuan}</span>
                          </span>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{prod.deskripsi || 'Layanan terbaik kami.'}</p>
                        </div>

                        {/* Interactive +/- count controllers or Simple select for kiloan */}
                        {isKiloan ? (
                          <div className="shrink-0">
                            <span 
                              className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? '✓ Terpilih' : '+ Pilih'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => adjustQuantity(prod.id, -1, false)}
                              className="w-8 h-8 rounded-lg bg-white shadow-3xs flex items-center justify-center text-slate-600 hover:text-indigo-600 disabled:opacity-50 cursor-pointer"
                              disabled={qty === 0}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            
                            <span className="w-8 text-center text-xs font-black font-mono">
                              {qty || '0'}
                            </span>

                            <button
                              type="button"
                              onClick={() => adjustQuantity(prod.id, 1, false)}
                              className="w-8 h-8 rounded-lg bg-white shadow-3xs flex items-center justify-center text-slate-600 hover:text-indigo-600 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery / Pickup address Input check */}
              <div className="space-y-1.5 text-xs">
                <label className="text-xs font-bold text-slate-500 block">Alamat Penjemputan / Pengantaran Laundry *</label>
                <textarea
                  id="input-order-address"
                  rows={2}
                  maxLength={150}
                  placeholder="Isikan alamat penjemputan instan lengkap Anda disini..."
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              {/* Pick payment methods */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">Pilihan Metode Pembayaran:</label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3.5 border rounded-2xl cursor-pointer text-center space-y-1 select-none transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-indigo-500 bg-indigo-50/20 text-indigo-950 font-bold'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs block">💵 Bayar di Outlet / COD</span>
                    <span className="text-[10px] opacity-75 block font-medium">Bisa bayar cash saat serah baju</span>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-3.5 border rounded-2xl cursor-pointer text-center space-y-1 select-none transition-all ${
                      paymentMethod === 'qris'
                        ? 'border-indigo-500 bg-indigo-50/20 text-indigo-950 font-bold'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs block">⚡ QRIS Digital</span>
                    <span className="text-[10px] opacity-75 block font-medium">Simulasikan bayar online instan</span>
                  </div>
                </div>
              </div>

              {/* Total estimation pricing and booking action */}
              <div className="pt-4 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block font-semibold">Estimasi Total Biaya Laundry:</span>
                  <span className="text-xl font-sans font-black text-indigo-600 block">{formatRupiah(getOrderTotal())}</span>
                  <span className="text-[10px] text-slate-450 block">* Layanan kiloan dihitung berdasar timbangan nyata oleh petugas</span>
                </div>

                <button
                  id="btn-submit-online-order"
                  type="submit"
                  disabled={loading || Object.keys(selectedQuantities).length === 0}
                  className="px-6 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-150 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim Pesanan Online Sekarang
                </button>
              </div>

            </form>
          )}

        </div>
      )}

      {activeSubTab === 'history' && (
        /* TOTAL HISTORY LOGS WITH FULL PAGINATION */
        <div id="full-history-log-container" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="pb-3 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <Archive className="w-4 h-4" />
                Seluruh Riwayat Transaksi Pesanan Anda
              </span>
              <p className="text-xs text-slate-400 mt-0.5">Daftar lengkap seluruh transaksi masuk, pengerjaan, dan riwayat lunas.</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-205">
              Total: {transactions.length} Order
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-450 space-y-2">
              <Archive className="w-12 h-12 stroke-1 text-slate-300 mx-auto" />
              <p className="text-sm font-bold">Belum ada riwayat pesanan.</p>
              <p className="text-xs text-slate-400">Mulailah laundry pakaian pertama Anda dengan membuat pesanan hari ini!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-150/70 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                      <th className="px-4 py-3.5">Kode Invoice</th>
                      <th className="px-4 py-3.5">Tanggal Serah</th>
                      <th className="px-4 py-3.5">Rincian Cucian</th>
                      <th className="px-4 py-3.5 text-center">Status Cucian</th>
                      <th className="px-4 py-3.5 text-center">Status Bayar</th>
                      <th className="px-4 py-3.5 text-right">Total Transaksi</th>
                      <th className="px-4 py-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {paginatedTransactions.map((tx) => {
                      const invoiceDate = new Date(tx.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });

                      const statusLabels: Record<string, { label: string; color: string }> = {
                        'masuk': { label: 'Antri', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        'proses': { label: 'Proses Cuci', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        'selesai': { label: 'Selesai', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                        'diambil': { label: 'Diambil', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                      };

                      const currentStatus = statusLabels[tx.status] || { label: tx.status, color: 'bg-slate-100 text-slate-700' };

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{tx.invoice_id}</td>
                          <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">{invoiceDate}</td>
                          <td className="px-4 py-3 text-slate-650 max-w-[150px] truncate">
                            {tx.items.map(it => `${it.nama_produk} (${it.qty})`).join(', ')}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${currentStatus.color}`}>
                              {currentStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {tx.status_pembayaran === 'lunas' ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-green-50 text-green-700 border border-green-200">LUNAS</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">BELUM LUNAS</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-black font-sans text-slate-800 whitespace-nowrap">
                            {formatRupiah(tx.total_harga)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onOpenReceipt(tx)}
                                className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-all cursor-pointer"
                              >
                                Nota
                              </button>
                              {tx.status_pembayaran === 'belum_bayar' && (
                                <button
                                  onClick={() => setActivePaymentTx(tx)}
                                  className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded-lg transition-all cursor-pointer"
                                  title="Simulasi scan QRIS"
                                >
                                  Bayar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sleek Pagination Controls Interface for History */}
              <div id="full-history-pagination" className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-450 font-medium">
                  Menampilkan <span className="font-bold text-slate-700">{startIndex + 1}</span> - <span className="font-bold text-slate-700">{Math.min(startIndex + itemsPerPage, transactions.length)}</span> dari <span className="font-bold text-slate-700">{transactions.length}</span> order
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 px-3 bg-slate-50 text-slate-755 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Sebelumnya
                  </button>

                  {/* Page number indicators */}
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7.5 h-7.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 px-3 bg-slate-50 text-slate-755 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Selanjutnya
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QRIS DYNAMIC PAYMENTS SIMULATOR Pop-Up Sheet */}
      {activePaymentTx && (
        <div id="modal-qris-simulator" className="scale-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-5 text-center flex flex-col justify-between border border-slate-150">
            
            <div className="space-y-2 pb-2 border-b border-gray-100">
              <span className="mx-auto w-fit bg-red-50 text-red-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                Gerbang QRIS Terintegrasi (Simulasi)
              </span>
              <h3 className="text-md font-bold text-gray-800">Dynamic QRIS Merchant Laundry</h3>
              <p className="text-xs text-gray-400">Silakan scan kode QRIS menggunakan e-wallet atau aplikasi mobile banking Anda.</p>
            </div>

            {/* Simulated QR Code display area */}
            <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl flex flex-col items-center justify-center space-y-4">
              {qrisPaidStatus === 'success' ? (
                <div className="h-48 flex flex-col items-center justify-center space-y-2 text-emerald-600 py-10">
                  <CheckCircle className="w-16 h-16 animate-bounce" />
                  <p className="text-sm font-black">Pembayaran Berhasil!</p>
                  <p className="text-xs text-gray-400">Kas laundry otomatis terdata lunas.</p>
                </div>
              ) : (
                <>
                  {/* Dynamic Beautiful QR Vector Graphic */}
                  <div className="w-44 h-44 bg-white p-3 rounded-lg border border-gray-200 relative flex items-center justify-center shadow-3xs">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                      <rect width="100" height="100" fill="white" />
                      <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                      <rect x="5" y="5" width="20" height="20" fill="white" />
                      <rect x="10" y="10" width="10" height="10" fill="currentColor" />

                      <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                      <rect x="75" y="5" width="20" height="20" fill="white" />
                      <rect x="80" y="10" width="10" height="10" fill="currentColor" />

                      <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                      <rect x="5" y="75" width="20" height="20" fill="white" />
                      <rect x="10" y="80" width="10" height="10" fill="currentColor" />

                      <rect x="40" y="5" width="10" height="15" fill="currentColor" />
                      <rect x="55" y="0" width="10" height="10" fill="currentColor" />
                      <rect x="40" y="35" width="20" height="10" fill="currentColor" />
                      <rect x="15" y="45" width="15" height="10" fill="currentColor" />
                      <rect x="75" y="45" width="15" height="25" fill="currentColor" />
                      <rect x="45" y="55" width="20" height="15" fill="currentColor" />
                      <rect x="40" y="80" width="15" height="15" fill="currentColor" />
                      <rect x="75" y="80" width="20" height="10" fill="currentColor" />
                    </svg>

                    <div className="absolute inset-0 m-auto w-10 h-10 bg-white border border-gray-150 rounded flex items-center justify-center text-[8px] font-black text-blue-800 uppercase shadow-3xs">
                      QRIS
                    </div>
                  </div>

                  {/* Pricing details & countdown */}
                  <div className="space-y-1 text-center font-sans">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Nominal Pembayaran</span>
                    <span className="text-md font-bold text-slate-800 block">{formatRupiah(activePaymentTx.total_harga)}</span>
                    <span className="text-xs font-semibold text-rose-500 block">
                      Sisa Waktu Bayar: {minutes}:{seconds}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Simulate Callback */}
            {qrisPaidStatus !== 'success' && (
              <div className="space-y-2 pt-2">
                <button
                  id="btn-confirm-simulated-qris"
                  onClick={handleQRISPaymentSuccess}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Saya Sudah Scan & Bayar Sukses
                </button>
                <button
                  id="btn-cancel-qris"
                  onClick={() => setActivePaymentTx(null)}
                  className="w-full py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal Pembayaran
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Edit Modal in Active Screen */}
      {showProfileModal && (
        <div id="modal-edit-profile" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-150">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Ubah Alamat & Nomor HP</h3>
              <p className="text-[11px] text-gray-400">Modifikasi data profil pelanggan local Anda.</p>
            </div>

            {profileError && (
              <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold rounded-xl">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs font-semibold rounded-xl">
                ✓ Profil berhasil diperbarui!
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Nomor HP (WhatsApp) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081235678901"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Alamat Rumah *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Isikan alamat rumah lengkap Anda..."
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-505 hover:bg-slate-50 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSavingProfile ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
