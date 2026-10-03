import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext, AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';

const DriverDashboard = () => {
  const { theme, toggleTheme, isColorBlind } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [driverName, setDriverName] = useState('คนขับ');
  
  // State สำหรับ Modal รายชื่อผู้โดยสาร
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedSch, setSelectedSch] = useState(null);


  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setDriverName(`${result.Sname} ${result.Lname}`); // จับ Sname กับ Lname มาต่อกัน
      }
    } catch (error) { 
      console.error("ดึงชื่อโปรไฟล์ไม่สำเร็จค่ะ:", error); 
    }
  };

  useEffect(() => {
    fetchProfile();   
    fetchSchedules(); 
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/driver/schedules', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setSchedules(result.data);
    } catch (error) {
      console.error('รามิสพบปัญหาการดึงรอบรถค่ะ:', error);
    }
  };

  const openTicketModal = async (schedule) => {
    setSelectedSch(schedule);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/driver/schedules/${schedule.Sch_code}/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setTickets(result.data);
        setIsModalOpen(true);
      }
    } catch (error) {
      alert("ดึงข้อมูลผู้โดยสารไม่สำเร็จค่ะ");
    }
  };

  const completeTrip = async (sch_code) => {
    if (!window.confirm("ยืนยันการปิดจ๊อบรอบเดินรถนี้หรือไม่ (สถานะตั๋วผู้โดยสารจะเปลี่ยนเป็นสำเร็จทั้งหมด)")) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/driver/schedules/${sch_code}/complete`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        alert("🎉 ปิดจ๊อบสำเร็จเรียบร้อยค่ะ!");
        fetchSchedules(); 
      } else {
        alert("ทำรายการไม่สำเร็จ: " + result.message);
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อค่ะ");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate('/login');
  };

  return (
    <div className={`app-wrapper ${theme} ${isColorBlind ? 'color-blind-mode' : ''}`}>
      {/* แถบเมนูด้านบนฉบับคนขับ */}
      <header className="top-navbar">
        <div className="brand-logo">MUT Shuttle Bus (Driver)</div>
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontWeight: 'bold' }}>{driverName}</span>
          <button className="theme-toggle-btn" onClick={toggleTheme}>โหมดสี</button>
          <button className="btn-danger outline-cb" onClick={handleLogout}>ออกจากระบบ</button>
        </div>
      </header>

      <main className="main-content">
        <div className="content-container">
          <h2 className="page-title">ตารางเดินรถของฉัน (วันนี้)</h2>
          
          <div className="content-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>เส้นทาง</th>
                  <th>สถานี (ขึ้น ➔ ลง)</th>
                  <th>ทะเบียนรถ</th>
                  <th>ที่นั่ง (เหลือ/ทั้งหมด)</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => (
                  <tr key={s.Sch_code}>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      {new Date(s.Time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </td>
                    <td>{s.route_name}</td>
                    <td>{s.start_station} ➔ {s.end_station}</td>
                    <td>{s.Bus_plate}</td>
                    <td>
                      <span className={`status-badge ${s.available_seats === 0 ? 'danger' : 'success'}`}>
                        {s.available_seats} / {s.total_seats}
                      </span>
                    </td>
                    <td>
                      <button className="btn-secondary" onClick={() => openTicketModal(s)} style={{ marginRight: '10px' }}>
                        ดูผู้โดยสาร
                      </button>
                      <button className="btn-primary" onClick={() => completeTrip(s.Sch_code)}>
                        จบงาน
                      </button>
                    </td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>วันนี้ไม่มีรอบวิ่งรถ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Popup แสดงรายชื่อผู้โดยสาร */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <h3>รายชื่อผู้โดยสารรอบ {new Date(selectedSch?.Time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</h3>
            
            <table className="data-table" style={{ marginTop: '15px' }}>
              <thead>
                <tr>
                  <th>ที่นั่ง</th>
                  <th>ชื่อผู้โดยสาร</th>
                  <th>ขึ้น ➔ ลง</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.Ticket_id}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{t.seat_no}</td>
                    <td>{t.U_Name}</td>
                    <td>{t.boarding_station} ➔ {t.destination_station}</td>
                    <td>
                      <span className={`status-badge ${t.tick_status === 'Check-in' ? 'success' : t.tick_status === 'Cancelled' ? 'danger' : ''}`}>
                        {t.tick_status}
                      </span>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center' }}>ยังไม่มีผู้โดยสารจองในรอบนี้ค่ะ</td></tr>
                )}
              </tbody>
            </table>
            
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;