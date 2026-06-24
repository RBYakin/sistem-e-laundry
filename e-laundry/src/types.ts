export type Role = 'admin' | 'pegawai' | 'pelanggan';

export interface User {
  id: string;
  username: string;
  nama: string;
  role: Role;
  no_telp: string;
  alamat: string;
  created_at: string;
}

export interface Product {
  id: string;
  nama: string;
  jenis: 'kiloan' | 'satuan';
  harga: number;
  satuan: string; // kg, pcs, meter, etc.
  deskripsi: string;
}

export interface InventoryItem {
  id: string;
  nama_barang: string;
  stok: number;
  satuan: string; // botol, liter, bungkus, pcs, etc.
  deskripsi: string;
  restock_date: string;
}

export interface TransactionItem {
  product_id: string;
  nama_produk: string;
  harga: number;
  qty: number; // weight in kg or count in pieces
  subtotal: number;
}

export interface Transaction {
  id: string;
  invoice_id: string;
  pelanggan_id: string | null; // null if manual guest walk-in
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  cashier_id: string; // admin or employee who created it
  cashier_name: string;
  items: TransactionItem[];
  total_harga: number;
  status: 'masuk' | 'proses' | 'selesai' | 'diambil';
  status_pembayaran: 'belum_bayar' | 'lunas';
  metode_pembayaran: 'qris' | 'cod';
  created_at: string;
  finished_at: string | null;
  paid_at: string | null;
}

export interface MonthlyReport {
  bulan: string; // E.g., "2026-05"
  total_pemasukan: number;
  total_transaksi: number;
  transaksi_lunas: number;
  transaksi_proses: number;
}

export interface DashboardStats {
  total_pemasukan: number;
  total_transaksi: number;
  total_pelanggan: number;
  stok_habis: number;
  daily_stats: { tanggal: string; pemasukan: number; transaksi: number }[];
  monthly_stats: { bulan: string; pemasukan: number; transaksi: number }[];
  popular_services: { nama: string; value: number }[];
}
