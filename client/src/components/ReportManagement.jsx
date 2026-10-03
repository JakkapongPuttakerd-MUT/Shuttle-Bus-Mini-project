import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReportManagement = () => {
  const [reportId, setReportId] = useState('1');
  const [data, setData] = useState([]);
  const [viewMode, setViewMode] = useState('chart');

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/reports/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        // รามิสเพิ่ม || [] เพื่อป้องกันไม่ให้ data เป็น undefined ค่ะ
        setData(result.data || []);
      } else {
        alert("รามิสดึงข้อมูลไม่สำเร็จค่ะ: " + result.message);
        setData([]);
      }
    } catch (error) {
      console.error("ปัญหาการเชื่อมต่อรายงาน:", error);
      setData([]);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const renderChart = () => {
    // รามิสเพิ่มการดักจับ !data เผื่อกรณีข้อมูลพังค่ะ
    if (!data || data.length === 0) return <p style={{textAlign: 'center', padding: '20px'}}>ยังไม่มีข้อมูลสถิติในหมวดหมู่นี้ค่ะ</p>;
    
    const keys = Object.keys(data[0]);
    const xAxisKey = keys[0]; 
    const barKeys = keys.slice(1); 
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444']; 

    return (
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
          <XAxis dataKey={xAxisKey} tick={{ fill: 'var(--text-color)' }} />
          <YAxis tick={{ fill: 'var(--text-color)' }} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderRadius: '8px' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {barKeys.map((key, index) => (
            <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (!data || data.length === 0) return <p style={{textAlign: 'center', padding: '20px'}}>ยังไม่มีข้อมูลสถิติในหมวดหมู่นี้ค่ะ</p>;
    const keys = Object.keys(data[0]);
    return (
      <table className="data-table">
        <thead>
          <tr>{keys.map(k => <th key={k}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {keys.map(k => <td key={k}>{row[k]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="content-container">
      <div className="page-header">
        <h2 className="page-title">ระบบรายงานสถิติ (Analytics Dashboard)</h2>
      </div>
      
      <div className="content-card" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
        <div className="input-group" style={{ flex: '1 1 300px', margin: 0 }}>
          <label>📊 เลือกหัวข้อรายงานที่ต้องการวิเคราะห์</label>
          <select className="select-input" value={reportId} onChange={(e) => setReportId(e.target.value)}>
            <option value="1">1. ยอดผู้โดยสารแต่ละสถานี (รายเดือน)</option>
            <option value="2">2. สถานะตั๋วและยอดจอง (รายปี)</option>
            <option value="3">3. พฤติกรรมผู้ใช้ (เส้นทางที่ใช้ประจำ)</option>
            <option value="4">4. เปรียบเทียบงานคนขับ (ก่อน-หลัง 17:00 น.)</option>
            <option value="5">5. สรุปจำนวนงานของรถแต่ละคัน</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn-primary ${viewMode === 'chart' ? '' : 'btn-secondary'}`} 
            onClick={() => setViewMode('chart')}
            style={{ width: 'auto', margin: 0 }}
          >
            📈 แสดงกราฟ
          </button>
          <button 
            className={`btn-primary ${viewMode === 'table' ? '' : 'btn-secondary'}`} 
            onClick={() => setViewMode('table')}
            style={{ width: 'auto', margin: 0 }}
          >
            📋 แสดงตาราง
          </button>
        </div>
      </div>

      <div className="content-card" style={{ padding: '30px 20px' }}>
        {viewMode === 'chart' ? renderChart() : renderTable()}
      </div>
    </div>
  );
};

export default ReportManagement;