import React, { useState } from 'react';
import { TrendingUp, ShoppingBag, Users, AlertTriangle, Award, RefreshCw, HelpCircle } from 'lucide-react';
import { DashboardStats, InventoryItem } from '../types';

interface DashboardViewProps {
  stats: DashboardStats;
  loading: boolean;
  onRefresh: () => void;
  onNavigateToStock: () => void;
  inventory: InventoryItem[];
}

export default function DashboardView({ stats, loading, onRefresh, onNavigateToStock, inventory = [] }: DashboardViewProps) {
  const [flowPeriod, setFlowPeriod] = useState<'harian' | 'bulanan'>('harian');

  // Format to IDR (Rupiah)
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Find materials with low stock (threshold: <= 15)
  const lowStockItems = Array.isArray(inventory) ? inventory.filter(item => item.stok <= 15) : [];

  const maxDailyPemasukan = Math.max(...stats.daily_stats.map(d => d.pemasukan), 50000);
  const maxMonthlyPemasukan = Math.max(...stats.monthly_stats.map(m => m.pemasukan), 1000000);

  return (
    <div id="dashboard-container" className="space-y-6">
      {/* Dashboard Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard & Statistik</h1>
          <p className="text-sm text-slate-500">Pantau akumulasi omset harian, bulanan, layanan terlaris, dan alarm material stok.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            System Online
          </div>
          <button
            id="btn-refresh-dashboard"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 justify-center px-4 py-2.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 transition-all shadow-md shadow-indigo-150 rounded-xl disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan Data
          </button>
        </div>
      </div>

      {/* Inventory Warnings: "stok menipis pada dashboard" */}
      {lowStockItems.length > 0 && (
        <div id="low-stock-alert" className="bg-amber-50 border border-amber-200 p-4.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">⚠️ ALARM PERINGATAN: Stok Bahan Menipis!</h3>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                Beberapa persediaan kimia / kemasan operasional laundry berada di bawah batas minimum (15 unit). Segera lakukan restock belanja bahan baku.
              </p>
              
              {/* Horizontal badge scroll of low items */}
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStockItems.map(item => (
                  <span key={item.id} className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-150 text-amber-900 border border-amber-300">
                    {item.nama_barang}: <span className="font-mono text-rose-700 ml-1 font-black">{item.stok} {item.satuan}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Summary Cards with Bento design */}
      <div id="stats-summary-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pemasukan Card */}
        <div id="card-pemasukan" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Pendapatan (Lunas)</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-black text-slate-900 font-sans">
              {formatRupiah(stats.total_pemasukan)}
            </span>
            <span className="text-[10px] text-green-700 font-extrabold bg-green-50 px-2.5 py-1 rounded-lg border border-green-150">
              Kas Real-time
            </span>
          </div>
        </div>

        {/* Transaksi Card */}
        <div id="card-transaksi" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Transaksi</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-black text-slate-900">
              {stats.total_transaksi} <span className="text-xs text-slate-400 font-semibold">Order</span>
            </span>
            <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-150">
              Processing
            </span>
          </div>
        </div>

        {/* Pelanggan Card */}
        <div id="card-pelanggan" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Pelanggan</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-black text-slate-900">
              {stats.total_pelanggan} <span className="text-xs text-slate-400 font-semibold">Orang</span>
            </span>
            <span className="text-[10px] text-purple-700 font-extrabold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-150">
              Member
            </span>
          </div>
        </div>
      </div>

      {/* Visual Chart Panel Toggle & Popular Services Grid */}
      <div id="charts-and-insights-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Single Consolidated Chart: "Transaction Flow" with select choices */}
        <div id="panel-transaction-flow" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Aliran Arus Kas Transaksi</h3>
              <p className="text-[11px] text-slate-500">
                {flowPeriod === 'harian' 
                  ? 'Pemasukan kas dalam 7 hari kerja terakhir (hanya order Lunas)' 
                  : 'Grafik akumulasi pendapatan kas laundry per bulan'}
              </p>
            </div>
            
            {/* Harian / Bulanan Trigger Buttons */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFlowPeriod('harian')}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  flowPeriod === 'harian' 
                    ? 'bg-white text-indigo-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Harian (7 Hari)
              </button>
              <button
                type="button"
                onClick={() => setFlowPeriod('bulanan')}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  flowPeriod === 'bulanan' 
                    ? 'bg-white text-indigo-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bulanan (Tahunan)
              </button>
            </div>
          </div>

          {/* Render layout conditional upon selection */}
          {flowPeriod === 'harian' ? (
            /* DAILY BAR CHART */
            <div className="h-56 w-full flex flex-col justify-end pt-4 animate-fade-in">
              <div className="flex-1 flex items-end gap-3 px-2 relative h-full">
                {/* Background grid lines */}
                <div className="absolute inset-x-0 top-0 border-t border-slate-100/60 h-0" />
                <div className="absolute inset-x-0 top-1/4 border-t border-slate-100/60 h-0" />
                <div className="absolute inset-x-0 top-2/4 border-t border-slate-100/60 h-0" />
                <div className="absolute inset-x-0 top-3/4 border-t border-slate-100/60 h-0" />

                {stats.daily_stats.map((day, idx) => {
                  const heightPercentage = maxDailyPemasukan > 0 ? (day.pemasukan / maxDailyPemasukan) * 85 : 0;
                  const dateObj = new Date(day.tanggal);
                  const isToday = new Date().toDateString() === dateObj.toDateString();

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full group relative z-10">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-center whitespace-nowrap">
                        <p className="font-bold">{formatRupiah(day.pemasukan)}</p>
                        <p className="text-slate-300 text-[9px]">{day.transaksi} Transaksi</p>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full flex justify-center items-end h-full">
                        <div
                          style={{ height: `${Math.max(6, heightPercentage)}%` }}
                          className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 cursor-pointer ${
                            isToday 
                              ? 'bg-indigo-600 hover:bg-indigo-500 shadow-xs' 
                              : 'bg-indigo-200 hover:bg-indigo-350'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-Axis Weekday Labels */}
              <div className="flex justify-between text-[10px] text-slate-400 px-2 uppercase font-bold tracking-widest pt-4 mt-2 border-t border-slate-50">
                {stats.daily_stats.map((day, idx) => {
                  const dateObj = new Date(day.tanggal);
                  const isToday = new Date().toDateString() === dateObj.toDateString();
                  const shortLabel = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
                  return (
                    <div key={idx} className="flex-1 text-center">
                      <span className={`text-[10px] font-bold block ${isToday ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
                        {shortLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MONTHLY BAR CHART */
            <div className="h-56 w-full flex flex-col justify-end pt-4 animate-fade-in">
              <div className="flex-1 flex items-end gap-4 px-4 relative h-full">
                {/* Background grid lines */}
                <div className="absolute inset-x-0 top-0 border-t border-slate-100/60 h-0" />
                <div className="absolute inset-x-0 top-1/4 border-t border-slate-100/60 h-0" />
                <div className="absolute inset-x-0 top-2/4 border-t border-slate-100/60 h-0" />
                <div className="absolute inset-x-0 top-3/4 border-t border-slate-100/60 h-0" />

                {stats.monthly_stats.map((month, idx) => {
                  const heightPercent = maxMonthlyPemasukan > 0 ? (month.pemasukan / maxMonthlyPemasukan) * 80 : 0;
                  const [yr, mo] = month.bulan.split('-');
                  const indonesianMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                  const shortMonthLabel = `${indonesianMonths[parseInt(mo) - 1] || mo} ${yr}`;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full group relative z-10">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-md text-center z-20">
                        <p className="font-bold">{formatRupiah(month.pemasukan)}</p>
                        <p className="text-slate-300 text-[8px]">{month.transaksi} Order</p>
                      </div>

                      <div className="w-full flex justify-center items-end h-full">
                        <div
                          style={{ height: `${Math.max(6, heightPercent)}%` }}
                          className="w-full max-w-[64px] bg-gradient-to-t from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-t-xl shadow-xs transition-all duration-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-Axis Monthly Labels */}
              <div className="flex gap-4 px-4 pt-4 border-t border-slate-100 mt-2">
                {stats.monthly_stats.map((month, idx) => {
                  const [, mo] = month.bulan.split('-');
                  const indonesianShortMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                  const monthLabel = indonesianShortMonths[parseInt(mo) - 1] || month.bulan;

                  return (
                    <div key={idx} className="flex-1 text-center">
                      <span className="text-[10px] md:text-xs text-slate-500 font-bold block truncate">{monthLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Popular Laundry Services */}
        <div id="panel-popular-services" className="bg-slate-900 rounded-3xl p-6 text-indigo-100 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wide text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Layanan Terlaris
              </h3>
              <p className="text-[10px] text-indigo-350 font-medium">Berdasarkan volume transaksi laundry</p>
            </div>

            <div className="space-y-4 pt-2">
              {stats.popular_services.length === 0 ? (
                <p className="text-xs text-center text-indigo-350/60 py-10">Belum ada transaksi.</p>
              ) : (
                stats.popular_services.slice(0, 4).map((svc, idx) => {
                  const maxVal = Math.max(...stats.popular_services.map(s => s.value), 1);
                  const widthPercent = (svc.value / maxVal) * 100;
                  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-sky-400', 'bg-purple-500'];

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium font-mono text-indigo-150">
                        <span className="truncate max-w-[150px]">{svc.nama}</span>
                        <span className="text-white font-bold">{svc.value} order</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${widthPercent}%` }}
                          className={`h-full rounded-full ${colors[idx % colors.length]}`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl mt-4 border border-white/10 text-[10px] text-indigo-200/90 space-y-1 font-mono">
            <p className="font-bold text-indigo-300">💡 DB STATS INTEGRATION</p>
            <p className="opacity-80">Gunakan deteksi stok menipis pada dashboard untuk memantau sisa chemical deterjen.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
