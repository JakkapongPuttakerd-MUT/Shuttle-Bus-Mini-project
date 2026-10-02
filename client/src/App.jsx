import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import './App.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export const ThemeContext = createContext();
export const AuthContext = createContext();

const MainLayout = ({ children }) => {
  const { theme, toggleTheme, toggleColorBlindMode, isColorBlind } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    // ล้างข้อมูล Token ออกจากระบบเมื่อกดออกจากระบบ
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    logout();
    navigate('/login');
  };

  return (
    <div className={`app-wrapper ${theme} ${isColorBlind ? 'color-blind-mode' : ''}`}>
      <header className="top-navbar">
        <div className="brand-logo">MUT Shuttle Bus</div>

        <nav className="main-nav">
          <Link to="/dashboard" className="nav-link">หน้าหลัก</Link>
          <Link to="/admin/employees" className="nav-link">จัดการพนักงาน</Link>
          <Link to="/admin/routes" className="nav-link">จัดเส้นทาง</Link>
          <Link to="/reports" className="nav-link">รายงาน</Link>
        </nav>

        <div className="nav-actions">
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'light' ? 'โหมดมืด' : 'โหมดสว่าง'}
          </button>
          <button className={`theme-toggle-btn ${isColorBlind ? 'cb-active' : ''}`} onClick={toggleColorBlindMode}>
            โหมดตาบอดสี
          </button>
          <button className="btn-danger outline-cb" onClick={handleLogout}>
            ออกจากระบบ
          </button>
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
};

