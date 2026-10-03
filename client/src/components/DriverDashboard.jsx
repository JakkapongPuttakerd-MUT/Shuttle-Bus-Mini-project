import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext, AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';

const DriverDashboard = () => {
  const { theme, toggleTheme, isColorBlind } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [driverName, setDriverName] = useState('คนขับ');


  const [expandedId, setExpandedId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedSch, setSelectedSch] = useState(null);

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setDriverName(`${result.Sname} ${result.Lname}`); 
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
    const code = schedule.Sch_code || schedule.SCH_CODE;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/driver/schedules/${code}/tickets`, {
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

  const renderDriverSchedules = () => {
    const groupedMap = schedules.reduce((acc, curr) => {
      const code = curr.Sch_code || curr.SCH_CODE;
      if (!acc.has(code)) acc.set(code, []);
      acc.get(code).push(curr);
      return acc;
    }, new Map());

    const sortedGroups = Array.from(groupedMap.values());

    if (sortedGroups.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '30px', backgroundColor: 'white', borderRadius: '8px' }}>
          วันนี้ไม่มีรอบวิ่งรถ พักผ่อนได้เลยค่ะบอส! 😴
        </div>
      );
    }

    return (
      <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr>
            <th>เวลาออกรถ</th>
            <th>เส้นทาง</th>
            <th>ข้อมูลรถ</th>
            <th style={{ textAlign: 'center' }}>ที่นั่ง (ว่าง/ทั้งหมด)</th>
            <th style={{ textAlign: 'center' }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map((group, index) => {
            let accumulatedMinutes = 0;
            const first = group[0];
            const code = first.Sch_code || first.SCH_CODE;
            const startTime = new Date(first.start_time || first.START_TIME || first.Time || first.TIME);
            const isExpanded = expandedId === code;

            return (
              <React.Fragment key={index}>
                <tr style={{ borderBottom: '1px solid #ddd', backgroundColor: isExpanded ? '#f0f8ff' : 'white' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </td>
                  <td style={{ padding: '12px' }}>{first.route_name || first.ROUTE_NAME}</td>
                  <td style={{ padding: '12px' }}>
                    <div><strong>{first.Bus_type || first.BUS_TYPE}</strong></div>
                    <div style={{ fontSize: '0.9em', color: 'gray' }}>ทะเบียน: {first.Bus_plate || first.BUS_PLATE}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span className={`status-badge ${(first.available_seats || 0) === 0 ? 'danger' : 'success'}`}>
                      {first.available_seats || 0} / {first.total_seats || first.TOTAL_SEATS}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      className={isExpanded ? "btn-secondary" : "btn-primary"} 
                      onClick={() => toggleExpand(code)} 
                      style={{ marginRight: '5px', padding: '5px 10px', fontSize: '0.9em' }}
                    >
                      {isExpanded ? '▲ ซ่อนป้าย' : '▼ ดูป้าย'}
                    </button>
                    <button 
                      className="btn-secondary" 
                      onClick={() => openTicketModal(first)} 
                      style={{ marginRight: '5px', padding: '5px 10px', fontSize: '0.9em' }}
                    >
                      📋 ผู้โดยสาร
                    </button>
                    <button 
                      className="btn-danger" 
                      onClick={() => completeTrip(code)}
                      style={{ padding: '5px 10px', fontSize: '0.9em' }}
                    >
                      ✅ จบงาน
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan="5" style={{ padding: '15px 25px', backgroundColor: '#fafafa', borderBottom: '2px solid #ccc' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>📍 รายละเอียดจุดจอดรถ (รหัสรอบ: {code})</h4>
                      <table className="data-table" style={{ width: '100%', border: '1px solid #eee' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#e9e9e9' }}>
                            <th style={{ padding: '8px', textAlign: 'center', width: '10%' }}>ลำดับ</th>
                            <th style={{ padding: '8px', width: '40%' }}>สถานี (ขึ้น ➔ ลง)</th>
                            <th style={{ padding: '8px', width: '25%' }}>ใช้เวลาเดินทาง</th>
                            <th style={{ padding: '8px', width: '25%' }}>เวลาถึงโดยประมาณ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.map((step, i) => {
                            const timeToNext = step.time_to_next || step.TIME_TO_NEXT || 0;
                            const arrivalTime = new Date(startTime.getTime() + accumulatedMinutes * 60000);
                            accumulatedMinutes += timeToNext;

                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{step.SEQ_NO || step.SEQ_NO}</td>
                                <td style={{ padding: '8px' }}>{step.br_station_name || step.BR_STATION_NAME} ➔ {step.de_station_name || step.DE_STATION_NAME}</td>
                                <td style={{ padding: '8px', color: '#666' }}>{timeToNext > 0 ? `+${timeToNext} นาที` : 'ถึงที่หมาย'}</td>
                                <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                  {arrivalTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className={`app-wrapper ${theme} ${isColorBlind ? 'color-blind-mode' : ''}`}>
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
            {renderDriverSchedules()}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <h3>รายชื่อผู้โดยสารรอบ {new Date(selectedSch?.start_time || selectedSch?.START_TIME || selectedSch?.Time || selectedSch?.TIME).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</h3>

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