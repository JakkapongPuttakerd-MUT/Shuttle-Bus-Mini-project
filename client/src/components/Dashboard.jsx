import React, { useState, useEffect } from 'react';

const Dashboard = () => {

  const [stats, setStats] = useState({ buses: 0, tripsToday: 0, drivers: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('🌐 [Frontend] เริ่มดึงข้อมูล Dashboard (มี Token ไหม?):', !!token);

        const response = await fetch('http://localhost:5000/api/admin/dashboard-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        console.log('📥 [Frontend] ข้อมูลที่รับมาจากหลังบ้าน:', result);

        if (result.success) {
          setStats(result.data);
          console.log('✨ [Frontend] อัปเดตหน้าจอสำเร็จ!');
        } else {
          console.warn('⚠️ [Frontend] API ฟ้องว่าดึงไม่ได้:', result.message);
        }
      } catch (error) {
        console.error('🚨 [Frontend] ดึงข้อมูลไม่สำเร็จจังๆ:', error);
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

export default Dashboard;
