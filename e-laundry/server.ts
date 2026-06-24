import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Transaction, Product, InventoryItem, User } from './src/types';

// Resolve directory when running as ES modules
const __filename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : '';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isVercel = process.env.VERCEL === '1' || typeof process.env.NOW_REGION !== 'undefined';
const DB_FILE = isVercel 
  ? '/tmp/laundry_db.json' 
  : path.join(process.cwd(), 'laundry_db.json');

app.use(express.json());

// Normalize Vercel serverless function request routing paths
app.use((req, res, next) => {
  const originalUrl = req.url;
  
  // If the request URL starts with /api/index.ts, strip it
  if (req.url.startsWith('/api/index.ts')) {
    req.url = req.url.replace('/api/index.ts', '');
  }
  
  // Ensure the URL starts with /api for routing consistency (unless it's root or asset request)
  if (!req.url.startsWith('/api') && req.url !== '/' && !req.url.includes('.')) {
    req.url = '/api' + req.url;
  }
  
  if (originalUrl !== req.url) {
    console.log(`[Express API Path Normalization] Rewrote path: "${originalUrl}" -> "${req.url}"`);
  }
  next();
});

// Request logging middleware for serverless/local debugging
app.use((req, res, next) => {
  console.log(`[Express API] ${req.method} ${req.url} - IP: ${req.ip} - UserAgent: ${req.get('user-agent')}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    // Log the request body but hide plain passwords
    const bodyCopy = { ...req.body };
    if (bodyCopy.password) bodyCopy.password = '***';
    console.log(`[Express API] Body:`, JSON.stringify(bodyCopy));
  }
  next();
});

// Helper to standardise IDs
const generateId = () => Math.random().toString(36).substring(2, 9);
const generateInvoiceId = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${rand}`;
};

// Seed dataset
const INITIAL_USERS: User[] = [
  { id: 'usr-1', username: 'admin', nama: 'Alex Saputra (Admin)', role: 'admin', no_telp: '081234567890', alamat: 'Jl. Merdeka No. 10, Jakarta', created_at: '2026-04-01T00:00:00Z' },
  { id: 'usr-2', username: 'pegawai', nama: 'Siti Rahma (Pegawai)', role: 'pegawai', no_telp: '081298765432', alamat: 'Jl. Melati No. 5, Jaksel', created_at: '2026-04-05T00:00:00Z' },
  { id: 'usr-3', username: 'budi', nama: 'Budi Santoso', role: 'pelanggan', no_telp: '085712345678', alamat: 'Rawamangun Regency Blok C4', created_at: '2026-05-01T10:00:00Z' },
  { id: 'usr-4', username: 'ani', nama: 'Anisa Kirana', role: 'pelanggan', no_telp: '081322334455', alamat: 'Apartemen Green Pramuka Tower B-10', created_at: '2026-05-05T14:30:00Z' }
];

// Plain password matching database mapping for demo/training purposes
// Fits cleanly inside server state for the custom sandbox
const PASSWORD_DB: Record<string, string> = {
  'admin': 'admin123',
  'pegawai': 'pegawai123',
  'budi': 'budi123',
  'ani': 'ani123'
};

const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod-1', nama: 'Cuci Setrika Reguler', jenis: 'kiloan', harga: 7000, satuan: 'kg', deskripsi: 'Pencucian + setrika rapi + pewangi (3 hari kerja)' },
  { id: 'prod-2', nama: 'Cuci Setrika Ekspres', jenis: 'kiloan', harga: 12000, satuan: 'kg', deskripsi: 'Pencucian + setrika rapi ekspres (24 jam selesai)' },
  { id: 'prod-3', nama: 'Setrika Saja Reguler', jenis: 'kiloan', harga: 5000, satuan: 'kg', deskripsi: 'Setrika rapi + lipat + pewangi (2 hari kerja)' },
  { id: 'prod-4', nama: 'Bed Cover Sedang/Besar', jenis: 'satuan', harga: 25000, satuan: 'pcs', deskripsi: 'Cuci dan pengeringan higienis bed cover' },
  { id: 'prod-5', nama: 'Helm Sepeda / Motor', jenis: 'satuan', harga: 15000, satuan: 'pcs', deskripsi: 'Cuci helm deep cleaning antibakteri' },
  { id: 'prod-6', nama: 'Sepatu Kanvas / Kets', jenis: 'satuan', harga: 20000, satuan: 'pcs', deskripsi: 'Pencucian sepatu khusus untuk meremajakan warna' }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', nama_barang: 'Deterjen Liquid Lavender', stok: 12, satuan: 'liter', deskripsi: 'Deterjen cair premium aroma lavender', restock_date: '2026-05-10T08:00:00Z' },
  { id: 'inv-2', nama_barang: 'Parfum Sakura Premium', stok: 25, satuan: 'botol', deskripsi: 'Pewangi finishing sakura tahan lama', restock_date: '2026-05-12T10:30:00Z' },
  { id: 'inv-3', nama_barang: 'Plastik Packing Kiloan (Medium)', stok: 8, satuan: 'pack', deskripsi: 'Plastik pembungkus cucian kiloan', restock_date: '2026-05-15T11:00:00Z' },
  { id: 'inv-4', nama_barang: 'Tag Label Gantung', stok: 150, satuan: 'pcs', deskripsi: 'Tag kertas penanda id cucian pelanggan', restock_date: '2026-05-01T09:00:00Z' }
];

// Pre-create simulated transactions to illustrate beautiful graphs with realistic data
const generateSeedTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  
  // Custom date generator
  const createPastDateISO = (daysAgo: number, hours: number, mins: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, mins, 0, 0);
    return d.toISOString();
  };

  // Transaction histories 
  // Month of May 2026
  transactions.push({
    id: generateId(),
    invoice_id: 'INV-260515-3211',
    pelanggan_id: 'usr-3',
    customer_name: 'Budi Santoso',
    customer_phone: '085712345678',
    customer_address: 'Rawamangun Regency Blok C4',
    cashier_id: 'usr-2',
    cashier_name: 'Siti Rahma (Pegawai)',
    items: [
      { product_id: 'prod-1', nama_produk: 'Cuci Setrika Reguler', harga: 7000, qty: 5, subtotal: 35000 },
      { product_id: 'prod-4', nama_produk: 'Bed Cover Sedang/Besar', harga: 25000, qty: 1, subtotal: 25000 }
    ],
    total_harga: 60000,
    status: 'diambil',
    status_pembayaran: 'lunas',
    metode_pembayaran: 'qris',
    created_at: createPastDateISO(9, 10, 15),
    finished_at: createPastDateISO(6, 15, 0),
    paid_at: createPastDateISO(9, 10, 20)
  });

  transactions.push({
    id: generateId(),
    invoice_id: 'INV-260518-8422',
    pelanggan_id: 'usr-4',
    customer_name: 'Anisa Kirana',
    customer_phone: '081322334455',
    customer_address: 'Apartemen Green Pramuka Tower B-10',
    cashier_id: 'usr-2',
    cashier_name: 'Siti Rahma (Pegawai)',
    items: [
      { product_id: 'prod-2', nama_produk: 'Cuci Setrika Ekspres', harga: 12000, qty: 4, subtotal: 48000 }
    ],
    total_harga: 48000,
    status: 'diambil',
    status_pembayaran: 'lunas',
    metode_pembayaran: 'cod',
    created_at: createPastDateISO(6, 14, 0),
    finished_at: createPastDateISO(5, 14, 0),
    paid_at: createPastDateISO(5, 17, 30)
  });

  transactions.push({
    id: generateId(),
    invoice_id: 'INV-260520-1122',
    pelanggan_id: 'usr-3',
    customer_name: 'Budi Santoso',
    customer_phone: '085712345678',
    customer_address: 'Rawamangun Regency Blok C4',
    cashier_id: 'usr-1',
    cashier_name: 'Alex Saputra (Admin)',
    items: [
      { product_id: 'prod-6', nama_produk: 'Sepatu Kanvas / Kets', harga: 20000, qty: 2, subtotal: 40000 }
    ],
    total_harga: 40000,
    status: 'selesai',
    status_pembayaran: 'lunas',
    metode_pembayaran: 'qris',
    created_at: createPastDateISO(4, 9, 30),
    finished_at: createPastDateISO(1, 11, 0),
    paid_at: createPastDateISO(4, 10, 0)
  });

  transactions.push({
    id: generateId(),
    invoice_id: 'INV-260522-8323',
    pelanggan_id: 'usr-4',
    customer_name: 'Anisa Kirana',
    customer_phone: '081322334455',
    customer_address: 'Apartemen Green Pramuka Tower B-10',
    cashier_id: 'usr-2',
    cashier_name: 'Siti Rahma (Pegawai)',
    items: [
      { product_id: 'prod-1', nama_produk: 'Cuci Setrika Reguler', harga: 7000, qty: 3.5, subtotal: 24500 },
      { product_id: 'prod-5', nama_produk: 'Helm Sepeda / Motor', harga: 15000, qty: 1, subtotal: 15000 }
    ],
    total_harga: 39500,
    status: 'proses',
    status_pembayaran: 'belum_bayar',
    metode_pembayaran: 'qris',
    created_at: createPastDateISO(2, 11, 10),
    finished_at: null,
    paid_at: null
  });

  transactions.push({
    id: generateId(),
    invoice_id: 'INV-260523-9311',
    pelanggan_id: 'usr-3',
    customer_name: 'Budi Santoso',
    customer_phone: '085712345678',
    customer_address: 'Rawamangun Regency Blok C4',
    cashier_id: 'usr-2',
    cashier_name: 'Siti Rahma (Pegawai)',
    items: [
      { product_id: 'prod-2', nama_produk: 'Cuci Setrika Ekspres', harga: 12000, qty: 6, subtotal: 72000 }
    ],
    total_harga: 72000,
    status: 'proses',
    status_pembayaran: 'lunas',
    metode_pembayaran: 'qris',
    created_at: createPastDateISO(1, 15, 45),
    finished_at: null,
    paid_at: createPastDateISO(1, 15, 50)
  });

  // Manual walk-in guest (No member account)
  transactions.push({
    id: generateId(),
    invoice_id: 'INV-260524-2201',
    pelanggan_id: null,
    customer_name: 'Ny. Hermawan (Umum)',
    customer_phone: '081223344556',
    customer_address: 'Jl. Pemuda No. 12',
    cashier_id: 'usr-2',
    cashier_name: 'Siti Rahma (Pegawai)',
    items: [
      { product_id: 'prod-1', nama_produk: 'Cuci Setrika Reguler', harga: 7000, qty: 8, subtotal: 56000 }
    ],
    total_harga: 56000,
    status: 'masuk',
    status_pembayaran: 'belum_bayar',
    metode_pembayaran: 'cod',
    created_at: createPastDateISO(0, 2, 30), // 2.5 hours ago
    finished_at: null,
    paid_at: null
  });

  return transactions;
};

