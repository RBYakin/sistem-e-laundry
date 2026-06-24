import React, { useState } from 'react';
import { Package, Plus, Edit, AlertTriangle, RefreshCw, Layers, Check, CheckSquare } from 'lucide-react';
import { InventoryItem } from '../types';

interface StockViewProps {
  inventory: InventoryItem[];
  currentUser: { id: string; role: 'admin' | 'pegawai' | 'pelanggan' };
  onUpdateStock: (id: string, newQty: number, option?: { restock?: boolean }) => void;
  onAddNewItem: (data: { nama_barang: string; stok: number; satuan: string; deskripsi: string }) => void;
  loading: boolean;
}

export default function StockView({ inventory, currentUser, onUpdateStock, onAddNewItem, loading }: StockViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  // Add Item States
  const [newName, setNewName] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [newUnit, setNewUnit] = useState('liter');
  const [newDesc, setNewDesc] = useState('');
  
  const [errorText, setErrorText] = useState('');

  const submitNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!newName.trim() || !newUnit.trim()) {
      setErrorText('Nama barang dan satuan wajib diisi!');
      return;
    }

    onAddNewItem({
      nama_barang: newName,
      stok: Number(newStock),
      satuan: newUnit,
      deskripsi: newDesc
    });

    // Reset fields
    setNewName('');
    setNewStock('0');
    setNewUnit('liter');
    setNewDesc('');
    setShowAddModal(false);
  };

  const handleApplyStockEdit = (id: string) => {
    const parsed = parseFloat(editQty);
    if (isNaN(parsed) || parsed < 0) return;
    onUpdateStock(id, parsed, { restock: true });
    setEditingItemId(null);
    setEditQty('');
  };

  return (
    <div id="stock-manager-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Manajemen Stok Barang</h1>
          <p className="text-sm text-gray-500">Pantau bahan baku deterjen, pewangi, plastik kemasan, dan pita penanda.</p>
        </div>

        {currentUser.role !== 'pelanggan' && (
          <button
            id="btn-open-add-stock-modal"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4.5 h-4.5" />
            Tambah Barang Baru
          </button>
        )}
      </div>

      {/* Grid displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map((item) => {
          const isLow = item.stok <= 15;
          const isEditing = editingItemId === item.id;
          const restockDateStr = new Date(item.restock_date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={item.id}
              id={`stock-item-${item.id}`}
              className={`bg-white rounded-xl border p-5 shadow-3xs flex flex-col justify-between space-y-4 transition-all ${
                isLow ? 'border-amber-200 bg-amber-50/10' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{item.nama_barang}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2 min-h-[32px]">{item.deskripsi || 'Tidak ada deskripsi.'}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${isLow ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                {/* Status alerts */}
                {isLow && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-100/70 text-amber-800 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Stok Kritis
                  </div>
                )}
              </div>

              {/* Stock Quantity Details */}
              <div className="space-y-2 pt-2 border-t border-gray-50 flex flex-col justify-end">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-400 font-bold">Total Ketersediaan:</span>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        id={`input-edit-stock-${item.id}`}
                        type="number"
                        step="0.1"
                        min="0"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="w-20 text-center border border-gray-300 rounded-sm p-1 text-xs font-bold"
                        placeholder={String(item.stok)}
                      />
                      <button
                        id={`btn-apply-stock-${item.id}`}
                        onClick={() => handleApplyStockEdit(item.id)}
                        className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                        title="Simpan"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-lg font-extrabold text-slate-800">
                      {item.stok} <span className="text-xs font-medium text-gray-400 uppercase">{item.satuan}</span>
                    </span>
                  )}
                </div>

                {/* Last restock info */}
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Pembaruan Terakhir:</span>
                  <span className="font-medium">{restockDateStr}</span>
                </div>

                {/* Edit options */}
                {currentUser.role !== 'pelanggan' && !isEditing && (
                  <div className="pt-2 flex justify-end gap-1.5 border-t border-transparent">
                    <button
                      onClick={() => {
                        setEditingItemId(item.id);
                        setEditQty(String(item.stok));
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors text-xs font-bold flex items-center gap-1 border border-transparent hover:border-blue-100"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adjust Stok
                    </button>
                    <button
                      onClick={() => onUpdateStock(item.id, item.stok + 10, { restock: true })}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-md transition-colors text-xs font-bold flex items-center gap-1 border border-transparent hover:border-emerald-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> +10 Restock
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Item Modal Popup Sheet */}
      {showAddModal && (
        <div id="modal-add-stock" className="scale-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Registrasi Bahan / Barang Baru</h3>
            
            {errorText && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-100">
                ⚠️ {errorText}
              </div>
            )}

            <form onSubmit={submitNewItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Nama Bahan / Barang *</label>
                <input
                  id="add-stock-name"
                  type="text"
                  placeholder="Contoh: Pewangi Serat Vanilla"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Stok Awal</label>
                  <input
                    id="add-stock-qty"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Satuan *</label>
                  <select
                    id="add-stock-unit"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 bg-white shadow-3xs"
                  >
                    <option value="liter">Liter</option>
                    <option value="botol">Botol</option>
                    <option value="lembar">Lembar (Plastik)</option>
                    <option value="roll">Roll (Tag)</option>
                    <option value="pack">Pack</option>
                    <option value="pcs">Pcs</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Keterangan / Deskripsi</label>
                <textarea
                  id="add-stock-desc"
                  placeholder="Kegunaan bahan atau detail kemasan..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2.5}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  id="btn-close-stock-modal"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-bold text-gray-700"
                >
                  Batal
                </button>
                <button
                  id="btn-submit-stock"
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg text-sm font-bold text-white shadow-xs transition-colors"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