const LoginOTP = () => {
  const { theme, toggleTheme, toggleColorBlindMode, isColorBlind } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  // ยิง API ไปที่ Backend เพื่อตรวจสอบรหัสผ่านและรับ JWT Token
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (username && password) {
      try {
        const response = await fetch('http://localhost:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ u_name: username, u_pass: password })
        });
        const result = await response.json();

        if (result.success) {
          localStorage.setItem('token', result.token);
          localStorage.setItem('role', result.role);
          setStep(2);
          setError('');
        } else {
          setError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
      } catch (err) {
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      }
    } else {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otp === '123456') {
      login();
      navigate('/dashboard');
    } else {
      setError('รหัส OTP ไม่ถูกต้อง (ทดสอบใช้ 123456)');
    }
  };

  return (
    <div className={`app-wrapper login-bg ${theme} ${isColorBlind ? 'color-blind-mode' : ''}`}>
      <div className="login-theme-bar">
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {theme === 'light' ? 'โหมดมืด' : 'โหมดสว่าง'}
        </button>
        <button className={`theme-toggle-btn ${isColorBlind ? 'cb-active' : ''}`} onClick={toggleColorBlindMode}>
          โหมดตาบอดสี
        </button>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h2>MUT Shuttle Bus</h2>
          <p>{step === 1 ? 'ระบบจัดการและจองรอบรถ' : 'ยืนยันตัวตน 2 ขั้นตอน'}</p>
        </div>

        {error && <div className="error-box alert-cb">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="input-group">
              <label>ชื่อผู้ใช้งาน</label>
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="input-group">
              <label>รหัสผ่าน</label>
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">เข้าสู่ระบบ</button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="login-form">
            <div className="input-group">
              <label>รหัส OTP 6 หลัก</label>
              <input type="text" maxLength="6" placeholder="รหัสจาก SMS หรือ Email" value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">ยืนยัน OTP</button>
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>กลับไปหน้าเข้าสู่ระบบ</button>
          </form>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {

  const [stats, setStats] = useState({ buses: 0, tripsToday: 0, drivers: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');

        const response = await fetch('http://localhost:5000/api/admin/dashboard-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('รามิสดึงข้อมูล Dashboard ไม่สำเร็จค่ะ:', error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="content-container">
      <h2 className="page-title">ภาพรวมระบบ (Dashboard)</h2>
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>จำนวนรถทั้งหมด</h3>
          <p className="stat-number">{stats.buses} คัน</p>
        </div>
        <div className="stat-card">
          <h3>รอบเดินรถวันนี้</h3>
          <p className="stat-number">{stats.tripsToday} รอบ</p>
        </div>
        <div className="stat-card">
          <h3>พนักงานขับรถ</h3>
          <p className="stat-number">{stats.drivers} คน</p>
        </div>
      </div>
    </div>
  );
};

const EmployeeManagement = () => {
  const [members, setMembers] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setMembers(result.data);
      } else {
        alert(`รามิสพบปัญหาจากเซิร์ฟเวอร์ค่ะ: ${result.message}`);
      }
    } catch (error) {
      // เพิ่มบรรทัดนี้ลงใน catch ค่ะ
      alert(`รามิสพบปัญหาการเชื่อมต่อค่ะ: ${error.message} (เช็กหน้าต่าง Terminal หลังบ้านนิดนึงนะคะ)`);
      console.error('ดึงข้อมูลผิดพลาด:', error);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleEditClick = (member) => {
    setEditingMember({ ...member });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingMember(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/members/${editingMember.U_Name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          Sname: editingMember.Sname,
          Lname: editingMember.Lname,
          Email: editingMember.Email,
          U_phone: editingMember.U_phone,
          Role_name: editingMember.Role_name
        })
      });
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        fetchMembers();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('บันทึกข้อมูลผิดพลาด:', error);
    }
  };

  return (
    <div className="content-container">
      <div className="page-header">
        <h2 className="page-title">ระบบจัดการพนักงาน</h2>
        <button className="btn-primary" style={{ width: 'auto', marginTop: 0 }}>+ เพิ่มพนักงานใหม่</button>
      </div>
      <div className="content-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>ชื่อ - นามสกุล</th>
              <th>อีเมล</th>
              <th>เบอร์โทรศัพท์</th>
              <th>สิทธิ์การใช้งาน</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.U_Name}>
                <td>{m.U_Name}</td>
                <td>{m.Sname} {m.Lname}</td>
                <td>{m.Email}</td>
                <td>{m.U_phone}</td>
                <td>{m.Role_name}</td>
                <td>
                  <button className="btn-text" onClick={() => handleEditClick(m)}>แก้ไข</button>
                  <button className="btn-text danger">ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>แก้ไขข้อมูลพนักงาน</h3>
            <form onSubmit={handleSave}>
              <div className="input-group">
                <label>Username (แก้ไขไม่ได้)</label>
                <input type="text" name="U_Name" value={editingMember.U_Name} readOnly style={{ backgroundColor: 'var(--border-color)' }} />
              </div>
              <div className="input-group">
                <label>ชื่อ</label>
                <input type="text" name="Sname" value={editingMember.Sname || ''} onChange={handleInputChange} required />
              </div>
              <div className="input-group">
                <label>นามสกุล</label>
                <input type="text" name="Lname" value={editingMember.Lname || ''} onChange={handleInputChange} required />
              </div>
              <div className="input-group">
                <label>อีเมล</label>
                <input type="email" name="Email" value={editingMember.Email || ''} onChange={handleInputChange} required />
              </div>
              <div className="input-group">
                <label>เบอร์โทรศัพท์</label>
                <input type="text" name="U_phone" value={editingMember.U_phone || ''} onChange={handleInputChange} required />
              </div>
              <div className="input-group">
                <label>สิทธิ์การใช้งาน</label>
                <select name="Role_name" value={editingMember.Role_name || ''} onChange={handleInputChange} className="select-input" required>
                  <option value="Admin">Admin</option>
                  <option value="Driver">Driver</option>
                  <option value="Member">Member</option>
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
      const baseUrl = 'http://localhost:5000'; // ชี้เป้าไปที่หลังบ้านโดยตรง

      const [resSched, resDriver, resBus, resRoutes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/schedules/today`, { headers }),
        fetch(`${baseUrl}/api/admin/drivers-only`, { headers }),
        fetch(`${baseUrl}/api/admin/buses`, { headers }), // ดึงข้อมูลรถ
        fetch(`${baseUrl}/api/admin/routes-info`, { headers })
      ]);

      const [dataSched, dataDriver, dataBus, dataRoutes] = await Promise.all([
        resSched.json(), resDriver.json(), resBus.json(), resRoutes.json()
      ]);

      if (dataSched.success) setSchedules(dataSched.data);
      if (dataDriver.success) setDrivers(dataDriver.data);
      if (dataBus.success) setBuses(dataBus.data); // เอาข้อมูลรถใส่เข้า Dropdown
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
      ? `/api/admin/schedules/${formData.Schedule_ID}`
      : `/api/admin/schedules`;

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

  // ค้นหาเส้นทางที่เลือกเพื่อโชว์ชื่อสถานี
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
                      // หักลบ Timezone เพื่อให้เวลาตรงกับประเทศไทยก่อนโยนเข้า formData ค่ะ
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

const PlaceholderPage = ({ title }) => (
  <div className="content-container">
    <h2 className="page-title">{title}</h2>
    <div className="content-card"><p>อยู่ระหว่างการพัฒนาโครงสร้าง</p></div>
  </div>
);

function App() {
  const [theme, setTheme] = useState('light');
  const [isColorBlind, setIsColorBlind] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const toggleColorBlindMode = () => setIsColorBlind(!isColorBlind);

  // รามิสปรับให้ตรวจสอบ Token จาก LocalStorage ด้วยเพื่อรักษา State การล็อกอินค่ะ
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
  }, []);

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <ThemeContext.Provider value={{ theme, toggleTheme, toggleColorBlindMode, isColorBlind }}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginOTP />} />
            <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
            <Route path="/admin/employees" element={<MainLayout><EmployeeManagement /></MainLayout>} />
            <Route path="/admin/routes" element={<MainLayout><RouteManagement /></MainLayout>} />
            <Route path="/reports" element={<MainLayout><PlaceholderPage title="ระบบรายงาน" /></MainLayout>} />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          </Routes>
        </Router>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}


export default App;