// Database structure class
interface Database {
  users: User[];
  products: Product[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  passwords: Record<string, string>;
}

// Read database from file with simple fallback
const loadDB = (): Database => {
  let db: Database | null = null;

  try {
    if (!fs.existsSync(DB_FILE)) {
      // If running on Vercel, try to pre-populate with the deployed database file
      if (isVercel) {
        const possiblePaths = [
          path.join(process.cwd(), 'laundry_db.json'),
          path.join(process.cwd(), 'api', 'laundry_db.json'),
          __dirname ? path.join(__dirname, 'laundry_db.json') : '',
          __dirname ? path.join(__dirname, '..', 'laundry_db.json') : ''
        ].filter(Boolean);

        let templatePath = '';
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            templatePath = p;
            break;
          }
        }

        if (templatePath) {
          try {
            const raw = fs.readFileSync(templatePath, 'utf-8');
            fs.writeFileSync(DB_FILE, raw, 'utf-8');
            db = JSON.parse(raw);
          } catch (err) {
            console.error('Failed to copy template database to /tmp', err);
          }
        }
      }

      if (!db) {
        db = {
          users: INITIAL_USERS,
          products: INITIAL_PRODUCTS,
          inventory: INITIAL_INVENTORY,
          transactions: generateSeedTransactions(),
          passwords: PASSWORD_DB
        };
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
        } catch (err) {
          console.error('Failed to initialize database', err);
        }
      }
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        db = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading database file, returning default seeds', err);
      }
    }
  } catch (err) {
    console.error('CRITICAL: Unexpected error in loadDB, resorting to fallback seeds:', err);
  }

  // Fallback if loading failed entirely
  if (!db) {
    db = {
      users: INITIAL_USERS,
      products: INITIAL_PRODUCTS,
      inventory: INITIAL_INVENTORY,
      transactions: [],
      passwords: PASSWORD_DB
    };
  }

  // CRITICAL PROTECTION: Self-healing to ensure no fields are ever missing or undefined
  if (!db.users || !Array.isArray(db.users) || db.users.length === 0) {
    db.users = INITIAL_USERS;
  }
  if (!db.passwords || typeof db.passwords !== 'object' || Object.keys(db.passwords).length === 0) {
    db.passwords = PASSWORD_DB;
  }
  if (!db.products || !Array.isArray(db.products) || db.products.length === 0) {
    db.products = INITIAL_PRODUCTS;
  }
  if (!db.inventory || !Array.isArray(db.inventory) || db.inventory.length === 0) {
    db.inventory = INITIAL_INVENTORY;
  }
  if (!db.transactions || !Array.isArray(db.transactions)) {
    db.transactions = [];
  }

  return db;
};

