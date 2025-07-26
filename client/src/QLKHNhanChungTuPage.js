import React, { useEffect, useState } from 'react';
import './AdminPage.css';
import Notification from './components/Notification';
import { io } from 'socket.io-client';

export default function QLKHNhanChungTuPage() {
  const [hoSos, setHoSos] = useState([]);
  const [selectedHoSo, setSelectedHoSo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState(''); // 'accept' | 'reject'
  const [note, setNote] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  // Lấy danh sách hồ sơ chờ QLKH nhận chứng từ
  const fetchHosos = () => {
    fetch('/hoso/cho-qlkh-nhan-chung-tu')
      .then(res => res.json())
      .then(data => setHoSos(data))
      .catch(() => setHoSos([]));
  };
  useEffect(() => {
    fetchHosos();
    
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
      fetchHosos(); // Refresh dữ liệu ngay khi nhận notification
    });
    
    return () => {
      if (role) {
        newSocket.emit('leave-room', role);
      }
      newSocket.close();
    };
  }, []);

  // Xử lý đồng ý/từ chối
  const handleAction = (hoso, act) => {
    setSelectedHoSo(hoso);
    setAction(act);
    setShowModal(true);
  };

  // Xác nhận thao tác
  const handleConfirm = () => {
    const user = localStorage.getItem('username') || '';
    const url =
      action === 'accept'
        ? `/hoso/${selectedHoSo._id}/xac-nhan-nhan-chung-tu`
        : `/hoso/${selectedHoSo._id}/tu-choi-nhan-chung-tu`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, note }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Lỗi cập nhật!');
        setShowModal(false);
        setNote('');
        setSelectedHoSo(null);
        fetchHosos();
        alert('Thao tác thành công!');
      })
      .catch(() => alert('Lỗi thao tác!'));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--magnetic-bg)',
      fontFamily: 'var(--magnetic-font)',
      transition: 'all 0.3s ease',
      position: 'relative',
      paddingBottom: 40
    }}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        title={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
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
        onMouseOver={e => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 12px 40px rgba(168, 85, 247, 0.3)';
        }}
        onMouseOut={e => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = 'var(--magnetic-shadow)';
        }}
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
        onMouseOver={e => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 12px 40px rgba(229, 62, 62, 0.3)';
        }}
        onMouseOut={e => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = 'var(--magnetic-shadow)';
        }}
      >
        🚪
      </button>
      <div className="main-content">
        <div className="users-section">
          <div className="section-header">
            <h2>QLKH nhận chứng từ</h2>
          </div>
          <div className="responsive-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Số tài khoản</th>
                  <th>Khách hàng</th>
                  <th>Ngày giải ngân</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {hoSos.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Không có hồ sơ chờ nhận chứng từ</td>
                  </tr>
                ) : (
                  hoSos.map((hoso) => (
                    <tr key={hoso._id}>
                      <td>{hoso.soTaiKhoan || ''}</td>
                      <td>{hoso.tenKhachHang}</td>
                      <td>{hoso.ngayGiaiNgan ? new Date(hoso.ngayGiaiNgan).toLocaleDateString() : ''}</td>
                      <td>
                        <span className={`status-badge status-${hoso.trangThai}`}>{hoso.trangThai}</span>
                      </td>
                      <td>
                        <button className="action-btn edit-btn" onClick={() => handleAction(hoso, 'accept')}>Đồng ý</button>
                        <button className="action-btn delete-btn" onClick={() => handleAction(hoso, 'reject')}>Từ chối</button>
                        <button className="action-btn" onClick={() => { setSelectedHoSo(hoso); setAction('detail'); setShowModal(true); }}>Xem chi tiết</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Modal xác nhận/từ chối/chi tiết */}
          {showModal && action === 'reject' && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <span className="modal-icon">❌</span>
                  <h3 className="modal-title">Nhập lý do từ chối</h3>
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Nhập lý do từ chối"
                  className="modal-textarea"
                  onFocus={e => e.target.style.border = '2px solid var(--magnetic-primary)'}
                  onBlur={e => e.target.style.border = '1.5px solid var(--border-color)'}
                />
                <div className="modal-actions">
                  <button className="modal-confirm-btn" onClick={handleConfirm}>Xác nhận</button>
                  <button className="modal-cancel-btn" onClick={() => setShowModal(false)}>Hủy</button>
                </div>
              </div>
            </div>
          )}
          {showModal && action === 'accept' && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <span className="modal-icon">✅</span>
                  <h3 className="modal-title">Xác nhận nhận chứng từ?</h3>
                </div>
                <div className="modal-actions">
                  <button className="modal-confirm-btn" onClick={handleConfirm}>Xác nhận</button>
                  <button className="modal-cancel-btn" onClick={() => setShowModal(false)}>Hủy</button>
                </div>
              </div>
            </div>
          )}
          {showModal && action === 'detail' && selectedHoSo && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <span className="modal-icon">📄</span>
                  <h3 className="modal-title">Chi tiết hồ sơ</h3>
                </div>
                <div className="modal-details">
                  <div className="detail-row">
                    <span className="detail-label">Số tài khoản:</span>
                    <span className="detail-value">{selectedHoSo.soTaiKhoan || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">CIF:</span>
                    <span className="detail-value">{selectedHoSo.cif || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tên khách hàng:</span>
                    <span className="detail-value">{selectedHoSo.tenKhachHang || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Số tiền giải ngân:</span>
                    <span className="detail-value">{selectedHoSo.soTienGiaiNgan?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Loại tiền:</span>
                    <span className="detail-value">{selectedHoSo.loaiTien || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Ngày giải ngân:</span>
                    <span className="detail-value">{selectedHoSo.ngayGiaiNgan ? new Date(selectedHoSo.ngayGiaiNgan).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Trạng thái:</span>
                    <span className="detail-value">{selectedHoSo.trangThai || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phòng:</span>
                    <span className="detail-value">{selectedHoSo.phong || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">QLKH:</span>
                    <span className="detail-value">{selectedHoSo.qlkh || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Hợp đồng:</span>
                    <span className="detail-value">{selectedHoSo.hopDong || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Ghi chú:</span>
                    <span className="detail-value">{selectedHoSo.ghiChu || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Ngày tạo:</span>
                    <span className="detail-value">{selectedHoSo.createdAt ? new Date(selectedHoSo.createdAt).toLocaleString() : '-'}</span>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="modal-confirm-btn" onClick={() => setShowModal(false)}>Đóng</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Notification />
    </div>
  );
} 