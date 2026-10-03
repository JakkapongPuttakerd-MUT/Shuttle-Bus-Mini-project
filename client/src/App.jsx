import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import 'react-datepicker/dist/react-datepicker.css';

import MainLayout from './components/MainLayout';
import LoginOTP from './components/LoginOTP';
import Dashboard from './components/Dashboard';
import EmployeeManagement from './components/EmployeeManagement';
import RouteManagement from './components/RouteManagement';
import TicketManagement from './components/TicketManagement';

export const ThemeContext = createContext();
export const AuthContext = createContext();

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
            <Route path="/admin/tickets" element={<MainLayout><TicketManagement /></MainLayout>} />
            <Route path="/reports" element={<MainLayout><PlaceholderPage title="ระบบรายงาน" /></MainLayout>} />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          </Routes>
        </Router>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