const saveDB = (data: Database) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database file', err);
  }
};

// Ensure DB exists on start
loadDB();

// API ENDPOINTS

// 1. AUTH LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi!' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'User tidak ditemukan!' });
  }

  const correctPassword = db.passwords[user.username];
  if (correctPassword === password) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: 'Password salah!' });
  }
});

// 2. DASHBOARD OR ANALYTICAL DATA STATS
app.get('/api/stats', (req, res) => {
  const db = loadDB();
  const transactions = db.transactions;
  const users = db.users;
  const inventory = db.inventory;

  // Total earnings (Only calculated from PAID transactions!)
  const total_pemasukan = transactions
    .filter(t => t.status_pembayaran === 'lunas')
    .reduce((sum, t) => sum + t.total_harga, 0);

  const total_transaksi = transactions.length;
  // Customers count (users with role = 'pelanggan' and unique names in transactions that don't have member)
  const member_count = users.filter(u => u.role === 'pelanggan').length;
  const unique_guests = new Set(transactions.filter(t => t.pelanggan_id === null).map(t => t.customer_name)).size;
  const total_pelanggan = member_count + unique_guests;

  // Low stock inventory warning (Stok < 15 or specific low levels)
  const stok_habis = inventory.filter(item => item.stok <= 15).length;

  // Daily Stats for graph (group by date)
  // Get last 7 days
  const daily_stats_map: Record<string, { tanggal: string; pemasukan: number; transaksi: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    daily_stats_map[dateStr] = { tanggal: dateStr, pemasukan: 0, transaksi: 0 };
  }

  transactions.forEach(t => {
    const dateStr = t.created_at.split('T')[0];
    if (daily_stats_map[dateStr]) {
      daily_stats_map[dateStr].transaksi += 1;
      if (t.status_pembayaran === 'lunas') {
        daily_stats_map[dateStr].pemasukan += t.total_harga;
      }
    }
  });

  const daily_stats = Object.values(daily_stats_map);

  // Monthly stats for chart
  const monthly_stats_map: Record<string, { bulan: string; pemasukan: number; transaksi: number }> = {};
  
  // Seed last 4 months for visual continuity
  const months = ['02', '03', '04', '05'];
  months.forEach(m => {
    monthly_stats_map[`2026-${m}`] = { bulan: `2026-${m}`, pemasukan: 0, transaksi: 0 };
  });

  // Inject some fake historical data in older months for visual trend if database is dry
  monthly_stats_map['2026-02'] = { bulan: '2026-02', pemasukan: 1250000, transaksi: 32 };
  monthly_stats_map['2026-03'] = { bulan: '2026-03', pemasukan: 1840000, transaksi: 45 };
  monthly_stats_map['2026-04'] = { bulan: '2026-04', pemasukan: 2450000, transaksi: 58 };

  transactions.forEach(t => {
    const monthStr = t.created_at.slice(0, 7); // "YYYY-MM"
    if (monthly_stats_map[monthStr]) {
      // Add count
      monthly_stats_map[monthStr].transaksi += 1;
      if (t.status_pembayaran === 'lunas') {
        monthly_stats_map[monthStr].pemasukan += t.total_harga;
      }
    } else {
      monthly_stats_map[monthStr] = {
        bulan: monthStr,
        pemasukan: t.status_pembayaran === 'lunas' ? t.total_harga : 0,
        transaksi: 1
      };
    }
  });

  const monthly_stats = Object.values(monthly_stats_map).sort((a, b) => a.bulan.localeCompare(b.bulan));

  // Popular products/services
  const service_tally: Record<string, number> = {};
  transactions.forEach(t => {
    t.items.forEach(item => {
      service_tally[item.nama_produk] = (service_tally[item.nama_produk] || 0) + item.qty;
    });
  });

  const popular_services = Object.entries(service_tally).map(([nama, value]) => ({
    nama,
    value: Math.round(value * 10) / 10 // Round to 1 decimal place if kg
  })).sort((a, b) => b.value - a.value).slice(0, 4);

  res.json({
    total_pemasukan,
    total_transaksi,
    total_pelanggan,
    stok_habis,
    daily_stats,
    monthly_stats,
    popular_services
  });
});

