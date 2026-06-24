import React, { useState, useEffect } from 'react';
import { User, PlusCircle, Trash2, Edit, Shield, Phone, MapPin, Eye, EyeOff } from 'lucide-react';
import { User as UserType, Role } from '../types';

interface PegawaiCRUDViewProps {
  currentUser: UserType;
  onRefresh: () => void;
}

export default function PegawaiCRUDView({ currentUser, onRefresh }: PegawaiCRUDViewProps) {
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserType | null>(null); // Null for create
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formRole, setFormRole] = useState<Role>('pegawai');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data: UserType[] = await res.json();
        // Filter to admin and pegawai (access-eligible users)
        setEmployees(data.filter(u => u.role === 'pegawai' || u.role === 'admin'));
      } else {
        setError('Gagal memuat daftar pegawai.');
      }
    } catch (err) {
      setError('Kesalahan koneksi saat memuat pegawai.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditUser(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormPhone('');
    setFormAddress('');
    setFormRole('pegawai');
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleOpenEdit = (emp: UserType) => {
    setEditUser(emp);
    setFormName(emp.nama);
    setFormUsername(emp.username);
    setFormPassword(''); // Password is blank by default when editing
    setFormPhone(emp.no_telp);
    setFormAddress(emp.alamat);
    setFormRole(emp.role);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleDelete = async (empId: string) => {
    if (empId === currentUser.id) {
      alert('Anda tidak bisa menghapus akun Anda sendiri!');
      return;
    }

    if (!confirm('Apakah anda yakin ingin menghapus akses pegawai ini?')) return;

    try {
      const res = await fetch(`/api/users/${empId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccess('Pegawai berhasil dihapus!');
        fetchEmployees();
        onRefresh();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const d = await res.json();
        setError(d.message || 'Gagal menghapus pegawai.');
      }
    } catch (err) {
      setError('Masalah jaringan saat menghapus.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const nameVal = formName.trim();
    const phoneVal = formPhone.trim();
    const addressVal = formAddress.trim();
    const usernameVal = formUsername.trim().toLowerCase();

    // Validations
    if (!nameVal || !usernameVal || (!editUser && !formPassword)) {
      setError('Lengkapi kolom bertanda bintang!');
      return;
    }

    if (!/^[a-zA-Z\s]{2,50}$/.test(nameVal)) {
      setError('Format Nama salah! Hanya boleh kombinasi huruf sepanjang 2-50 karakter.');
      return;
    }

    if (!/^[0-9]{10,13}$/.test(phoneVal)) {
      setError('Format Nomor HP salah! Wajib diisi angka saja sepanjang 10-13 digit.');
      return;
    }

    if (addressVal.length < 5) {
      setError('Format Alamat salah! Alamat harus diisi minimal 5 karakter.');
      return;
    }

    const payload: any = {
      nama: nameVal,
      username: usernameVal,
      no_telp: phoneVal,
      alamat: addressVal,
      role: formRole
    };

    if (formPassword) {
      payload.password = formPassword;
    }

    try {
      let res;
      if (editUser) {
        // Edit Mode
        res = await fetch(`/api/users/${editUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create Mode
        payload.role = formRole; // pegawai or admin
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setSuccess(editUser ? 'Data pegawai berhasil diperbarui!' : 'Pegawai baru terdaftar!');
        fetchEmployees();
        onRefresh();
        setTimeout(() => {
          setShowModal(false);
          setSuccess('');
        }, 1200);
      } else {
        const d = await res.json();
        setError(d.message || 'Gagal menyimpan data pegawai.');
      }
    } catch (err) {
      setError('Komunikasi server terputus.');
    }
  };

  return (
    <div id="pegawai-crud-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Kelola Hak Akses Pegawai & Admin</h1>
          <p className="text-sm text-gray-500">Daftarkan dan modifikasi tingkat akses pegawai laundry Anda.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white text-sm font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
        >
          <PlusCircle className="w-4.5 h-4.5" />
          Tambah Pegawai
        </button>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-700 text-xs font-semibold rounded-xl">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-150 text-rose-700 text-xs font-semibold rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 font-medium text-slate-500 text-xs">Sedang mengambil data pegawai...</div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Pegawai / Role</th>
                <th className="p-4">Username Login</th>
                <th className="p-4">No. HP</th>
                <th className="p-4">Alamat Rumah</th>
                <th className="p-4 text-center">Aksi Pelayanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    Belum ada data pegawai terdaftar lain.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 font-bold text-white bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                          {emp.nama.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">{emp.nama}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border mt-1 ${
                            emp.role === 'admin' 
                              ? 'bg-rose-50 text-rose-700 border-rose-150' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                          }`}>
                            {emp.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-500">{emp.username}</td>
                    <td className="p-4 font-mono">{emp.no_telp || '-'}</td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">{emp.alamat || '-'}</td>
                    <td className="p-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit Pegawai"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        disabled={emp.id === currentUser.id}
                        className="p-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
                        title="Hapus Pegawai"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD Edit/Create pegawai */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-150">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">
                {editUser ? '✏️ Edit Data Pegawai' : '➕ Pendaftaran Pegawai Baru'}
              </h3>
              <p className="text-[11px] text-gray-400">
                Tentukan informasi mandat kredensial masuk kedalam sistem Laundry.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Nama Lengkap Pegawai *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Gunawan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Username Login *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editUser}
                    placeholder="Contoh: budipegawai"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">
                    Password Login {editUser ? '(Kosongi jika tak diubah)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editUser}
                      placeholder={editUser ? 'Ketik baru...' : 'Sandi masuk...'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl p-2.5 pr-8 focus:border-indigo-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Tingkat Hak Akses *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as Role)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="pegawai">Pegawai Biasa (Cashier & Stock)</option>
                    <option value="admin">Admin Utama (Full Access)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Nomor HP (WhatsApp) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 0812XXXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Alamat Rumah *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Isikan alamat rumah lengkap..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {editUser ? 'Simpan Perubahan' : 'Registrasikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
