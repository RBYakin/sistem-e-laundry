import React, { useState, useEffect, startTransition } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  FileText,
  CreditCard,
  LogOut,
  Menu,
  X,
  PlusCircle,
  FolderLock,
  Lock,
  UserCheck,
  Activity,
  UserPlus
} from 'lucide-react';

import { Transaction, Product, InventoryItem, User, DashboardStats } from './types';
import DashboardView from './components/DashboardView';
import TransactionView from './components/TransactionView';
import NewTransactionForm from './components/NewTransactionForm';
import StockView from './components/StockView';
import MonthlyReportView from './components/MonthlyReportView';
import CustomerOrderView from './components/CustomerOrderView';
import ReceiptModal from './components/ReceiptModal';
import PegawaiCRUDView from './components/PegawaiCRUDView';

type ActiveTab = 'dashboard' | 'checkout' | 'transactions' | 'products' | 'stock' | 'report' | 'customer' | 'pegawai';

export default function App() {
  // Authentication Context state
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('laundry_user');
    return cached ? JSON.parse(cached) : null;
  });

  // Access roles
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginRegister, setShowLoginRegister] = useState(false);

  // General App states
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);

  // Modals & temporary views
  const [currentReceiptTx, setCurrentReceiptTx] = useState<Transaction | null>(null);
  const [showRegisterMemberModal, setShowRegisterMemberModal] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New product form
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdType, setNewProdType] = useState<'kiloan' | 'satuan'>('kiloan');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('kg');
  const [newProdDesc, setNewProdDesc] = useState('');

  // Register User fields
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regError, setRegError] = useState('');

  // Auto route view dependent on customer vs admin
  useEffect(() => {
    if (user) {
      if (user.role === 'pelanggan') {
        setActiveTab('customer');
      } else {
        setActiveTab('dashboard');
      }
      fetchAllData();
    }
  }, [user]);

  // General load data wrapper
  const fetchAllData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Stats
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Transactions (With query filters if customer)
      const txUrl = user.role === 'pelanggan' 
        ? `/api/transactions?pelangganId=${user.id}` 
        : '/api/transactions';
      const txRes = await fetch(txUrl);
      if (txRes.ok) {
        const txData = await txRes.json();
        // Sort newest transactions first
        setTransactions(txData.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)));
      }

      // 3. Fetch products
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // 4. Fetch inventory items
      const invRes = await fetch('/api/inventory');
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }

      // 5. Fetch members / users (only for employee/admin to register orders)
      if (user.role !== 'pelanggan') {
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setCustomers(usersData);
        }
      }
    } catch (err) {
      console.error('Failed to communicate with laundry RESTful servers', err);
    }
  };

  // Auth processing
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('laundry_user', JSON.stringify(data.user));
        setUser(data.user);
        // Clean fields
        setUsername('');
        setPassword('');
      } else {
        setLoginError(data.message || 'Login gagal, periksa username & password!');
      }
    } catch (err) {
      setLoginError('Koneksi database lokal / server terganggu.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('laundry_user');
    setUser(null);
  };

  const handleUpdateCurrentUser = (updatedUser: User) => {
    localStorage.setItem('laundry_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Cashier checkout action
  const handleCheckoutNewOrder = async (orderPayload: any) => {
    try {
      setLoadingActionId('checkout');
      const isPelanggan = user?.role === 'pelanggan';
      const cashierId = isPelanggan ? 'online' : (user?.id || 'online');
      const cashierName = isPelanggan ? 'Online Orders' : (user?.nama || 'Online Orders');

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderPayload,
          cashier_id: cashierId,
          cashier_name: cashierName
        })
      });
      if (res.ok) {
        const newTx = await res.json();
        // Insert and refresh
        setTransactions(prev => [newTx, ...prev]);
        fetchAllData(); // Refresh stock triggers
        // Automatic Nota Print Trigger!
        setCurrentReceiptTx(newTx);
      } else {
        alert('Gagal membuat transaksi baru.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActionId(null);
    }
  };

  // Update transaction status (masuk -> proses -> selesai -> diambil)
  const handleUpdateStatus = async (txId: string, nextStatus: 'masuk' | 'proses' | 'selesai' | 'diambil') => {
    try {
      setLoadingActionId(txId);
      const res = await fetch(`/api/transactions/${txId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updatedTx = await res.json();
        setTransactions(prev => prev.map(t => t.id === txId ? updatedTx : t));
        fetchAllData();
      } else {
        alert('Gagal memperbaharui status cucian.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActionId(null);
    }
  };

  // Manually confirm payment as Cashier / Admin (COD)
  const handleConfirmPayment = async (txId: string, method?: 'qris' | 'cod') => {
    try {
      setLoadingActionId(txId);
      const res = await fetch(`/api/transactions/${txId}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metode_pembayaran: method })
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(prev => prev.map(t => t.id === txId ? data.transaction : t));
        fetchAllData();
      } else {
        alert('Gagal mengkonfirmasi pembayaran.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActionId(null);
    }
  };

  // Digital Mobile payment QRIS Simulator complete trigger
  const handleTriggerQRISPayment = async (txId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/transactions/${txId}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metode_pembayaran: 'qris' })
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(prev => prev.map(t => t.id === txId ? data.transaction : t));
        fetchAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Inventory/Stock modifier
  const handleUpdateStockQty = async (id: string, newQty: number, option?: { restock?: boolean }) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stok: newQty, restock: option?.restock })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNewInventoryItem = async (payload: { nama_barang: string; stok: number; satuan: string; deskripsi: string }) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Products manager (Add service)
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: newProdName,
          jenis: newProdType,
          harga: Number(newProdPrice),
          satuan: newProdUnit,
          deskripsi: newProdDesc
        })
      });
      if (res.ok) {
        // Reset inputs
        setNewProdName('');
        setNewProdPrice('');
        setNewProdUnit('kg');
        setNewProdDesc('');
        setShowProductModal(false);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete product / service
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Apakah anda yakin ingin menghapus layanan ini?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Custom Monthly Report handler for the sub-component state loader
  const handleFetchMonthlyReport = async (monthStr: string) => {
    const res = await fetch(`/api/report/monthly?date=${monthStr}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Could not fetch report');
  };

  // Register modern customer account
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regUsername || !regPassword || !regName) {
      setRegError('Username, Password, dan Nama Lengkap wajib diisi!');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          nama: regName,
          no_telp: regPhone,
          alamat: regAddress,
          role: 'pelanggan'
        })
      });
      if (res.ok) {
        // Reset states
        setRegUsername('');
        setRegPassword('');
        setRegName('');
        setRegPhone('');
        setRegAddress('');
        setShowRegisterMemberModal(false);
        fetchAllData();
        alert('Pendaftaran Member Berhasil! Sekarang pelanggan bisa login menggunakan username tersebut.');
      } else {
        const err = await res.json();
        setRegError(err.message || 'Pendaftaran gagal.');
      }
    } catch (err) {
      setRegError('Koneksi terganggu.');
    }
  };

  // Render Login state if unauthenticated
  if (!user) {
    const handleCustomerSignUpSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setRegError('');

      const nameVal = regName.trim();
      const usernameVal = regUsername.trim().toLowerCase();
      const phoneVal = regPhone.trim();
      const addressVal = regAddress.trim();

      if (!nameVal || !usernameVal || !regPassword || !phoneVal || !addressVal) {
        setRegError('Semua kolom wajib diisi!');
        return;
      }

      if (!/^[a-zA-Z\s]{2,50}$/.test(nameVal)) {
        setRegError('Format Nama salah! Harus berupa huruf & spasi sepanjang 2-50 karakter.');
        return;
      }

      if (!/^[0-9]{10,13}$/.test(phoneVal)) {
        setRegError('Format Nomor HP salah! Wajib berisi digit angka saja sepanjang 10-13 digit.');
        return;
      }

      if (addressVal.length < 5) {
        setRegError('Format Alamat salah! Diisi alamat minimal 5 karakter.');
        return;
      }

      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameVal,
            password: regPassword,
            nama: nameVal,
            no_telp: phoneVal,
            alamat: addressVal,
            role: 'pelanggan'
          })
        });
        if (res.ok) {
          alert('Pendaftaran Pelanggan Berhasil! Silakan masuk menggunakan username tersebut.');
          setShowLoginRegister(false);
          setUsername(usernameVal);
          setRegName('');
          setRegUsername('');
          setRegPassword('');
          setRegPhone('');
          setRegAddress('');
        } else {
          const err = await res.json();
          setRegError(err.message || 'Pendaftaran gagal.');
        }
      } catch (err) {
        setRegError('Koneksi terganggu. Gagal mendaftar.');
      }
    };

    return (
      <div id="login-layout-wrapper" className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl p-8 border border-gray-150 shadow-2xl space-y-6 flex flex-col justify-between">
          
          {!showLoginRegister ? (
            <>
              {/* LOGIN FORM VIEW */}
              <div className="text-center space-y-2">
                <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full w-fit mx-auto select-none">
                  E-Laundry Smart System
                </span>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Masuk Akun Laundry</h1>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">Masuk mengunakan akun Anda untuk melakukan transaksi, cek antrian atau memantau stok material.</p>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg">
                  ⚠️ {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Username</label>
                  <input
                    id="login-username"
                    type="text"
                    placeholder="Contoh: admin / pegawai / budi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Masukkan password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loginLoading ? 'Sedang Memasukkan...' : 'Masuk Aplikasi'}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setShowLoginRegister(true);
                    setRegError('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-500 hover:underline"
                >
                  Belum punya akun? Daftar sebagai Pelanggan Baru
                </button>
              </div>
            </>
          ) : (
            <>
              {/* REGISTRATION FORM VIEW (FOR CUSTOMERS ONLY) */}
              <div className="text-center space-y-2">
                <span className="bg-emerald-50 text-emerald-705 text-emerald-700 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full w-fit mx-auto select-none">
                  Pelanggan Baru
                </span>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pendaftaran Pelanggan</h1>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">Daftarkan akun member laundry instan Anda untuk mulai melakukan rincian order online.</p>
              </div>

              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg">
                  ⚠️ {regError}
                </div>
              )}

              <form onSubmit={handleCustomerSignUpSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Nama Lengkap Anda *</label>
                  <input
                    id="signup-cust-name"
                    type="text"
                    placeholder="Contoh: Budi Gunawan (Tanpa Simbol & Angka)"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Username Login *</label>
                    <input
                      id="signup-username"
                      type="text"
                      placeholder="Contoh: budisign"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-hidden focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Password Login *</label>
                    <input
                      id="signup-password"
                      type="password"
                      placeholder="Masukkan sandi..."
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-hidden focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">No. Telp (WhatsApp) *</label>
                  <input
                    id="signup-cust-phone"
                    type="text"
                    placeholder="Contoh: 081234567890 (Angka saja)"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Alamat Tempat Tinggal Anda *</label>
                  <textarea
                    id="signup-cust-address"
                    placeholder="Alamat penjemputan utama..."
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  id="btn-signup-submit"
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-505 active:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Daftar & Buat Akun
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setShowLoginRegister(false);
                    setRegError('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline"
                >
                  Sudah punya akun? Kembali untuk Masuk
                </button>
              </div>
            </>
          )}

          {/* Training guidelines quick instructions */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-[11px] text-gray-500 space-y-1.5">
            <span className="font-bold text-gray-700 flex items-center gap-1">
              💡 Akun Percobaan (Demo):
            </span>
            <ul className="list-disc list-inside space-y-0.5">
              <li><span className="font-semibold text-gray-600">Admin:</span> admin / admin123</li>
              <li><span className="font-semibold text-gray-600">Pegawai:</span> pegawai / pegawai123</li>
              <li><span className="font-semibold text-gray-600">Pelanggan:</span> budi / budi123 or register yours!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Mobile menu links rendering helper
  const SidebarLinks = () => {
    return (
      <nav id="nav-sidebar-layout" className="flex-1 space-y-2 py-4">
        {user.role === 'admin' && (
          <>
            <button
              id="btn-tab-dashboard"
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-xs md:text-sm font-bold rounded-xl transition-all border-l-4 ${
                activeTab === 'dashboard' 
                  ? 'bg-indigo-800/50 border-indigo-400 text-white shadow-xs' 
                  : 'border-transparent text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              Overview Dashboard
            </button>

            <button
              id="btn-tab-pegawai"
              onClick={() => { setActiveTab('pegawai'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-xs md:text-sm font-bold rounded-xl transition-all border-l-4 ${
                activeTab === 'pegawai' 
                  ? 'bg-indigo-800/50 border-indigo-400 text-white shadow-xs' 
                  : 'border-transparent text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              Kelola Pegawai (CRUD)
            </button>

            <button
              id="btn-tab-products"
              onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-xs md:text-sm font-bold rounded-xl transition-all border-l-4 ${
                activeTab === 'products' 
                  ? 'bg-indigo-800/50 border-indigo-400 text-white shadow-xs' 
                  : 'border-transparent text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
              }`}
            >
              <FolderLock className="w-4 h-4 shrink-0" />
              Konfigurasi Layanan
            </button>

            <button
              id="btn-tab-report"
              onClick={() => { setActiveTab('report'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-xs md:text-sm font-bold rounded-xl transition-all border-l-4 ${
                activeTab === 'report' 
                  ? 'bg-indigo-800/50 border-indigo-400 text-white shadow-xs' 
                  : 'border-transparent text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              Laporan Pemasukan
            </button>
          </>
        )}

        {user.role === 'pegawai' && (
          <>
            <button
              id="btn-tab-dashboard"
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-xs md:text-sm font-bold rounded-xl transition-all border-l-4 ${
                activeTab === 'dashboard' 
                  ? 'bg-indigo-800/50 border-indigo-400 text-white shadow-xs' 
                  : 'border-transparent text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              Overview Dashboard
            </button>

            <button
              id="btn-tab-checkout"
              onClick={() => { setActiveTab('checkout'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-xs md:text-sm font-bold rounded-xl transition-all border-l-4 ${
                activeTab === 'checkout' 
                  ? 'bg-indigo-800/50 border-indigo-400 text-white shadow-xs' 
                  : 'border-transparent text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              Kasir (Order Baru)
            </button>

            <button
              id="btn-tab-transactions"
              onClick={() => { setActiveTab('transactions'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-xs md:text-sm font-bold rounded-xl transition-all border-l-4 ${
                activeTab === 'transactions' 
                  ? 'bg-indigo-800/50 border-indigo-400 text-white shadow-xs' 
                  : 'border-transparent text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              Kelola Transaksi
            </button>

          </>
        )}

        {user.role === 'pelanggan' && (
          <button
            onClick={() => { setActiveTab('customer'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-3 text-xs md:text-sm font-bold rounded-xl transition-all border-l-4 ${
              activeTab === 'customer' 
                ? 'bg-indigo-800/50 border-indigo-400 text-white shadow-xs' 
                : 'border-transparent text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            Cucian & Tagihan Saya
          </button>
        )}
      </nav>
    );
  };

  return (
    <div id="applet-viewport-root" className="min-h-screen bg-slate-50 flex flex-col md:flex-row print:bg-white text-slate-800 font-sans">
      
      {/* 1. SIDEBAR NAVIGATION CONTROLS (HIDES ON PRINT OR MOBILE VIEWPORTS) */}
      <aside className="w-64 bg-indigo-950 hidden md:flex flex-col flex-none print:hidden p-6 text-white shrink-0 shadow-xl">
        {/* Branding header */}
        <div className="mb-8 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl text-white">
            E
          </div>
          <span className="text-xl font-bold tracking-tight text-white">E-Laundry</span>
        </div>

        {/* Sidebar primary nav items */}
        <SidebarLinks />

        {/* User Card & Log out */}
        <div className="mt-auto pt-4 border-t border-indigo-900/60 space-y-3">
          <div className="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/30 font-bold text-white text-sm flex items-center justify-center">
              {user.nama.charAt(0)}
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-white block truncate">{user.nama}</span>
              <span className="text-[10px] text-indigo-300 font-bold uppercase block">{user.role}</span>
            </div>
          </div>

          <button
            id="btn-user-logout"
            onClick={handleLogout}
            className="w-full py-2 bg-indigo-900/40 hover:bg-rose-950/60 hover:text-rose-200 text-indigo-350 hover:border-rose-900/50 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-indigo-800/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Akun
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP NAVBAR */}
      <header className="bg-indigo-950 border-b border-indigo-900 p-4 flex items-center justify-between md:hidden print:hidden text-white">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-500 rounded-md flex items-center justify-center font-bold text-sm text-white">E</div>
          <span className="font-bold text-sm tracking-tight">E-Laundry</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-mobile-menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-indigo-300 hover:text-white rounded-lg hover:bg-indigo-900"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu Layer */}
      {mobileMenuOpen && (
        <div className="bg-indigo-950/95 border-b border-indigo-900 py-2 md:hidden animate-fade-in print:hidden text-white px-4">
          <SidebarLinks />
          <div className="p-4 border-t border-indigo-900 flex items-center justify-between">
            <span className="text-xs text-indigo-300 font-bold">Role: <span className="uppercase text-indigo-400">{user.role}</span></span>
            <button
              onClick={handleLogout}
              className="py-1 px-3 bg-rose-950/40 hover:bg-rose-900 border border-rose-950 text-rose-200 text-xs font-bold rounded-lg transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <main id="main-workspace" className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0">
        
        {/* Render Tab Screens */}
        {user.role !== 'pelanggan' && activeTab === 'dashboard' && stats && (
          <DashboardView
            stats={stats}
            loading={loadingActionId === 'stats'}
            onRefresh={fetchAllData}
            onNavigateToStock={() => { if (user?.role === 'admin') setActiveTab('stock'); }}
            inventory={inventory}
          />
        )}

        {user.role !== 'pelanggan' && activeTab === 'checkout' && (
          <NewTransactionForm
            products={products}
            customers={customers}
            onAddTransaction={handleCheckoutNewOrder}
            loading={loadingActionId === 'checkout'}
          />
        )}

        {user.role !== 'pelanggan' && activeTab === 'transactions' && (
          <TransactionView
            transactions={transactions}
            currentUser={user}
            onUpdateStatus={handleUpdateStatus}
            onConfirmPayment={handleConfirmPayment}
            onOpenReceipt={setCurrentReceiptTx}
            onRefresh={fetchAllData}
            loadingId={loadingActionId}
          />
        )}

        {user.role === 'admin' && activeTab === 'stock' && (
          <StockView
            inventory={inventory}
            currentUser={user}
            onUpdateStock={handleUpdateStockQty}
            onAddNewItem={handleAddNewInventoryItem}
            loading={loadingActionId === 'inventory'}
          />
        )}

        {/* Product Management Dashboard layout */}
        {user.role === 'admin' && activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Konfigurasi Layanan Laundry</h1>
                <p className="text-sm text-gray-500">Sesuaikan jenis produk, satuan (kg / pcs), dan tarif pencucian.</p>
              </div>

              <button
                id="btn-register-new-product"
                onClick={() => setShowProductModal(true)}
                className="flex items-center gap-1.5 justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-xs"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                Tambah Layanan Baru
              </button>
            </div>

            {/* Product card views */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(prod => (
                <div key={prod.id} className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        prod.jenis === 'kiloan' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}>
                        {prod.jenis}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-400">ID: {prod.id}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">{prod.nama}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2 min-h-[32px]">{prod.deskripsi || 'Layanan laundry premium.'}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-blue-600 font-sans">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(prod.harga)}
                      <span className="text-xs font-normal text-gray-400"> / {prod.satuan}</span>
                    </span>

                    <button
                      id={`btn-del-prod-${prod.id}`}
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="text-xs font-bold text-rose-500 hover:bg-rose-50 p-1 px-2.5 rounded transition-all border border-transparent hover:border-rose-100"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {user.role === 'admin' && activeTab === 'report' && (
          <MonthlyReportView onFetchReport={handleFetchMonthlyReport} />
        )}

        {user.role === 'admin' && activeTab === 'pegawai' && (
          <PegawaiCRUDView
            currentUser={user}
            onRefresh={fetchAllData}
          />
        )}

        {user.role === 'pelanggan' && activeTab === 'customer' && (
          <CustomerOrderView
            transactions={transactions}
            products={products}
            currentUser={user}
            onTriggerQRISPayment={handleTriggerQRISPayment}
            onOpenReceipt={setCurrentReceiptTx}
            onAddOnlineTransaction={handleCheckoutNewOrder}
            onUpdateUser={handleUpdateCurrentUser}
            loading={loadingActionId !== null}
          />
        )}

      </main>

      {/* 4. DIALOGS & OVERLAY POPUPS */}

      {/* Modal 1: Auto Print Thermal nota Receipt popup */}
      {currentReceiptTx && (
        <ReceiptModal
          transaction={currentReceiptTx}
          onClose={() => setCurrentReceiptTx(null)}
        />
      )}

      {/* Modal 2: Create new Product service Popup sheet */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Tambah Layanan Baru</h3>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Nama Layanan *</label>
                <input
                  id="add-prod-name"
                  type="text"
                  placeholder="Contoh: Cuci Karpet Tebal"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">Jenis Layanan</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setNewProdType('kiloan'); setNewProdUnit('kg'); }}
                      className={`flex-1 py-1.5 border text-xs font-bold rounded-lg ${
                        newProdType === 'kiloan' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      Kiloan (kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewProdType('satuan'); setNewProdUnit('pcs'); }}
                      className={`flex-1 py-1.5 border text-xs font-bold rounded-lg ${
                        newProdType === 'satuan' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      Satuan (pcs)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tarif Harga (Rp) *</label>
                  <input
                    id="add-prod-price"
                    type="number"
                    placeholder="Contoh: 15000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Nama Satuan (UoM) *</label>
                <input
                  id="add-prod-unit"
                  type="text"
                  placeholder="kg / pcs / lembar / meter / pasang"
                  value={newProdUnit}
                  onChange={(e) => setNewProdUnit(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Deskripsi Ringkas</label>
                <textarea
                  id="add-prod-desc"
                  placeholder="Detil pengerjaan laundry..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  id="btn-close-prod-modal"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-prod"
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-sm font-bold"
                >
                  Simpan Layanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Register New Member Account (Admin / Cashier capability) */}
      {showRegisterMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Pendaftaran Member Laundry Baru</h3>

            {regError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-100">
                ⚠️ {regError}
              </div>
            )}

            <form onSubmit={handleRegisterMember} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Nama Lengkap Pelanggan *</label>
                <input
                  id="reg-cust-name"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 font-mono">Username Login *</label>
                  <input
                    id="reg-cust-username"
                    type="text"
                    placeholder="budicantik"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Password Login *</label>
                  <input
                    id="reg-cust-password"
                    type="password"
                    placeholder="budi123"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">No. Telp (WhatsApp) *</label>
                <input
                  id="reg-cust-phone"
                  type="text"
                  placeholder="Contoh: 0857XXXXXXXX"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Alamat Tempat Tinggal</label>
                <textarea
                  id="reg-cust-address"
                  placeholder="Alamat lengkap untuk penjemputan baju..."
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  id="btn-close-reg-modal"
                  onClick={() => setShowRegisterMemberModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-reg-member"
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-xs"
                >
                  Registrasikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
