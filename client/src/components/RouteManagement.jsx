import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';

const RouteManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routesList, setRoutesList] = useState([]);
  console.log("รามิสเช็กข้อมูลเส้นทาง:", routesList);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    Schedule_ID: '', Bus_ID: '', Driver_ID: '', route_code: '', Time: ''
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = 'http://localhost:5000';

      const [resSched, resDriver, resBus, resRoutes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/schedules/today`, { headers }),
        fetch(`${baseUrl}/api/admin/drivers-only`, { headers }),
        fetch(`${baseUrl}/api/admin/buses`, { headers }), 
        fetch(`${baseUrl}/api/admin/routes-info`, { headers })
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

  const handleOpenModal = (schedule = null) => {
    if (schedule) {
      const formattedTime = schedule.Time || schedule.TIME ? new Date(schedule.Time || schedule.TIME).toISOString().slice(0, 16) : '';
      setFormData({
        Schedule_ID: schedule.Schedule_ID || schedule.SCHEDULE_ID || '',
        Bus_ID: schedule.Bus_ID || schedule.BUS_ID || '',
        Driver_ID: schedule.Driver_ID || schedule.DRIVER_ID || '',
        route_code: schedule.route_code || schedule.ROUTE_CODE || '',
        Time: formattedTime
      });
      setIsEditMode(true);
    } else {
      setFormData({ Schedule_ID: '', Bus_ID: '', Driver_ID: '', route_code: '', Time: '' });
      setIsEditMode(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = isEditMode
      ? `http://localhost:5000/api/admin/schedules/${formData.Schedule_ID}`
      : `http://localhost:5000/api/admin/schedules`;

    try {
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
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

  const selectedRouteInfo = routesList.find(r =>
    String(r.route_code || r.ROUTE_CODE) === String(formData.route_code)
  );

  return (
    <div className="content-container">
      <div className="page-header">
        <h2 className="page-title">จัดการเส้นทางเดินรถ (วันนี้)</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ width: 'auto', marginTop: 0 }}>
          + เพิ่มเส้นทาง
        </button>
      </div>

      <div className="content-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Boarding Station</th>
              <th>Destination</th>
              <th>Time</th>
              <th>Driver</th>
              <th>Bus</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.Schedule_ID || s.SCHEDULE_ID}>
                <td>{s.Boarding_Station || s.BOARDING_STATION}</td>
                <td>{s.Destination || s.DESTINATION}</td>
                <td>{new Date(s.Time || s.TIME).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td>{s.Sname || s.SNAME} {s.Lname || s.LNAME}</td>
                <td>{s.Bus_plate || s.BUS_PLATE}</td>
                <td>
                  <button className="btn-text" onClick={() => handleOpenModal(s)}>แก้ไข</button>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>ยังไม่มีรอบรถสำหรับวันนี้ค่ะ</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>{isEditMode ? 'แก้ไขเส้นทางเดินรถ' : 'เพิ่มเส้นทางใหม่'}</h3>
            <form onSubmit={handleSave}>

              <div className="input-group">
                <label>เลือกเส้นทาง (Route)</label>
                <select name="route_code" value={formData.route_code} onChange={handleInputChange} className="select-input" required>
                  <option value="">-- เลือกเส้นทาง --</option>
                  {routesList.map(r => (
                    <option key={r.route_code || r.ROUTE_CODE} value={r.route_code || r.ROUTE_CODE}>
                      รหัสเส้นทาง {r.route_code || r.ROUTE_CODE} : {r.br_station_name || r.BR_STATION_NAME} ➔ {r.de_station_name || r.DE_STATION_NAME}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRouteInfo && (
                <div style={{ backgroundColor: 'var(--border-color)', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9em' }}>
                  <strong>สถานีขึ้น:</strong> {selectedRouteInfo.br_station_name || selectedRouteInfo.BR_STATION_NAME} <br />
                  <strong>สถานีลง:</strong> {selectedRouteInfo.de_station_name || selectedRouteInfo.DE_STATION_NAME}
                </div>
              )}

             <div className="input-group">
                <label>วันและเวลาเดินรถ (Date & Time)</label>
                <DatePicker
                  selected={formData.Time ? new Date(formData.Time) : null}
                  onChange={(date) => {
                    if (date) {
                      const offset = date.getTimezoneOffset() * 60000;
                      const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
                      setFormData(prev => ({ ...prev, Time: localISOTime }));
                    } else {
                      setFormData(prev => ({ ...prev, Time: '' }));
                    }
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15} 
                  timeCaption="เวลา"
                  dateFormat="dd/MM/yyyy HH:mm"
                  className="select-input"
                  placeholderText="คลิกเพื่อเลือกวันและเวลา"
                  required
                />
              </div>

              <div className="input-group">
                <label>เลือกรถ (Bus ทะเบียน)</label>
                <select name="Bus_ID" value={formData.Bus_ID} onChange={handleInputChange} className="select-input" required>
                  <option value="">-- เลือกรถ --</option>
                  {buses?.map(b => (
                    <option key={b.Bus_code || b.BUS_CODE} value={b.Bus_code || b.BUS_CODE}>
                      ทะเบียน: {b.Bus_plate || b.BUS_PLATE} (ที่นั่ง: {b.Seats || b.SEATS})
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>เลือกคนขับ (Driver)</label>
                <select name="Driver_ID" value={formData.Driver_ID} onChange={handleInputChange} className="select-input" required>
                  <option value="">-- เลือกคนขับ --</option>
                  {drivers.map(d => (
                    <option key={d.U_Name || d.U_NAME} value={d.U_Name || d.U_NAME}>
                      {d.Sname || d.SNAME} {d.Lname || d.LNAME}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">บันทึก</button>
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
