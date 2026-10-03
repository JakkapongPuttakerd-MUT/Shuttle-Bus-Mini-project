import React, { useContext } from 'react';
import { ThemeContext, AuthContext } from '../App';
import { useNavigate, Link } from 'react-router-dom';

const MainLayout = ({ children }) => {
  const { theme, toggleTheme, toggleColorBlindMode, isColorBlind } = useContext(ThemeContext);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
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
          <Link to="/admin/tickets" className="nav-link">จัดการตั๋ว</Link>
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

export default MainLayout;