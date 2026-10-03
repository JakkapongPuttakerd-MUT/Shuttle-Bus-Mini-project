import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';

const TicketManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);

  const [searchName, setSearchName] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterBoarding, setFilterBoarding] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterBusPlate, setFilterBusPlate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:5000/api/admin/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setTickets(result.data);
        setFilteredTickets(result.data);
      } else {
        alert("ดึงข้อมูลตั๋วไม่สำเร็จ: " + result.message);
      }
    } catch (error) {
      console.error("รามิสพบปัญหาการดึงข้อมูลตั๋ว:", error);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    let result = tickets;

    if (searchName) {
      result = result.filter(t => (t.U_Name || '').toLowerCase().includes(searchName.toLowerCase()));
    }
    if (filterDate) {

      result = result.filter(t => {
        if (!t.schedule_time) return false;
        const ticketDate = new Date(t.schedule_time).toISOString().split('T')[0];
        return ticketDate === filterDate;
      });
    }
    if (filterDriver) {
      result = result.filter(t => (t.driver_name || '').includes(filterDriver));
    }
    if (filterBoarding) {
      result = result.filter(t => (t.boarding_station || '').includes(filterBoarding));
    }
    if (filterDestination) {
      result = result.filter(t => (t.destination_station || '').includes(filterDestination));
    }
    if (filterBusPlate) {
      result = result.filter(t => (t.Bus_plate || t.Bus_name || '').includes(filterBusPlate));
    }
    if (filterStatus) {
      result = result.filter(t => (t.tick_status || '') === filterStatus);
    }

    setFilteredTickets(result);
  }, [searchName, filterDate, filterDriver, filterBoarding, filterDestination, filterBusPlate, filterStatus, tickets]);


  const uniqueOptions = (key) => [...new Set(tickets.map(t => t[key]).filter(Boolean))];

  return (
    <div className="content-container">
      <div className="page-header">
        <h2 className="page-title">ระบบจัดการตั๋วโดยสาร</h2>
      </div>

      <div className="content-card" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        <div className="input-group" style={{ flex: '1 1 200px' }}>
          <label>ค้นหาชื่อผู้จอง</label>
          <input type="text" placeholder="พิมพ์ชื่อผู้จอง..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
        </div>
        <div className="input-group" style={{ flex: '1 1 150px' }}>
          <label>📅 วันที่เดินทาง</label>
          <DatePicker
            selected={filterDate ? new Date(filterDate) : null}
            onChange={(date) => {
              if (date) {
                const offset = date.getTimezoneOffset() * 60000;
                const localDate = new Date(date - offset).toISOString().split('T')[0];
                setFilterDate(localDate);
              } else {
                setFilterDate('');
              }
            }}
            dateFormat="dd/MM/yyyy"
            className="select-input"
            placeholderText="คลิกเลือกวันที่..."
            isClearable
          />
        </div>
        <div className="input-group" style={{ flex: '1 1 150px' }}>
          <label>สถานีขึ้น</label>
          <select value={filterBoarding} onChange={(e) => setFilterBoarding(e.target.value)} className="select-input">
            <option value="">ทั้งหมด</option>
            {uniqueOptions('boarding_station').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 150px' }}>
          <label>สถานีลง</label>
          <select value={filterDestination} onChange={(e) => setFilterDestination(e.target.value)} className="select-input">
            <option value="">ทั้งหมด</option>
            {uniqueOptions('destination_station').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 150px' }}>
          <label>ทะเบียนรถ</label>
          <select value={filterBusPlate} onChange={(e) => setFilterBusPlate(e.target.value)} className="select-input">
            <option value="">ทั้งหมด</option>
            {uniqueOptions('Bus_plate').map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 150px' }}>
          <label>คนขับ</label>
          <select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value)} className="select-input">
            <option value="">ทั้งหมด</option>
            {uniqueOptions('driver_name').map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 150px' }}>
          <label>สถานะตั๋ว</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="select-input">
            <option value="">ทั้งหมด</option>
            <option value="Booked">จองแล้ว (Booked)</option>
            <option value="Check-in">ใช้แล้ว (Check-in)</option>
            <option value="Cancelled">ยกเลิก (Cancelled)</option>
            <option value="No Show">หมดเวลา (No Show)</option>
          </select>
        </div>
      </div>

      {/* ตารางแสดงข้อมูล */}
      <div className="content-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ชื่อผู้จอง</th>
              <th>สถานีขึ้น ➔ ปลายทาง</th>
              <th>วันและเวลา (รอบรถ)</th>
              <th>ทะเบียนรถ</th>
              <th>คนขับ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => (
              <tr key={t.Ticket_id}>
                <td style={{ fontWeight: 'bold' }}>{t.U_Name}</td>
                <td>{t.boarding_station} ➔ {t.destination_station}</td>
                <td>{new Date(t.schedule_time).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td>{t.Bus_plate || t.Bus_name || '-'}</td>
                <td>{t.driver_name || '-'}</td>
                <td>
                  <span className={`status-badge ${t.tick_status === 'Check-in' ? 'success' : t.tick_status === 'Cancelled' ? 'danger' : ''}`}>
                    {t.tick_status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>ไม่พบข้อมูลตั๋วที่ตรงกับการค้นหาค่ะ</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketManagement;