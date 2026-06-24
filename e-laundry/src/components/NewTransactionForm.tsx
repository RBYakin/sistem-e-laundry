import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Trash2, UserPlus, CreditCard, DollarSign, ArrowRight, User } from 'lucide-react';
import { Product, User as CustomerUser, TransactionItem } from '../types';

interface NewTransactionFormProps {
  products: Product[];
  customers: CustomerUser[];
  onAddTransaction: (data: {
    pelanggan_id: string | null;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    items: { product_id: string; qty: number }[];
    metode_pembayaran: 'qris' | 'cod';
    status_pembayaran: 'belum_bayar' | 'lunas';
  }) => void;
  loading: boolean;
}

export default function NewTransactionForm({ products, customers, onAddTransaction, loading }: NewTransactionFormProps) {
  // Mode: Registered customer ('member') vs walk-in ('umum')
  const [customerMode, setCustomerMode] = useState<'member' | 'umum'>('umum');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Guest inputs
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');

  // Selected services inside cart
  const [cart, setCart] = useState<{ product_id: string; qty: number }[]>([
    { product_id: '', qty: 1 } // Initial empty row
  ]);

  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'cod'>('cod');
  const [paymentStatus, setPaymentStatus] = useState<'belum_bayar' | 'lunas'>('belum_bayar');

  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fill customer details when registered member is chosen
  useEffect(() => {
    if (customerMode === 'member' && selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        setGuestName(cust.nama);
        setGuestPhone(cust.no_telp);
        setGuestAddress(cust.alamat);
      }
    } else if (customerMode === 'member' && !selectedCustomerId) {
      setGuestName('');
      setGuestPhone('');
      setGuestAddress('');
    }
  }, [customerMode, selectedCustomerId, customers]);

  // Handle cart mutation
  const handleUpdateCartItem = (index: number, key: 'product_id' | 'qty', value: any) => {
    const updated = [...cart];
    if (key === 'qty') {
      updated[index].qty = Math.max(0.1, Number(value));
    } else {
      updated[index].product_id = value;
    }
    setCart(updated);
  };

  const handleAddCartItem = () => {
    setCart([...cart, { product_id: '', qty: 1 }]);
  };

  const handleRemoveCartItem = (index: number) => {
    if (cart.length > 1) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      setCart([{ product_id: '', qty: 1 }]);
    }
  };

  // Compile calculations
  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      if (!item.product_id) return sum;
      const prod = products.find(p => p.id === item.product_id);
      if (!prod) return sum;
      return sum + (prod.harga * item.qty);
    }, 0);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Field safety checks
    const nameVal = guestName.trim();
    const phoneVal = guestPhone.trim();
    const addressVal = guestAddress.trim();

    if (!nameVal) {
      setErrorMessage('Nama pelanggan wajib diisi!');
      return;
    }
    if (!/^[a-zA-Z\s]{2,50}$/.test(nameVal)) {
      setErrorMessage('Format Nama salah! Harus berupa huruf & spasi sepanjang 2-50 karakter.');
      return;
    }

    if (!phoneVal) {
      setErrorMessage('Nomor telepon pelanggan wajib diisi!');
      return;
    }
    if (!/^[0-9]{10,13}$/.test(phoneVal)) {
      setErrorMessage('Format Nomor HP salah! Wajib berisi digit angka saja sepanjang 10-13 digit.');
      return;
    }

    if (!addressVal) {
      setErrorMessage('Alamat rumah pelanggan wajib diisi!');
      return;
    }
    if (addressVal.length < 5) {
      setErrorMessage('Format Alamat salah! Harus diisi minimal 5 karakter.');
      return;
    }

    const validItems = cart.filter(item => item.product_id !== '');
    if (validItems.length === 0) {
      setErrorMessage('Pilih minimal satu layanan laundry!');
      return;
    }

    onAddTransaction({
      pelanggan_id: customerMode === 'member' ? selectedCustomerId : null,
      customer_name: guestName,
      customer_phone: guestPhone,
      customer_address: guestAddress || 'Walk-in Guest',
      items: validItems,
      metode_pembayaran: paymentMethod,
      status_pembayaran: paymentStatus
    });

    // Reset Form on successful checkout
    // Reset state values
    setCart([{ product_id: '', qty: 1 }]);
    setGuestName('');
    setGuestPhone('');
    setGuestAddress('');
    setSelectedCustomerId('');
    setCustomerMode('umum');
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div id="new-tx-form-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Checkout Selection Panel */}
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          
          {/* Section 1: Customer profiling */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-50">
              <h2 className="text-md font-bold text-gray-800 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                Data Pelanggan
              </h2>
              
              {/* Toggle member vs walkin guest */}
              <div className="inline-flex rounded-lg p-1 bg-gray-100">
                <button
                  type="button"
                  id="btn-mode-umum"
                  onClick={() => setCustomerMode('umum')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    customerMode === 'umum' ? 'bg-white text-gray-800 shadow-3xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Pelanggan Umum (Walk-in)
                </button>
                <button
                  type="button"
                  id="btn-mode-member"
                  onClick={() => setCustomerMode('member')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    customerMode === 'member' ? 'bg-white text-gray-800 shadow-3xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Member Terdaftar
                </button>
              </div>
            </div>

            {/* Render conditional selection */}
            {customerMode === 'member' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500">Cari & Pilih Member</label>
                <select
                  id="checkout-member-select"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 bg-white"
                >
                  <option value="">-- Cari Nama Member --</option>
                  {customers
                    .filter(c => c.role === 'pelanggan')
                    .map(cust => (
                      <option key={cust.id} value={cust.id}>
                        {cust.nama} ({cust.no_telp})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Nama Pelanggan *</label>
                <input
                  id="checkout-cust-name"
                  type="text"
                  placeholder="Contoh: Ny Susi"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  disabled={customerMode === 'member'}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">No. Telepon (WhatsApp) *</label>
                <input
                  id="checkout-cust-phone"
                  type="text"
                  placeholder="Contoh: 0812XXXXXXXX"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={customerMode === 'member'}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-gray-500">Alamat Rumah</label>
                <textarea
                  id="checkout-cust-address"
                  placeholder="Alamat penjemputan/pengantaran pakaian..."
                  value={guestAddress}
                  onChange={(e) => setGuestAddress(e.target.value)}
                  disabled={customerMode === 'member'}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Services / Laundry checkout listing items */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-50">
              <h2 className="text-md font-bold text-gray-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-500" />
                Layanan & Item Cucian
              </h2>
              <button
                type="button"
                id="btn-add-item-checkout"
                onClick={handleAddCartItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors border border-blue-100"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Layanan
              </button>
            </div>

            {/* List selected rows */}
            <div className="space-y-3">
              {cart.map((cartItem, idx) => {
                const selectedProd = products.find(p => p.id === cartItem.product_id);
                const showUnit = selectedProd ? selectedProd.satuan : 'kg';

                return (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                    {/* Choose product */}
                    <div className="flex-1">
                      <select
                        id={`cart-product-select-${idx}`}
                        value={cartItem.product_id}
                        onChange={(e) => handleUpdateCartItem(idx, 'product_id', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-hidden focus:border-blue-500 bg-white"
                      >
                        <option value="">-- Pilih Jenis Layanan --</option>
                        {products.map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.nama} ({formatRupiah(prod.harga)} / {prod.satuan})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Weight / Qty Count */}
                    <div className="w-full sm:w-32 flex items-center gap-1.5">
                      <input
                        id={`cart-qty-input-${idx}`}
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={cartItem.qty}
                        onChange={(e) => handleUpdateCartItem(idx, 'qty', e.target.value)}
                        className="w-full text-center text-sm border border-gray-200 rounded-lg p-2 focus:outline-hidden focus:border-blue-500 bg-white font-semibold"
                        placeholder="Jumlah"
                      />
                      <span className="text-xs text-gray-500 font-bold uppercase min-w-[30px]">{showUnit}</span>
                    </div>

                    {/* Simple Subtotal calculation */}
                    <div className="w-full sm:w-32 text-right hidden sm:block font-mono text-sm font-semibold text-gray-700">
                      {selectedProd ? formatRupiah(selectedProd.harga * cartItem.qty) : 'Rp 0'}
                    </div>

                    {/* Remove row */}
                    <button
                      type="button"
                      id={`btn-remove-cart-${idx}`}
                      onClick={() => handleRemoveCartItem(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </div>

      {/* Bill Summary Right Panel */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-2xs space-y-6 flex flex-col justify-between h-full">
          <div>
            <h3 className="text-md font-bold text-gray-800 pb-3 border-b border-gray-100">Rincian Pembayaran</h3>

            <div className="py-4 space-y-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal Layanan:</span>
                <span className="font-semibold text-gray-700">{formatRupiah(calculateTotal())}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Pajak & Biaya Admin:</span>
                <span className="font-semibold text-green-600">Gratis (Rp 0)</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-800">Total Biaya:</span>
                <span className="text-lg font-extrabold text-blue-600 font-sans">{formatRupiah(calculateTotal())}</span>
              </div>
            </div>

            {/* Error alerts if fields missing */}
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold mb-3 border border-red-100">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Choose payment method */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="btn-method-cod"
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold border rounded-lg transition-all ${
                      paymentMethod === 'cod' 
                        ? 'border-blue-600 bg-blue-50/50 text-blue-600' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    COD (Tunai)
                  </button>
                  <button
                    type="button"
                    id="btn-method-qris"
                    onClick={() => setPaymentMethod('qris')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold border rounded-lg transition-all ${
                      paymentMethod === 'qris' 
                        ? 'border-blue-600 bg-blue-50/50 text-blue-600' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    QRIS (Digital)
                  </button>
                </div>
              </div>

              {/* Status input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500">Status Awal Pelunasan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('belum_bayar')}
                    className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all ${
                      paymentStatus === 'belum_bayar' 
                        ? 'border-amber-500 bg-amber-50/50 text-amber-700' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Belum Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('lunas')}
                    className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all ${
                      paymentStatus === 'lunas' 
                        ? 'border-green-600 bg-green-50/50 text-green-700' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Lunas Sekejap
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              id="btn-process-checkout"
              type="button"
              onClick={handleFormSubmit}
              disabled={loading || calculateTotal() === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              Cetak Nota & Proses Order
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