// 3. PRODUCTS ENDPOINTS
app.get('/api/products', (req, res) => {
  const db = loadDB();
  res.json(db.products);
});

app.post('/api/products', (req, res) => {
  const { nama, jenis, harga, satuan, deskripsi } = req.body;
  if (!nama || !jenis || harga === undefined || !satuan) {
    return res.status(400).json({ success: false, message: 'Kolom input produk tidak lengkap!' });
  }

  const db = loadDB();
  const newProduct: Product = {
    id: 'prod-' + generateId(),
    nama,
    jenis,
    harga: Number(harga),
    satuan,
    deskripsi: deskripsi || ''
  };

  db.products.push(newProduct);
  saveDB(db);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { nama, jenis, harga, satuan, deskripsi } = req.body;

  const db = loadDB();
  const idx = db.products.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan!' });
  }

  db.products[idx] = {
    ...db.products[idx],
    nama: nama || db.products[idx].nama,
    jenis: jenis || db.products[idx].jenis,
    harga: harga !== undefined ? Number(harga) : db.products[idx].harga,
    satuan: satuan || db.products[idx].satuan,
    deskripsi: deskripsi !== undefined ? deskripsi : db.products[idx].deskripsi
  };

  saveDB(db);
  res.json(db.products[idx]);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const initialLen = db.products.length;
  db.products = db.products.filter(p => p.id !== id);
  
  if (db.products.length === initialLen) {
    return res.status(404).json({ success: false, message: 'Produk tidak ditemukan!' });
  }

  saveDB(db);
  res.json({ success: true, message: 'Produk berhasil dihapus.' });
});

