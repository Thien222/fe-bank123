import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CustomerManagerPage.css';
import Notification from './components/Notification';
import SessionManager from './utils/sessionManager';
import { io } from 'socket.io-client';

// Google Fonts import (chỉ cần 1 lần ở App hoặc index, nhưng thêm ở đây để chắc chắn)
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

const trangThaiOptions = [
  'moi', 'dang-xu-ly', 'hoan-thanh'
];

export default function CustomerManagerPage() {
  const [filters, setFilters] = useState({
    soTaiKhoan: '',
    tenKhachHang: '',
    trangThai: '',
    phong: '',
    qlkh: '',
    fromDate: '',
    toDate: ''
  });
  const [hosoList, setHosoList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [showPopup, setShowPopup] = useState(false);
  const [editHoso, setEditHoso] = useState(null);
  const [form, setForm] = useState({
    soTaiKhoan: '', 
    cif: '', 
    tenKhachHang: '', 
    soTienGiaiNgan: '', 
    loaiTien: '', 
    ngayGiaiNgan: '', 
    trangThai: 'moi', 
    phong: '', 
    qlkh: '', 
    hopDong: '', 
    hosoLienQuan: { deXuat: false, hopDong: false, unc: false, hoaDon: false, bienBan: false, khac: '' }
  });
  const [msg, setMsg] = useState('');
  const [socket, setSocket] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  // Theme management
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const fetchHoso = async (params = {}) => {
    const res = await axios.get('https://fe-bank-1.onrender.com/hoso', {
      params: { ...filters, page, limit, ...params }
    });
    setHosoList(res.data.data);
    setTotal(res.data.total);
  };

  useEffect(() => { 
    SessionManager.restoreSession();
    SessionManager.refreshSession();
    fetchHoso(); 
    
    // Kết nối Socket.IO để nhận notification và refresh dữ liệu
    const newSocket = io('https://fe-bank-1.onrender.com');
    setSocket(newSocket);
    
    const role = localStorage.getItem('role');
    if (role) {
      newSocket.emit('join-room', role);
    }
    
    // Lắng nghe notification và refresh dữ liệu ngay lập tức
    newSocket.on('notification', (notification) => {
      console.log('🔔 Received notification, refreshing data...', notification);
      fetchHoso(); // Refresh dữ liệu ngay khi nhận notification
    });
    
    return () => {
      if (role) {
        newSocket.emit('leave-room', role);
      }
      newSocket.close();
    };
  }, [page]);

  const handleFilterChange = e => setFilters({ ...filters, [e.target.name]: e.target.value });
  const handleSearch = () => { setPage(1); fetchHoso({ page: 1 }); };
  const handleReset = () => { setFilters({ soTaiKhoan: '', tenKhachHang: '', trangThai: '', phong: '', qlkh: '', fromDate: '', toDate: '' }); setPage(1); fetchHoso({ page: 1 }); };

  const openAdd = () => { 
    setEditHoso(null); 
    setForm({ 
      soTaiKhoan: '', 
      cif: '', 
      tenKhachHang: '', 
      soTienGiaiNgan: '', 
      loaiTien: '', 
      ngayGiaiNgan: '', 
      trangThai: 'moi', 
      phong: '', 
      qlkh: '', 
      hopDong: '', 
      hosoLienQuan: { deXuat: false, hopDong: false, unc: false, hoaDon: false, bienBan: false, khac: '' } 
    }); 
    setShowPopup(true); 
  };
  const openEdit = hoso => {
    setEditHoso(hoso);
    setForm({
      ...hoso,
      ngayGiaiNgan: hoso.ngayGiaiNgan ? hoso.ngayGiaiNgan.slice(0,10) : '',
      hosoLienQuan: hoso.hosoLienQuan && typeof hoso.hosoLienQuan === 'object'
        ? {
            deXuat: !!hoso.hosoLienQuan.deXuat,
            hopDong: !!hoso.hosoLienQuan.hopDong,
            unc: !!hoso.hosoLienQuan.unc,
            hoaDon: !!hoso.hosoLienQuan.hoaDon,
            bienBan: !!hoso.hosoLienQuan.bienBan,
            khac: hoso.hosoLienQuan.khac || ''
          }
        : { deXuat: false, hopDong: false, unc: false, hoaDon: false, bienBan: false, khac: '' }
    });
    setShowPopup(true);
  };
  const closePopup = () => { setShowPopup(false); setEditHoso(null); };

  const handleFormChange = e => {
    if (e.target.name.startsWith('hosoLienQuan.')) {
      const key = e.target.name.split('.')[1];
      setForm({ 
        ...form, 
        hosoLienQuan: { 
          ...(form.hosoLienQuan || {}), 
          [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value 
        } 
      });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleSave = async e => {
    e.preventDefault();
    try {
      // Chuẩn bị dữ liệu trước khi gửi
      const formData = {
        ...form,
        soTienGiaiNgan: form.soTienGiaiNgan ? Number(form.soTienGiaiNgan) : null,
        ngayGiaiNgan: form.ngayGiaiNgan ? new Date(form.ngayGiaiNgan) : null
      };
      
      console.log('📤 Sending form data:', formData);
      
      if (editHoso) {
        const response = await axios.put(`https://fe-bank-1.onrender.com/hoso/${editHoso._id}`, formData);
        console.log('✅ Update response:', response.data);
        setMsg('Đã cập nhật hồ sơ!');
      } else {
        const response = await axios.post('https://fe-bank-1.onrender.com/hoso', formData);
        console.log('✅ Create response:', response.data);
        setMsg('Đã thêm hồ sơ!');
      }
      closePopup();
      fetchHoso();
    } catch (err) {
      console.error('❌ Error saving hồ sơ:', err.response?.data || err.message);
      setMsg(`Lỗi lưu hồ sơ: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Bạn có chắc muốn xóa hồ sơ này?')) return;
            await axios.delete(`https://fe-bank-1.onrender.com/hoso/${id}`);
    setMsg('Đã xóa hồ sơ!');
    fetchHoso();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  return (
    <div className="cm-bg">
      {/* Theme Toggle Button */}
      <button 
        className="theme-toggle" 
        onClick={toggleTheme}
        title={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        title="Đăng xuất"
        style={{
          position: 'fixed',
          top: '20px',
          right: '80px',
          background: 'var(--magnetic-card-bg)',
          border: '2px solid var(--border-color)',
          borderRadius: '50px',
          padding: '12px',
          cursor: 'pointer',
          boxShadow: 'var(--magnetic-shadow)',
          transition: 'all 0.3s ease',
          zIndex: 1000,
          fontSize: '1.2rem',
          color: 'var(--text-primary)'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 12px 40px rgba(229, 62, 62, 0.3)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = 'var(--magnetic-shadow)';
        }}
      >
        🚪
      </button>

      <h2 style={{
        color: 'var(--magnetic-primary)',
        fontFamily: 'Montserrat, Segoe UI, Arial, sans-serif',
        fontWeight: 800,
        fontSize: '2.2rem',
        letterSpacing: '1px',
        textAlign: 'center',
        marginBottom: 32
      }}>Quản lý hồ sơ khách hàng</h2>
      <div className="cm-filter">
        <input name="soTaiKhoan" placeholder="Số tài khoản" value={filters.soTaiKhoan} onChange={handleFilterChange} />
        <input name="tenKhachHang" placeholder="Tên khách hàng" value={filters.tenKhachHang} onChange={handleFilterChange} />
        <input name="phong" placeholder="Phòng" value={filters.phong} onChange={handleFilterChange} />
        <input name="qlkh" placeholder="QLKH" value={filters.qlkh} onChange={handleFilterChange} />
        <select name="trangThai" value={filters.trangThai} onChange={handleFilterChange}>
          <option value="">Trạng thái</option>
          {trangThaiOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input name="fromDate" type="date" value={filters.fromDate} onChange={handleFilterChange} />
        <input name="toDate" type="date" value={filters.toDate} onChange={handleFilterChange} />
        <button onClick={handleSearch}><span role="img" aria-label="search">🔍</span> Tìm kiếm</button>
        <button onClick={handleReset}><span role="img" aria-label="reset">♻️</span> Làm mới</button>
        <button onClick={openAdd}><span role="img" aria-label="add">➕</span> Thêm mới</button>
      </div>
      <div className="cm-table-wrap">
        <table className="cm-table">
          <thead>
            <tr>
              <th style={{fontSize:'1.1rem'}}>STT</th>
              <th>Trạng thái</th>
              <th>Số tài khoản</th>
              <th>CIF</th>
              <th>Khách hàng</th>
              <th>Số tiền</th>
              <th>Loại tiền</th>
              <th>Ngày giải ngân</th>
              <th>Phòng</th>
              <th>QLKH</th>
              <th>HĐ</th>
              <th>Hồ sơ liên quan</th>
              <th>Ghi chú & Lý do từ chối</th>
              <th>Hành động</th>
            </tr>
          </thead>
<tbody>
  {hosoList.map((h, idx) => {
    // Fallback nếu hosoLienQuan bị undefined/null
    const hosoLienQuan = h.hosoLienQuan && typeof h.hosoLienQuan === 'object'
      ? h.hosoLienQuan
      : { deXuat: false, hopDong: false, unc: false, hoaDon: false, bienBan: false, khac: '' };
    return (
      <tr key={h._id}>
        <td>{(page-1)*limit + idx + 1}</td>
        <td>{h.trangThai}</td>
        <td>{h.soTaiKhoan}</td>
        <td>{h.cif}</td>
        <td>{h.tenKhachHang}</td>
        <td>{h.soTienGiaiNgan?.toLocaleString()}</td>
        <td>{h.loaiTien}</td>
        <td>{h.ngayGiaiNgan ? new Date(h.ngayGiaiNgan).toLocaleDateString() : ''}</td>
        <td>{h.phong}</td>
        <td>{h.qlkh}</td>
        <td>{h.hopDong}</td>
        <td>
          {[
            hosoLienQuan.deXuat && '✔️ Đề xuất',
            hosoLienQuan.hopDong && '✔️ HĐTD/ĐN BL',
            hosoLienQuan.unc && '✔️ UNC',
            hosoLienQuan.hoaDon && '✔️ HĐ giải ngân',
            hosoLienQuan.bienBan && '✔️ Biên bản',
            hosoLienQuan.khac && `✔️ Khác: ${hosoLienQuan.khac}`
          ].filter(Boolean).join(', ') || '-'}
        </td>
        <td>
          {h.bgdTuChoi?.lyDo && (
            <div style={{color: '#e53e3e', fontSize: '12px', marginBottom: '4px'}}>
              <strong>BGD từ chối:</strong> {h.bgdTuChoi.lyDo}
            </div>
          )}
          {h.qttdTuChoi?.lyDo && (
            <div style={{color: '#e53e3e', fontSize: '12px', marginBottom: '4px'}}>
              <strong>QTTD từ chối:</strong> {h.qttdTuChoi.lyDo}
            </div>
          )}
          {!h.bgdTuChoi?.lyDo && !h.qttdTuChoi?.lyDo && '-'}
        </td>
        <td>
          <button onClick={() => openEdit(h)} title="Sửa"><span role="img" aria-label="edit">✏️</span></button>
          <button onClick={() => handleDelete(h._id)} title="Xóa"><span role="img" aria-label="delete">🗑️</span></button>
        </td>
      </tr>
    );
  })}
</tbody>
        </table>
        <div className="cm-pagination">
          {Array.from({length: Math.ceil(total/limit)}, (_,i) => (
            <button key={i} className={page===i+1?'active':''} onClick={()=>setPage(i+1)}>{i+1}</button>
          ))}
        </div>
      </div>
      {showPopup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editHoso ? 'Sửa hồ sơ' : 'Thêm hồ sơ'}</h3>
              <button className="modal-close-btn" onClick={closePopup}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-grid">
                <input name="soTaiKhoan" placeholder="Số tài khoản" value={form.soTaiKhoan} onChange={handleFormChange} required />
                <input name="cif" placeholder="CIF" value={form.cif} onChange={handleFormChange} />
                <input name="tenKhachHang" placeholder="Tên khách hàng" value={form.tenKhachHang} onChange={handleFormChange} required />
                <input name="soTienGiaiNgan" placeholder="Số tiền giải ngân" value={form.soTienGiaiNgan} onChange={handleFormChange} type="number" />
                <input name="loaiTien" placeholder="Loại tiền" value={form.loaiTien} onChange={handleFormChange} />
                <input name="ngayGiaiNgan" type="date" value={form.ngayGiaiNgan} onChange={handleFormChange} />
                <input name="trangThai" placeholder="Trạng thái" value={form.trangThai} onChange={handleFormChange} />
                <input name="phong" placeholder="Phòng" value={form.phong} onChange={handleFormChange} />
                <input name="qlkh" placeholder="QLKH" value={form.qlkh} onChange={handleFormChange} />
                <input name="hopDong" placeholder="Hợp đồng" value={form.hopDong} onChange={handleFormChange} />
              </div>
              
              <div className="hoso-lien-quan-wrapper">
                <div className="hoso-lien-quan-header">
                  <span className="modal-icon">📁</span>
                  <span>Hồ sơ/chứng từ đi kèm khi giải ngân:</span>
                </div>
                <div className="hoso-lien-quan-grid">
                  <label>
                    <input type="checkbox" name="hosoLienQuan.deXuat" checked={(form.hosoLienQuan?.deXuat) ?? false} onChange={handleFormChange} disabled={editHoso && !['qlkh'].includes(localStorage.getItem('role'))} />
                    <span>Đề xuất</span>
                  </label>
                  <label>
                    <input type="checkbox" name="hosoLienQuan.hopDong" checked={(form.hosoLienQuan?.hopDong) ?? false} onChange={handleFormChange} disabled={editHoso && !['qlkh'].includes(localStorage.getItem('role'))} />
                    <span>HĐTD/ĐN BL</span>
                  </label>
                  <label>
                    <input type="checkbox" name="hosoLienQuan.unc" checked={(form.hosoLienQuan?.unc) ?? false} onChange={handleFormChange} disabled={editHoso && !['qlkh'].includes(localStorage.getItem('role'))} />
                    <span>UNC</span>
                  </label>
                  <label>
                    <input type="checkbox" name="hosoLienQuan.hoaDon" checked={(form.hosoLienQuan?.hoaDon) ?? false} onChange={handleFormChange} disabled={editHoso && !['qlkh'].includes(localStorage.getItem('role'))} />
                    <span>HĐ giải ngân</span>
                  </label>
                  <label>
                    <input type="checkbox" name="hosoLienQuan.bienBan" checked={(form.hosoLienQuan?.bienBan) ?? false} onChange={handleFormChange} disabled={editHoso && !['qlkh'].includes(localStorage.getItem('role'))} />
                    <span>Biên bản</span>
                  </label>
                  <label>
                    <input type="checkbox" name="hosoLienQuan.khac" checked={!!(form.hosoLienQuan?.khac)} onChange={e => handleFormChange({ target: { name: 'hosoLienQuan.khac', type: 'checkbox', checked: e.target.checked, value: e.target.checked ? (form.hosoLienQuan?.khac || '') : '' } })} disabled={editHoso && !['qlkh'].includes(localStorage.getItem('role'))} />
                    <span>Khác:</span>
                    <input type="text" name="hosoLienQuan.khac" value={form.hosoLienQuan?.khac || ''} onChange={handleFormChange} disabled={!form.hosoLienQuan?.khac || (editHoso && !['qlkh'].includes(localStorage.getItem('role')))} />
                  </label>
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="modal-confirm-btn"><span role="img" aria-label="save">💾</span> Lưu</button>
                <button type="button" className="modal-cancel-btn" onClick={closePopup}>Đóng</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <p className="cm-msg">{msg}</p>
      <Notification />
    </div>
  );
} 



