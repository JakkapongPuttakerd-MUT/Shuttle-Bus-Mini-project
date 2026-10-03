import React, { useState, useEffect } from 'react';

const EmployeeManagement = () => {
  const [members, setMembers] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setMembers(result.data);
      } else {
        alert(`รามิสพบปัญหาจากเซิร์ฟเวอร์ค่ะ: ${result.message}`);
      }
    } catch (error) {
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
      const response = await fetch(`http://localhost:5000/api/admin/members/${editingMember.U_Name}`, {
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

export default EmployeeManagement;
