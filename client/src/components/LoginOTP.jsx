import React, { useState, useContext } from 'react';
import { ThemeContext, AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';

const LoginOTP = () => {
  const { theme, toggleTheme, toggleColorBlindMode, isColorBlind } = useContext(ThemeContext);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

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

export default LoginOTP;
