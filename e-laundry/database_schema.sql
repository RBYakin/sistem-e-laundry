-- ==========================================================
-- E-LAUNDRY SMART SYSTEM - DATABASE SCHEMA (MYSQL/MARIADB)
-- Dirancang untuk PHP Native tanpa framework.
-- Mendukung relasi efisien, transaksi, produk/layanan, stok,
-- dan monitoring pemasukan bulanan aman.
-- ==========================================================

CREATE DATABASE IF NOT EXISTS db_laundry_local;
USE db_laundry_local;

-- 1. TABEL PENGGUNA (user_profile / users)
-- Menyimpan informasi kredensial login dengan role Admin, Pegawai, dan Pelanggan.
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Simpan hash password (misal: password_hash() di PHP)
    nama VARCHAR(150) NOT NULL,
    role ENUM('admin', 'pegawai', 'pelanggan') NOT NULL DEFAULT 'pelanggan',
    no_telp VARCHAR(20) NOT NULL,
    alamat TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABEL PRODUK / LAYANAN (products)
-- Berisi daftar layanan laundry kiloan (cuci setrika, ekspres, dll) atau satuan (helm, bed cover, sepatu).
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(150) NOT NULL,
    jenis ENUM('kiloan', 'satuan') NOT NULL DEFAULT 'kiloan',
    harga INT NOT NULL, -- Harga dalam Rupiah
    satuan VARCHAR(20) NOT NULL, -- Contoh: 'kg', 'pcs', 'pasang'
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL INVENTORIS / STOK BARANG (inventory)
-- Membantu mengelola ketersediaan stok seperti bahan sabun, pewangi, plastik kemasan.
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY,
    nama_barang VARCHAR(150) NOT NULL,
    stok DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    satuan VARCHAR(20) NOT NULL, -- Contoh: 'liter', 'botol', 'lembar', 'roll'
    deskripsi TEXT,
    restock_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABEL TRANSAKSI UTAMA (transactions)
-- Menyimpan metadata transaksi utama laundry.
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL UNIQUE, -- E.g., 'INV-260524-1922'
    pelanggan_id VARCHAR(50) NULL, -- Jika walk-in (bukan member/pelanggan terdaftar), biarkan NULL
    customer_name VARCHAR(150) NOT NULL, -- Backup nama jika pelanggan_id NULL
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    cashier_id VARCHAR(50) NOT NULL, -- Pegawai / Admin yang memproses
    cashier_name VARCHAR(150) NOT NULL,
    total_harga INT NOT NULL,
    status ENUM('masuk', 'proses', 'selesai', 'diambil') NOT NULL DEFAULT 'masuk',
    status_pembayaran ENUM('belum_bayar', 'lunas') NOT NULL DEFAULT 'belum_bayar',
    metode_pembayaran ENUM('qris', 'cod') NOT NULL DEFAULT 'cod',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL DEFAULT NULL,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (pelanggan_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TABEL DETAIL TRANSAKSI / ITEM DETIL (transaction_items)
-- Menghubungkan tiap transaksi dengan beberapa produk/layanan (one-to-many) demi efisiensi optimal.
CREATE TABLE IF NOT EXISTS transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    nama_produk VARCHAR(150) NOT NULL, -- Cache nama produk saat transaksi dibuat
    harga INT NOT NULL,
    qty DECIMAL(10,2) NOT NULL, -- Kapasitas/berat (kg) atau kuantitas pcs
    subtotal INT NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- COBAAN / SEEDER DATA AWAL UNTUK MEMBANTU TESTING DI PHP LOCAL
-- ==========================================================

-- Masukkan User Default (Password mentah untuk demo: 'admin123', 'pegawai123', 'budi123')
-- NB: Jika di php native Anda, silakan enkripsi menggunakan password_hash()
INSERT INTO users (id, username, password, nama, role, no_telp, alamat) VALUES
('usr-1', 'admin', '$2y$10$gO6XatMscs3zGbeE9Yd6gOszH68S.8N50pB8E9IqOnK9Z2lV8t3F2', 'Alex Saputra (Admin)', 'admin', '081234567890', 'Jl. Merdeka No. 10, Jakarta'),
('usr-2', 'pegawai', '$2y$10$tZ2pB/1vXq5Gg2C6OaM8eOtY78S.8N50pB8E9IqOnK9Z2lV8t3F2', 'Siti Rahma (Pegawai)', 'pegawai', '081298765432', 'Jl. Melati No. 5, Jaksel'),
('usr-3', 'budi', '$2y$10$xG2pB/1vXq5Gg2C6OaM8eOtY78S.8N50pB8E9IqOnK9Z2lV8t3F2', 'Budi Santoso', 'pelanggan', '085712345678', 'Rawamangun Regency Blok C4');

-- Masukkan Produk Layanan
INSERT INTO products (id, nama, jenis, harga, satuan, deskripsi) VALUES
('prod-1', 'Cuci Setrika Reguler', 'kiloan', 7000, 'kg', 'Pencucian + setrika rapi + pewangi (3 hari kerja)'),
('prod-2', 'Cuci Setrika Ekspres', 'kiloan', 12000, 'kg', 'Pencucian + setrika rapi ekspres (24 jam selesai)'),
('prod-3', 'Setrika Saja Reguler', 'kiloan', 5000, 'kg', 'Setrika rapi + lipat + pewangi (2 hari kerja)'),
('prod-4', 'Bed Cover Sedang/Besar', 'satuan', 25000, 'pcs', 'Cuci dan pengeringan higienis bed cover');

-- Masukkan Stok Awal Barang
INSERT INTO inventory (id, nama_barang, stok, satuan, deskripsi) VALUES
('inv-1', 'Deterjen Cair Sakura', 45.00, 'liter', 'Deterjen cair mesin laundry premium aromatis'),
('inv-2', 'Pewangi Downy Mist', 12.00, 'botol', 'Pewangi konsentrat serat pakaian lembut'),
('inv-3', 'Parfum Finisher Apple', 8.00, 'liter', 'Pewangian semprot pasca setrika langsung packing');
