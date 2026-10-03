import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';

const RouteManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routesList, setRoutesList] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    route_code: '', bus: '', driver: '', time: ''
  });
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = 'http://localhost:5000';
      const [resSched, resDriver, resBus, resRoutes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/schedules/details`, { headers }),
        fetch(`${baseUrl}/api/admin/drivers-only`, { headers }),
        fetch(`${baseUrl}/api/admin/buses`, { headers }),
        fetch(`${baseUrl}/api/admin/routes-dropdown`, { headers })
      ]);

      const [dataSched, dataDriver, dataBus, dataRoutes] = await Promise.all([
        resSched.json(), resDriver.json(), resBus.json(), resRoutes.json()
      ]);

      if (dataSched.success) setSchedules(dataSched.data);
      if (dataDriver.success) setDrivers(dataDriver.data);
      if (dataBus.success) setBuses(dataBus.data);
      if (dataRoutes.success) setRoutesList(dataRoutes.data);

    } catch (error) {
      console.error("รามิสพบปัญหาการเชื่อมต่อ API ค่ะ:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = () => {
    setFormData({ route_code: '', bus: '', driver: '', time: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    // แปลงเวลาให้เป็น YYYY-MM-DD HH:mm:ss สำหรับส่งเข้า Database
    const dateObj = new Date(formData.time);
    const formattedTime = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:00`;

    const payload = { ...formData, time: formattedTime, Time: formattedTime };

    try {
      const response = await fetch(`http://localhost:5000/api/admin/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        fetchData(); 
      } else {
        alert("บันทึกไม่สำเร็จ: " + result.message);
      }
    } catch (error) {
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ค่ะ");
    }
  };
  // ฟังก์ชันจัดกลุ่มและคำนวณเวลาแสดงผล Sorting 
  const renderScheduleTable = () => {

    const groupedMap = schedules.reduce((acc, curr) => {
      const code = curr.Sch_code || curr.SCH_CODE;
      if (!acc.has(code)) acc.set(code, []);
      acc.get(code).push(curr);
      return acc;
    }, new Map());

    const sortedGroups = Array.from(groupedMap.values());

    return (
      <table className="data-table" style={{ width: '100%', textAlign: 'left', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
            <th style={{ padding: '12px' }}>เวลาออกรถ</th>
            <th style={{ padding: '12px' }}>เส้นทาง</th>
            <th style={{ padding: '12px' }}>คนขับ</th>
            <th style={{ padding: '12px' }}>ข้อมูลรถ</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>จัดการ</th>
          </tr>
        </thead>
        <tbody>

          {sortedGroups.map((group, index) => {
            let accumulatedMinutes = 0;
            const first = group[0];
            const code = first.Sch_code || first.SCH_CODE;
            const startTime = new Date(first.start_time || first.START_TIME);
            const isExpanded = expandedId === code;

            return (
              <React.Fragment key={index}>
                <tr style={{ borderBottom: '1px solid #ddd', backgroundColor: isExpanded ? '#f0f8ff' : 'white' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    <div style={{ color: 'var(--primary-color)', fontSize: '0.85em' }}>
                      {startTime.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    {startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </td>
                  <td style={{ padding: '12px' }}>{first.route_name || first.ROUTE_NAME}</td>
                  <td style={{ padding: '12px' }}>{first.driver_name || first.DRIVER_NAME}</td>
                  <td style={{ padding: '12px' }}>{first.Bus_type || first.BUS_TYPE} <br /><span style={{ fontSize: '0.85em', color: 'gray' }}>({first.Bus_plate || first.BUS_PLATE})</span></td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      className={isExpanded ? "btn-secondary" : "btn-primary"}
                      onClick={() => toggleExpand(code)}
                      style={{ padding: '5px 10px', fontSize: '0.9em' }}
                    >
                      {isExpanded ? '▲ ซ่อน' : '▼ ดูป้ายรถ'}
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan="5" style={{ padding: '15px 25px', backgroundColor: '#fafafa', borderBottom: '2px solid #ccc' }}>
                      <table className="data-table" style={{ width: '100%', border: '1px solid #eee' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#e9e9e9' }}>
                            <th style={{ padding: '8px', width: '10%', textAlign: 'center' }}>ลำดับ</th>
                            <th style={{ padding: '8px', width: '40%' }}>สถานี (ขึ้น ➔ ลง)</th>
                            <th style={{ padding: '8px', width: '25%' }}>เวลาเดินทาง</th>
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
                                <td style={{ padding: '8px' }}>
                                  {step.br_station_name || step.BR_STATION_NAME} ➔ {step.de_station_name || step.DE_STATION_NAME}
                                </td>
                                <td style={{ padding: '8px', color: '#666' }}>
                                  {timeToNext > 0 ? `+${timeToNext} นาที` : 'ถึงที่หมาย'}
                                </td>
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
    <div className="content-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="page-title">ตารางการเดินรถ</h2>
        <button className="btn-primary" onClick={handleOpenModal} style={{ width: 'auto', marginTop: 0 }}>
          + เพิ่มรอบรถใหม่
        </button>
      </div>

      {renderScheduleTable()}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>เพิ่มรอบเดินรถใหม่</h3>
            <form onSubmit={handleSave}>

              <div className="input-group">
                <label>เลือกเส้นทางหลัก (Route)</label>
                <select name="route_code" value={formData.route_code} onChange={handleInputChange} className="select-input" required>
                  <option value="">-- เลือกเส้นทาง --</option>
                  {routesList.map(r => (
                    <option key={r.route_code || r.ROUTE_CODE} value={r.route_code || r.ROUTE_CODE}>
                      {r.route_name || r.ROUTE_NAME}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>วันและเวลาออกเดินทาง (Date & Time)</label>
                <DatePicker
                  selected={formData.time ? new Date(formData.time) : null}
                  onChange={(date) => {
                    if (date) {
                      const offset = date.getTimezoneOffset() * 60000;
                      const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
                      setFormData(prev => ({ ...prev, time: localISOTime }));
                    } else {
                      setFormData(prev => ({ ...prev, time: '' }));
                    }
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  timeCaption="เวลา"
                  dateFormat="dd/MM/yyyy HH:mm"
                  className="select-input"
                  placeholderText="คลิกเพื่อเลือกวันและเวลาเริ่มออกเดินทาง"
                  required
                />
              </div>

              <div className="input-group">
                <label>เลือกรถ (Bus ทะเบียน)</label>
                <select name="bus" value={formData.bus} onChange={handleInputChange} className="select-input" required>
                  <option value="">-- เลือกรถ --</option>
                  {buses.map(b => (
                    <option key={b.Bus_code || b.BUS_CODE} value={b.Bus_code || b.BUS_CODE}>
                      {b.Bus_type || b.BUS_TYPE} : {b.Bus_plate || b.BUS_PLATE}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>เลือกคนขับ (Driver)</label>
                <select name="driver" value={formData.driver} onChange={handleInputChange} className="select-input" required>
                  <option value="">-- เลือกคนขับ --</option>
                  {drivers.map(d => (
                    <option key={d.U_Name || d.U_NAME} value={d.U_Name || d.U_NAME}>
                      {d.Sname || d.SNAME} {d.Lname || d.LNAME}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">บันทึกเข้าตาราง</button>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteManagement;