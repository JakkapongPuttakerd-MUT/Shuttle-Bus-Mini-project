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

    // แยก Dropdown เป็น 2 ชุดตาม br_station และ de_station
    const [brStationList, setBrStationList] = useState([]);
    const [deStationList, setDeStationList] = useState([]);

    const [expandedId, setExpandedId] = useState(null);
    const [filterBr, setFilterBr] = useState('');
    const [filterDe, setFilterDe] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [selectedDeInModal, setSelectedDeInModal] = useState('');

    const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) setUserName(`${result.Sname} ${result.Lname}`);
        } catch (error) { setUserName('ผู้โดยสาร'); }
    };

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

            if (result.success) {
                const groupedMap = result.data.reduce((acc, curr) => {
                    const code = curr.Sch_code || curr.SCH_CODE;
                    if (!acc.has(code)) {
                        acc.set(code, { ...curr, steps: [] });
                    }
                    acc.get(code).steps.push({
                        br_code: curr.br_code || curr.BR_CODE,
                        br_name: curr.br_station_name || curr.BR_STATION_NAME,
                        de_code: curr.de_code || curr.DE_CODE,
                        de_name: curr.de_station_name || curr.DE_STATION_NAME,
                        time_to_next: curr.time_to_next || curr.TIME_TO_NEXT || 0
                    });
                    return acc;
                }, new Map());

                const schArray = Array.from(groupedMap.values()).map(sch => {
                    const startTime = new Date(sch.start_time || sch.START_TIME || sch.Time || sch.TIME);
                    let accTime = 0;
                    let timeline = [];

                    sch.steps.forEach((step, idx) => {
                        if (idx === 0) {
                            timeline.push({ code: step.br_code, name: step.br_name, arrTime: new Date(startTime.getTime()) });
                        }
                        accTime += step.time_to_next;
                        timeline.push({ code: step.de_code, name: step.de_name, arrTime: new Date(startTime.getTime() + accTime * 60000) });
                    });

                    const uniqueTimeline = timeline.filter((item, pos, arr) => pos === 0 || item.code !== arr[pos - 1].code);
                    return { ...sch, startTime, timeline: uniqueTimeline };
                });

                setSchedules(schArray);

                // สกัดชื่อสถานีแยกกัน ระหว่าง br_station และ de_station
                const brMap = new Map();
                const deMap = new Map();
                schArray.forEach(sch => {
                    sch.steps.forEach(step => {
                        if (step.br_code) brMap.set(step.br_code, step.br_name);
                        if (step.de_code) deMap.set(step.de_code, step.de_name);
                    });
                });

                setBrStationList(Array.from(brMap.entries()).map(([code, name]) => ({ code, name })));
                setDeStationList(Array.from(deMap.entries()).map(([code, name]) => ({ code, name })));
            }
        } catch (error) { console.error(error); }
    };

    const fetchMyTickets = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/member/my-tickets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setMyTickets(result.data);
            }
        } catch (error) { console.error(error); }
    };

    const openBookingModal = (sch, boardStation) => {
        setModalData({ sch, boardStation });
        setSelectedDeInModal('');
        setIsModalOpen(true);
    };

    const confirmBooking = async () => {
        if (!selectedDeInModal) return alert("กรุณาเลือกสถานีปลายทางที่ท่านต้องการลงค่ะ");

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/member/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    sch_code: modalData.sch.Sch_code || modalData.sch.SCH_CODE,
                    br_station: modalData.boardStation.code,
                    de_station: selectedDeInModal
                })
            });
            const result = await response.json();

            if (result.success) {
                alert("🎉 " + result.message);
                setIsModalOpen(false);
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

    const now = new Date();
    const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60000);

    // ตัวกรองที่เช็ก br_station และ de_station แยกกัน
    const filteredSchedules = schedules.filter(s => {
        const hasAvailableStation = s.timeline.some((st, i) => {
            return i < s.timeline.length - 1 && st.arrTime > fifteenMinsFromNow;
        });
        if (!hasAvailableStation) return false;

        let passBr = true;
        let passDe = true;

        if (filterBr) {
            // เช็กว่ามีใน br_code
            passBr = s.steps.some(step => String(step.br_code) === String(filterBr));
        }
        if (filterDe) {
            // เช็กว่ามีใน de_code
            passDe = s.steps.some(step => String(step.de_code) === String(filterDe));
        }

        if (!passBr || !passDe) return false;

        // ถ้าเลือกทั้งขึ้นและลง เช็กเพิ่มเติมว่าป้ายขึ้นต้องมาก่อนป้ายลง
        if (filterBr && filterDe) {
            const brIdx = s.timeline.findIndex(t => String(t.code) === String(filterBr));
            const deIdx = s.timeline.findIndex(t => String(t.code) === String(filterDe));
            if (brIdx >= deIdx) return false;
        }

        return true;
    });

    let availableDestinations = [];
    if (modalData) {
        const boardIdx = modalData.sch.timeline.findIndex(t => t.code === modalData.boardStation.code);
        availableDestinations = modalData.sch.timeline.slice(boardIdx + 1);
    }

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
                        <h2 className="page-title">ค้นหาและจองรอบรถ (วันนี้)</h2>

                        <div className="content-card" style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>📍 ค้นหาสถานีที่คุณจะขึ้น:</label>
                                <select className="select-input" value={filterBr} onChange={(e) => setFilterBr(e.target.value)}>
                                    <option value="">-- แสดงทุกสถานีต้นทาง --</option>
                                    {brStationList.map(st => <option key={st.code} value={st.code}>{st.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>🏁 ค้นหาสถานีที่คุณจะลง:</label>
                                <select className="select-input" value={filterDe} onChange={(e) => setFilterDe(e.target.value)}>
                                    <option value="">-- แสดงทุกสถานีปลายทาง --</option>
                                    {deStationList.map(st => <option key={st.code} value={st.code}>{st.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="content-card">
                            <table className="data-table">
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                                        <th style={{ padding: '12px' }}>เวลาออกรถต้นทาง</th>
                                        <th style={{ padding: '12px' }}>เส้นทางหลัก</th>
                                        <th style={{ padding: '12px' }}>ข้อมูลรถ</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>ที่นั่งว่าง</th>
                                        <th style={{ padding: '12px', textAlign: 'center' }}>เลือกสถานี</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSchedules.map((s, index) => {
                                        const code = s.Sch_code || s.SCH_CODE;
                                        const isExpanded = expandedId === code;
                                        const isFull = (s.available_seats || 0) <= 0;

                                        const stationsDisplay = s.timeline.map(t => t.name).join(' ➔ ');

                                        return (
                                            <React.Fragment key={index}>
                                                <tr style={{ borderBottom: '1px solid #ddd', backgroundColor: isExpanded ? '#f0f8ff' : 'white', opacity: isFull ? 0.6 : 1 }}>
                                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                                        {s.startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <div><strong>{s.route_name || s.ROUTE_NAME}</strong></div>
                                                        <div style={{ fontSize: '0.85em', color: 'var(--primary-color)', marginTop: '5px', lineHeight: '1.4' }}>
                                                            {stationsDisplay}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>{s.Bus_type || s.BUS_TYPE} <br /><span style={{ fontSize: '0.85em', color: 'gray' }}>({s.Bus_plate || s.BUS_PLATE})</span></td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <span className={`status-badge ${isFull ? 'danger' : 'success'}`}>
                                                            {s.available_seats || 0} / {s.total_seats || s.TOTAL_SEATS}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <button
                                                            className={isExpanded ? "btn-secondary" : "btn-primary"}
                                                            onClick={() => toggleExpand(code)}
                                                        >
                                                            {isExpanded ? '▲ ซ่อนป้ายรถ' : '▼ ดูป้าย / จองตั๋ว'}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="5" style={{ padding: '15px 25px', backgroundColor: '#fafafa', borderBottom: '2px solid #ccc' }}>
                                                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>กรุณาเลือกป้ายที่คุณต้องการ "ขึ้นรถ"</h4>
                                                            <table className="data-table" style={{ width: '100%', border: '1px solid #eee' }}>
                                                                <thead>
                                                                    <tr style={{ backgroundColor: '#e9e9e9' }}>
                                                                        <th style={{ padding: '8px' }}>ป้ายสถานี</th>
                                                                        <th style={{ padding: '8px' }}>เวลารถถึงป้าย (โดยประมาณ)</th>
                                                                        <th style={{ padding: '8px', textAlign: 'center' }}>สถานะการจอง</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {s.timeline.map((st, i) => {
                                                                        const isLastStation = i === s.timeline.length - 1;
                                                                        const isTooLate = st.arrTime <= fifteenMinsFromNow;
                                                                        const isDisabled = isFull || isTooLate || isLastStation;

                                                                        let btnText = 'จองที่นั่ง (ขึ้นป้ายนี้)';
                                                                        if (isLastStation) btnText = 'ปลายทางสุดสาย (ลงอย่างเดียว)';
                                                                        else if (isFull) btnText = 'รถเต็มแล้ว';
                                                                        else if (isTooLate) btnText = 'ใกล้ถึงป้าย/ออกไปแล้ว';

                                                                        return (
                                                                            <tr key={i} style={{ borderBottom: '1px solid #eee', opacity: isLastStation ? 0.6 : 1 }}>
                                                                                <td style={{ padding: '8px', fontWeight: 'bold' }}>📍 {st.name}</td>
                                                                                <td style={{ padding: '8px', color: 'var(--primary-color)' }}>
                                                                                    {st.arrTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                                                </td>
                                                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                                                    <button
                                                                                        className={isLastStation ? "btn-secondary" : "btn-primary"}
                                                                                        style={{ padding: '5px 10px', fontSize: '0.85em', opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                                                                        disabled={isDisabled}
                                                                                        onClick={() => !isLastStation && openBookingModal(s, st)}
                                                                                    >
                                                                                        {btnText}
                                                                                    </button>
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
                                    {filteredSchedules.length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>ไม่พบรอบรถที่ผ่านสถานีที่คุณค้นหา หรือหมดเวลาจองแล้วค่ะ</td></tr>
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
                                        <th>รอบเวลา (ต้นทาง)</th>
                                        <th>สถานี (ขึ้น ➔ ลง)</th>
                                        <th>ข้อมูลรถ</th>
                                        <th>สถานะ</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myTickets.map(t => {
                                        const now = new Date();
                                        const schTime = new Date(t.schedule_time || t.SCHEDULE_TIME);
                                        const waitMins = t.wait_minutes || t.WAIT_MINUTES || 0;

                                        // คำนวณเวลาที่ผู้โดยสารต้องไปรอรถ (เวลาต้นทาง + นาทีเดินทาง)
                                        const boardingTime = new Date(schTime.getTime() + waitMins * 60000);

                                        // ถ้าเลยเวลาที่รถจะมารับแล้ว ถึงจะยกเลิกตั๋วไม่ได้
                                        const isPast = boardingTime <= now;
                                        const canCancel = t.tick_status === 'Booked' && !isPast;

                                        return (
                                            <tr key={t.Ticket_id || t.TICKET_ID}>
                                                <td style={{ padding: '12px' }}>
                                                    <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '1.1em' }}>
                                                        {boardingTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                    </div>
                                                    <div style={{ fontSize: '0.85em', color: 'gray' }}>
                                                        {boardingTime.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div style={{ fontSize: '0.8em', color: '#888', marginTop: '4px' }}>
                                                        (เวลาออกต้นทาง: {schTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)
                                                    </div>
                                                </td>
                                                <td style={{ color: 'var(--primary-color)', fontWeight: 'bold', padding: '12px' }}>
                                                    {t.br_station_name || t.BR_STATION_NAME} ➔ {t.de_station_name || t.DE_STATION_NAME}
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <div><strong>{t.Bus_type || t.BUS_TYPE}</strong></div>
                                                    <div style={{ fontSize: '0.9em', color: 'gray' }}>ทะเบียน: {t.Bus_plate || t.BUS_PLATE}</div>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <span className={`status-badge ${t.tick_status === 'Check-in' || t.tick_status === 'Completed' ? 'success' : t.tick_status === 'Cancelled' ? 'danger' : ''}`}>
                                                        {t.tick_status || t.TICK_STATUS}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    {canCancel ? (
                                                        <button className="btn-danger outline-cb" onClick={() => cancelTicket(t.Ticket_id || t.TICKET_ID)}>❌ ยกเลิก</button>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-color)', fontSize: '0.9em', opacity: 0.6 }}>ทำรายการไม่ได้</span>
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

            {isModalOpen && modalData && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <h3>ระบุป้ายลงรถ เพื่อยืนยันการจอง</h3>
                        <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px', lineHeight: '1.6' }}>
                            <strong style={{ color: 'var(--primary-color)' }}>🕒 เวลาที่คุณต้องไปรอรถ:</strong> <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{modalData.boardStation.arrTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span><br />
                            <span style={{ fontSize: '0.85em', color: 'gray' }}>(รถออกจากต้นทาง: {modalData.sch.startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)</span><br /><br />

                            <strong>📍 จุดขึ้นรถของคุณ:</strong> <span style={{ color: 'var(--primary-color)' }}>{modalData.boardStation.name}</span><br />
                            <strong>รถบัส:</strong> {modalData.sch.Bus_type || modalData.sch.BUS_TYPE} ({modalData.sch.Bus_plate || modalData.sch.BUS_PLATE})
                        </div>

                        <div className="input-group">
                            <label style={{ fontWeight: 'bold', fontSize: '1.1em' }}>🏁 คุณต้องการลงที่ป้ายไหนคะ?</label>
                            <select
                                className="select-input"
                                value={selectedDeInModal}
                                onChange={(e) => setSelectedDeInModal(e.target.value)}
                            >
                                <option value="">-- กรุณาเลือกป้ายที่จะลง --</option>
                                {availableDestinations.map(st => (
                                    <option key={st.code} value={st.code}>➔ {st.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="modal-actions" style={{ marginTop: '20px' }}>
                            <button type="button" className="btn-primary" onClick={confirmBooking}>ยืนยันการจอง</button>
                            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PassengerDashboard;