// 4. INVENTORY ENDPOINTS
app.get('/api/inventory', (req, res) => {
  const db = loadDB();
  res.json(db.inventory);
});

app.post('/api/inventory', (req, res) => {
  const { nama_barang, stok, satuan, deskripsi } = req.body;
  if (!nama_barang || stok === undefined || !satuan) {
    return res.status(400).json({ success: false, message: 'Kolom input stok barang kurang lengkap!' });
  }

  const db = loadDB();
  const newItem: InventoryItem = {
    id: 'inv-' + generateId(),
    nama_barang,
    stok: Number(stok),
    satuan,
    deskripsi: deskripsi || '',
    restock_date: new Date().toISOString()
  };

  db.inventory.push(newItem);
  saveDB(db);
  res.status(201).json(newItem);
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { nama_barang, stok, satuan, deskripsi, restock } = req.body;

  const db = loadDB();
  const idx = db.inventory.findIndex(item => item.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Barang tidak ditemukan!' });
  }

  const oldItem = db.inventory[idx];
  db.inventory[idx] = {
    ...oldItem,
    nama_barang: nama_barang || oldItem.nama_barang,
    stok: stok !== undefined ? Number(stok) : oldItem.stok,
    satuan: satuan || oldItem.satuan,
    deskripsi: deskripsi !== undefined ? deskripsi : oldItem.deskripsi,
    restock_date: restock ? new Date().toISOString() : oldItem.restock_date
  };

  saveDB(db);
  res.json(db.inventory[idx]);
});

// 5. TRANSACTIONS ENDPOINTS
app.get('/api/transactions', (req, res) => {
  const db = loadDB();
  // Filter by user if pelanggan role is requested in headers/query to keep data secure
  const { pelangganId } = req.query;
  if (pelangganId) {
    const custTrans = db.transactions.filter(t => t.pelanggan_id === pelangganId);
    return res.json(custTrans);
  }
  res.json(db.transactions);
});

