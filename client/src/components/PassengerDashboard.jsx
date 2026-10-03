import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext, AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';

const PassengerDashboard = () => {
    const { theme, toggleTheme, isColorBlind } = useContext(ThemeContext);
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('book');
    const [userName, setUserName] = useState('กำลังโหลด...');
    const [schedules, setSchedules] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedSch, setSelectedSch] = useState(null);

    // 1. ฟังก์ชันดึงชื่อจริงจากฐานข้อมูล
    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setUserName(`${result.Sname} ${result.Lname}`);
            } else {
                setUserName('ผู้โดยสาร (ไม่พบชื่อ)');
            }
        } catch (error) {
            console.error("ดึงชื่อโปรไฟล์ไม่สำเร็จค่ะ:", error);
            setUserName('ผู้โดยสาร');
        }
    };

    // 2. เรียกใช้งานทุกอย่างตอนเปิดหน้าเว็บ
    useEffect(() => {
        fetchProfile();
        fetchSchedules();
        fetchMyTickets();
    }, []);
    const fetchSchedules = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/member/schedules', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) setSchedules(result.data);
        } catch (error) { console.error(error); }
    };

    const fetchMyTickets = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/member/my-tickets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) setMyTickets(result.data);
        } catch (error) { console.error(error); }
    };

    const handleBookClick = (schedule) => {
        setSelectedSch(schedule);
        setIsConfirmModalOpen(true);
    };

    const confirmBooking = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/member/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ sch_code: selectedSch.Sch_code })
            });
            const result = await response.json();
            if (result.success) {
                alert("🎉 " + result.message);
                setIsConfirmModalOpen(false);
                fetchSchedules();
                fetchMyTickets();
                setActiveTab('mytickets');
            } else {
                alert("จองไม่สำเร็จ: " + result.message);
            }
        } catch (error) { alert("เกิดข้อผิดพลาดในการเชื่อมต่อค่ะ"); }
    };

    const cancelTicket = async (ticketId) => {
        if (!window.confirm("ต้องการยกเลิกตั๋วใบนี้ใช่ไหมคะ?")) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/member/tickets/${ticketId}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                alert("ยกเลิกตั๋วสำเร็จค่ะ");
                fetchMyTickets();
                fetchSchedules();
            }
        } catch (error) { alert("เกิดข้อผิดพลาดค่ะ"); }
    };

    const handleLogout = () => {
        localStorage.clear();
        logout();
        navigate('/login');
    };

    // ตัวกรองเวลา: ซ่อนรถที่ออกไปแล้ว หรือเวลาเหลือไม่ถึง 10 นาที
    const now = new Date();
    const tenMinsFromNow = new Date(now.getTime() + 10 * 60000);
    const availableSchedules = schedules.filter(s => new Date(s.Time) > tenMinsFromNow);

    return (
        <div className={`app-wrapper ${theme} ${isColorBlind ? 'color-blind-mode' : ''}`}>
            <header className="top-navbar">
                <div className="brand-logo">MUT Shuttle Bus</div>
                <nav className="main-nav">
                    <button className={`nav-link ${activeTab === 'book' ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setActiveTab('book')}>จองตั๋ว</button>
                    <button className={`nav-link ${activeTab === 'mytickets' ? 'active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setActiveTab('mytickets')}>ตั๋วของฉัน</button>
                </nav>
                <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontWeight: 'bold' }}> {userName}</span>
                    <button className="theme-toggle-btn" onClick={toggleTheme}>โหมดสี</button>
                    <button className="btn-danger outline-cb" onClick={handleLogout}>ออกจากระบบ</button>
                </div>
            </header>

            <main className="main-content">
                {activeTab === 'book' && (
                    <div className="content-container">
                        <h2 className="page-title">รอบรถที่เปิดให้จอง (วันนี้)</h2>
                        <div className="content-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>เวลาออกรถ</th>
                                        <th>สถานี (ขึ้น ➔ ลง)</th>
                                        <th>ทะเบียนรถ</th>
                                        <th>ที่นั่ง (เหลือ/ทั้งหมด)</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableSchedules.map(s => {
                                        // สร้างตัวแปรเช็กเวลาและที่นั่ง
                                        const schTime = new Date(s.Time);
                                        const isTooLate = schTime <= tenMinsFromNow;
                                        const isFull = s.available_seats <= 0;
                                        const isDisabled = isTooLate || isFull;

                                        return (
                                            <tr key={s.Sch_code}>
                                                <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                                    {schTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </td>
                                                <td>{s.start_station} ➔ {s.end_station}</td>
                                                <td>{s.Bus_plate}</td>
                                                <td>
                                                    <span className={`status-badge ${isFull ? 'danger' : 'success'}`}>
                                                        {s.available_seats} / {s.total_seats}
                                                    </span>
                                                </td>
                                                <td>
                                                    {/* ปุ่มใหม่ที่ฉลาดขึ้นค่ะ */}
                                                    <button
                                                        className="btn-primary"
                                                        onClick={() => handleBookClick(s)}
                                                        disabled={isDisabled}
                                                        style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                                    >
                                                        {isFull ? 'เต็มแล้ว' : isTooLate ? 'หมดเวลาจอง' : 'จองที่นั่ง'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {availableSchedules.length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>ไม่มีรอบรถที่สามารถจองได้ในขณะนี้ค่ะ (อาจหมดรอบหรือใกล้เวลาออกเกินไป)</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'mytickets' && (
                    <div className="content-container">
                        <h2 className="page-title">ประวัติตั๋วโดยสารของฉัน</h2>
                        <div className="content-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>รอบเวลา</th>
                                        <th>สถานี (ขึ้น ➔ ลง)</th>
                                        <th>ทะเบียนรถ</th>
                                        <th>สถานะ</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myTickets.map(t => {
                                        const isPast = new Date(t.schedule_time) <= now;
                                        const canCancel = t.tick_status === 'Booked' && !isPast;
                                        return (
                                            <tr key={t.Ticket_id}>
                                                <td>{new Date(t.schedule_time).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.</td>
                                                <td>{t.boarding_station} ➔ {t.destination_station}</td>
                                                <td>{t.Bus_plate}</td>
                                                <td>
                                                    <span className={`status-badge ${t.tick_status === 'Check-in' || t.tick_status === 'Completed' ? 'success' : t.tick_status === 'Cancelled' ? 'danger' : ''}`}>
                                                        {t.tick_status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {canCancel ? (
                                                        <button className="btn-danger outline-cb" onClick={() => cancelTicket(t.Ticket_id)}> ยกเลิก</button>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-color)', fontSize: '0.9em', opacity: 0.6 }}>ไม่สามารถทำรายการ</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {myTickets.length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>คุณยังไม่มีประวัติการจองตั๋วค่ะ</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {isConfirmModalOpen && selectedSch && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h3>ยืนยันการจองตั๋วโดยสาร</h3>
                        <p style={{ margin: '15px 0' }}>
                            <strong>เวลา:</strong> {new Date(selectedSch.Time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.<br />
                            <strong>เส้นทาง:</strong> {selectedSch.start_station} ➔ {selectedSch.end_station}<br />
                            <strong>รถทะเบียน:</strong> {selectedSch.Bus_plate}
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn-primary" onClick={confirmBooking}>ยืนยันการจอง</button>
                            <button type="button" className="btn-secondary" onClick={() => setIsConfirmModalOpen(false)}>ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PassengerDashboard;