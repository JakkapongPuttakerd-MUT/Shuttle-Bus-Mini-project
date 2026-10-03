import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import 'react-datepicker/dist/react-datepicker.css';

// นำเข้า Components ย่อยทั้งหมดที่บอสสร้างไว้
import MainLayout from './components/MainLayout';
import LoginOTP from './components/LoginOTP';
import Dashboard from './components/Dashboard';
import EmployeeManagement from './components/EmployeeManagement';
import RouteManagement from './components/RouteManagement';
import TicketManagement from './components/TicketManagement';
import ReportManagement from './components/ReportManagement';
import DriverDashboard from './components/DriverDashboard';
import PassengerDashboard from './components/PassengerDashboard';

export const ThemeContext = createContext();
export const AuthContext = createContext();

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
            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/passenger" element={<PassengerDashboard />} />
            <Route path="/reports" element={<MainLayout><ReportManagement /></MainLayout>} />
            <Route path="*" element={
              <Navigate to={
                !isAuthenticated ? "/login" : 
                localStorage.getItem('role') === 'Driver' ? "/driver" : localStorage.getItem('role') === 'Member' ? "/passenger" : "/dashboard"
              } />
            } />
          </Routes>
        </Router>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;