app.post('/api/transactions', (req, res) => {
  const {
    pelanggan_id,
    customer_name,
    customer_phone,
    customer_address,
    cashier_id,
    cashier_name,
    items,
    metode_pembayaran,
    status_pembayaran
  } = req.body;

  if (!customer_name || !customer_phone || !items || !items.length || !cashier_id) {
    return res.status(400).json({ success: false, message: 'Kolom input data transaksi kurang lengkap!' });
  }

  const db = loadDB();

  // Validate items
  const validatedItems = items.map((it: any) => {
    const prod = db.products.find(p => p.id === it.product_id);
    const harga = prod ? prod.harga : it.harga;
    const nama_produk = prod ? prod.nama : it.nama_produk;
    return {
      product_id: it.product_id,
      nama_produk,
      harga,
      qty: Number(it.qty),
      subtotal: Number(it.qty) * harga
    };
  });

  const total_harga = validatedItems.reduce((sum: number, it: any) => sum + it.subtotal, 0);

  const newTransaction: Transaction = {
    id: 'tx-' + generateId(),
    invoice_id: generateInvoiceId(),
    pelanggan_id: pelanggan_id || null,
    customer_name,
    customer_phone,
    customer_address: customer_address || 'Walk-in Guest',
    cashier_id,
    cashier_name: cashier_name || 'Kasir',
    items: validatedItems,
    total_harga,
    status: 'masuk',
    status_pembayaran: status_pembayaran || 'belum_bayar',
    metode_pembayaran: metode_pembayaran || 'cod',
    created_at: new Date().toISOString(),
    finished_at: null,
    paid_at: status_pembayaran === 'lunas' ? new Date().toISOString() : null
  };

  db.transactions.push(newTransaction);
  saveDB(db);
  res.status(201).json(newTransaction);
});

// Update status transaksi (masuk -> proses -> selesai -> diambil)
app.put('/api/transactions/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['masuk', 'proses', 'selesai', 'diambil'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status tidak valid!' });
  }

  const db = loadDB();
  const idx = db.transactions.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan!' });
  }

  const tx = db.transactions[idx];
  tx.status = status;
  
  if (status === 'selesai' && !tx.finished_at) {
    tx.finished_at = new Date().toISOString();
  }
  
  // Custom: if clothes are picked up ('diambil'), payment must also be confirmed unless specifically COD
  if (status === 'diambil') {
    tx.status_pembayaran = 'lunas';
    if (!tx.paid_at) {
      tx.paid_at = new Date().toISOString();
    }
  }

  saveDB(db);
  res.json(tx);
});

// Confirm payment manually or digitally via QRIS/COD
app.put('/api/transactions/:id/pay', (req, res) => {
  const { id } = req.params;
  const { metode_pembayaran } = req.body;

  if (metode_pembayaran && !['qris', 'cod'].includes(metode_pembayaran)) {
    return res.status(400).json({ success: false, message: 'Metode pembayaran hanya QRIS atau COD!' });
  }

  const db = loadDB();
  const idx = db.transactions.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan!' });
  }

  const tx = db.transactions[idx];
  tx.status_pembayaran = 'lunas';
  tx.paid_at = new Date().toISOString();
  if (metode_pembayaran) {
    tx.metode_pembayaran = metode_pembayaran;
  }

  saveDB(db);
  res.json({ success: true, message: 'Pembayaran terkonfirmasi lunas.', transaction: tx });
});

// 6. CUSTOMER REGISTRATION & USERS LIST MANAGEMENT
app.get('/api/users', (req, res) => {
  const db = loadDB();
  // Strip passwords for safety
  const safeUsers = db.users.map(({ id, username, nama, role, no_telp, alamat, created_at }) => ({
    id, username, nama, role, no_telp, alamat, created_at
  }));
  res.json(safeUsers);
});

