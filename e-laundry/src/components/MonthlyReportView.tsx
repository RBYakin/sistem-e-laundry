import { useState, useEffect } from 'react';
import { FileText, Calendar, Printer, DollarSign, TrendingUp, CheckSquare, ListFilter, Percent } from 'lucide-react';

interface MonthlyReportData {
  bulan: string;
  total_pemasukan: number;
  total_transaksi: number;
  lunas_count: number;
  belum_lunas_count: number;
  status_counts: {
    masuk: number;
    proses: number;
    selesai: number;
    diambil: number;
  };
  product_list: { nama: string; qty: number; pendapatan: number }[];
}

interface MonthlyReportViewProps {
  onFetchReport: (month: string) => Promise<MonthlyReportData>;
}

export default function MonthlyReportView({ onFetchReport }: MonthlyReportViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // "YYYY-MM"
  });
  
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    onFetchReport(selectedMonth)
      .then(res => {
        if (active) {
          setReport(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to grab monthly report', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMonth, onFetchReport]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getMonthName = (monthStr: string) => {
    const [yr, mo] = monthStr.split('-');
    const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${names[parseInt(mo) - 1] || mo} ${yr}`;
  };

  const handleExportExcel = () => {
    if (!report) return;

    // Create custom styled HTML sheet parsed by MS Excel with gridlines enabled
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Keuangan</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #1e293b; }
          .header-title { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 2px; }
          .meta-text { font-size: 12px; margin-bottom: 4px; color: #475569; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; margin-bottom: 25px; }
          th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; }
          .number { text-align: right; font-family: monospace; font-weight: bold; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background-color: #ecfdf5; color: #065f46; }
          .status-header { background-color: #f1f5f9; color: #334155; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">LAPORAN KEUANGAN & PEMASUKAN E-LAUNDRY</div>
        <div class="meta-text"><b>Periode Rekap:</b> ${getMonthName(report.bulan)}</div>
        <div class="meta-text"><b>Total Omset Pendapatan (Lunas):</b> ${formatRupiah(report.total_pemasukan)}</div>
        <div class="meta-text"><b>Rasio Pembayaran Lunas:</b> ${report.total_transaksi > 0 ? Math.round((report.lunas_count / report.total_transaksi) * 100) : 0}%</div>
        <div class="meta-text"><b>Volume Transaksi:</b> ${report.total_transaksi} Order (${report.lunas_count} Lunas, ${report.belum_lunas_count} Belum Bayar)</div>
        
        <br/>
        <h3>1. REKAPITULASI STATUS TRANSAKSI</h3>
        <table>
          <thead>
            <tr>
              <th style="background-color: #334155;">Status Alur Kerja</th>
              <th class="text-center" style="background-color: #334155; width: 150px;">Jumlah Order</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Antrian Baru (Masuk)</td>
              <td class="text-center">${report.status_counts.masuk} order</td>
            </tr>
            <tr>
              <td>Sedang Dalam Proses</td>
              <td class="text-center">${report.status_counts.proses} order</td>
            </tr>
            <tr>
              <td>Selesai Dan Siap Diambil</td>
              <td class="text-center">${report.status_counts.selesai} order</td>
            </tr>
            <tr>
              <td>Pakaian Sudah Diambil Pelanggan</td>
              <td class="text-center">${report.status_counts.diambil} order</td>
            </tr>
          </tbody>
        </table>

        <h3>2. DETAIL PENDAPATAN PER LAYANAN JASA</h3>
        <table>
          <thead>
            <tr>
              <th>Nama Layanan Laundry</th>
              <th class="text-center" style="width: 200px;">Volume Satuan Terjual</th>
              <th class="number" style="width: 250px;">Subtotal Pendapatan (Lunas)</th>
            </tr>
          </thead>
          <tbody>
            ${report.product_list.map(it => `
              <tr>
                <td style="font-weight: bold; color: #1e1b4b;">${it.nama}</td>
                <td class="text-center">${it.qty}</td>
                <td class="number">${formatRupiah(it.pendapatan)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2">TOTAL OMSET PENDAPATAN BULANAN (LUNAS)</td>
              <td class="number">${formatRupiah(report.total_pemasukan)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Package into xls blob
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Pemasukan_Laundry_${selectedMonth}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerMockPrint = () => {
    // Automatically download Excel file format as requested
    handleExportExcel();
    // Launch standard print dialog
    window.print();
  };

  return (
    <div id="monthly-report-wrapper" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Laporan Keuangan & Pemasukan</h1>
          <p className="text-sm text-gray-500">Pantau akumulasi omset penjualan bulanan dan efisiensi order secara akurat.</p>
        </div>

        {/* Month Selector Picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            id="report-month-picker"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-200 rounded-lg p-2.5 text-sm bg-white font-semibold text-gray-700 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          />
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100 min-h-[300px] flex items-center justify-center">
          <div className="space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Memuat rekapitulasi data keuangan...</p>
          </div>
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">
          {/* Key Analytics Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Omset Total */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-500 text-white p-5 rounded-xl shadow-xs space-y-2">
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider block">Total Omset Pendapatan</span>
              <p className="text-2xl font-black font-sans">{formatRupiah(report.total_pemasukan)}</p>
              <p className="text-xs text-emerald-50">Omset dihitung murni dari transaksi lunas pada bulan {getMonthName(report.bulan)}.</p>
            </div>

            {/* Total Transaksi */}
            <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-2xs space-y-2 flex flex-col justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Volume Order Masuk</span>
              <p className="text-2xl font-extrabold text-slate-800">{report.total_transaksi} <span className="text-sm font-normal text-gray-400">Order</span></p>
              <div className="text-[11px] text-gray-500 font-medium flex justify-between">
                <span>Lunas: {report.lunas_count}</span>
                <span>Belum Bayar: {report.belum_lunas_count}</span>
              </div>
            </div>

            {/* Efisiensi Lunas status */}
            <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-2xs space-y-2 flex flex-col justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Rasio Pembayaran Lunas</span>
              <p className="text-2xl font-extrabold text-blue-600">
                {report.total_transaksi > 0 
                  ? `${Math.round((report.lunas_count / report.total_transaksi) * 100)}%` 
                  : '0%'}
              </p>
              <p className="text-xs text-gray-400 font-medium font-sans">Mendukung pengelolaan cash-flow akurat</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1 & 2: Main service performance listing table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-800">Detail Pendapatan per Layanan / Jasa</h3>
                <button
                  onClick={triggerMockPrint}
                  id="btn-print-excel-report"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold rounded-lg transition-colors border border-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Laporan
                </button>
              </div>

              {report.product_list.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-16">Belum ada rincian jasa yang digunakan di bulan ini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3">Nama Layanan Laundry</th>
                        <th className="px-4 py-3 text-center">Volume Satuan Terjual</th>
                        <th className="px-4 py-3 text-right">Subtotal Pemasukan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.product_list.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="px-4 py-3 font-semibold text-gray-700">{it.nama}</td>
                          <td className="px-4 py-3 text-center font-bold text-gray-600">
                            {it.qty} {it.nama.includes('kg') ? 'kg' : 'pcs'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">
                            {formatRupiah(it.pendapatan)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Column 3: Processing Status Distribution Breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 pb-2 border-b border-gray-50">Pendistribusian Status</h3>
                
                <div className="py-4 space-y-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Antrian Masuk
                    </span>
                    <span className="font-bold text-gray-700">{report.status_counts.masuk} order</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Sedang Proses
                    </span>
                    <span className="font-bold text-gray-700">{report.status_counts.proses} order</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 bg-purple-500 rounded-full" /> Selesai Siap Ambil
                    </span>
                    <span className="font-bold text-gray-700">{report.status_counts.selesai} order</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 flex items-center gap-1.5 font-medium">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full" /> Sudah Diambil
                    </span>
                    <span className="font-bold text-gray-700">{report.status_counts.diambil} order</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 space-y-1 mt-4">
                <span className="font-semibold block text-slate-700">📌 Info Buku Kas</span>
                <p>Data ekspor laporan dicetak otomatis dalam format cetak standar kertas Thermal atau PDF.</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