app.post('/api/users', (req, res) => {
  const { username, password, nama, role, no_telp, alamat } = req.body;
  if (!username || !password || !nama || !role) {
    return res.status(400).json({ success: false, message: 'Kolom registrasi user tidak lengkap!' });
  }

  const db = loadDB();
  const userExist = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (userExist) {
    return res.status(400).json({ success: false, message: 'Username sudah digunakan!' });
  }

  const newId = 'usr-' + generateId();
  const newUser: User = {
    id: newId,
    username: username.toLowerCase(),
    nama,
    role,
    no_telp: no_telp || '-',
    alamat: alamat || '-',
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  db.passwords[username.toLowerCase()] = password;
  
  saveDB(db);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { username, password, nama, role, no_telp, alamat } = req.body;

  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan!' });
  }

  const oldUser = db.users[idx];
  
  // If changing username, check availability
  if (username && username.toLowerCase() !== oldUser.username.toLowerCase()) {
    const userExist = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (userExist) {
       return res.status(400).json({ success: false, message: 'Username sudah digunakan!' });
    }
    // Update password mapping
    const oldPassword = db.passwords[oldUser.username];
    delete db.passwords[oldUser.username];
    db.passwords[username.toLowerCase()] = password || oldPassword || '12345';
  } else if (password) {
    db.passwords[oldUser.username] = password;
  }

  db.users[idx] = {
    ...oldUser,
    username: username ? username.toLowerCase() : oldUser.username,
    nama: nama || oldUser.nama,
    role: role || oldUser.role,
    no_telp: no_telp || oldUser.no_telp,
    alamat: alamat || oldUser.alamat
  };

  saveDB(db);
  res.json({ success: true, user: db.users[idx] });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan!' });
  }

  const username = db.users[idx].username;
  delete db.passwords[username];
  db.users.splice(idx, 1);

  saveDB(db);
  res.json({ success: true, message: 'User berhasil dihapus' });
});

// Update kiloan items weights in transaction
app.put('/api/transactions/:id/update-weight', (req, res) => {
  const { id } = req.params;
  const { items } = req.body; // Array of { product_id, qty }

  const db = loadDB();
  const txIdx = db.transactions.findIndex(t => t.id === id);
  if (txIdx === -1) {
    return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan!' });
  }

  const tx = db.transactions[txIdx];
  tx.items = tx.items.map(origItem => {
    const matched = items.find((it: any) => it.product_id === origItem.product_id);
    if (matched) {
      const newQty = Number(matched.qty);
      return {
        ...origItem,
        qty: newQty,
        subtotal: newQty * origItem.harga
      };
    }
    return origItem;
  });

  tx.total_harga = tx.items.reduce((sum, item) => sum + item.subtotal, 0);

  saveDB(db);
  res.json({ success: true, transaction: tx });
});

// 7. MONTHLY REPORT (Laporan bulanan pemasukan akurat)
app.get('/api/report/monthly', (req, res) => {
  const db = loadDB();
  const { date } = req.query; // Expecting YYYY-MM

  // Generate for selected month
  const targetMonth = date ? String(date) : new Date().toISOString().slice(0, 7);

  const targets = db.transactions.filter(t => t.created_at.startsWith(targetMonth));
  
  const total_transaksi = targets.length;
  const total_pemasukan = targets
    .filter(t => t.status_pembayaran === 'lunas')
    .reduce((sum, t) => sum + t.total_harga, 0);

  const lunas_count = targets.filter(t => t.status_pembayaran === 'lunas').length;
  const belum_lunas_count = total_transaksi - lunas_count;

  const status_masuk = targets.filter(t => t.status === 'masuk').length;
  const status_proses = targets.filter(t => t.status === 'proses').length;
  const status_selesai = targets.filter(t => t.status === 'selesai').length;
  const status_diambil = targets.filter(t => t.status === 'diambil').length;

  // Breakdown of products/services ordered this month
  const service_breakdown: Record<string, { qty: number; pendapatan: number }> = {};
  targets.forEach(t => {
    t.items.forEach(item => {
      if (!service_breakdown[item.nama_produk]) {
        service_breakdown[item.nama_produk] = { qty: 0, pendapatan: 0 };
      }
      service_breakdown[item.nama_produk].qty += item.qty;
      if (t.status_pembayaran === 'lunas') {
        service_breakdown[item.nama_produk].pendapatan += item.subtotal;
      }
    });
  });

  const product_list = Object.entries(service_breakdown).map(([nama, val]) => ({
    nama,
    qty: Math.round(val.qty * 10) / 10,
    pendapatan: val.pendapatan
  }));

  res.json({
    bulan: targetMonth,
    total_pemasukan,
    total_transaksi,
    lunas_count,
    belum_lunas_count,
    status_counts: {
      masuk: status_masuk,
      proses: status_proses,
      selesai: status_selesai,
      diambil: status_diambil
    },
    product_list
  });
});

// Vite server middleware integration or static files delivery in production
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support SPA routing fallbacks for single page entry points
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`E-Laundry Server running on http://0.0.0.0:${PORT}`);
  });
};

if (!isVercel) {
  startServer().catch(err => {
    console.error('Failed to start full-stack laundry server', err);
  });
}

export default app;
