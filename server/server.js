require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret';
const PORT = process.env.PORT;

async function getDBConnection() {
  return await oracledb.getConnection({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`
  });

}
console.log("ชี้ไปที่ DB:", process.env.DB_SERVICE, "User:", process.env.DB_USER);
console.log("พิกัด DB จริง:", process.env.DB_HOST, process.env.DB_PORT, process.env.DB_SERVICE);

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'เข้าถึงไม่ได้: ไม่พบ Token ยืนยันตัวตน' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    req.user = decoded;
    next();
  });
};

//======================================================================================================================================
//                                                    Login System
//======================================================================================================================================
app.post('/api/login', async (req, res) => {
  const { u_name, u_pass } = req.body;
  let connection;

  try {
    if (!u_name || !u_pass) {
      return res.status(400).json({ message: 'กรุณากรอก Username และ Password' });
    }

    connection = await getDBConnection();

    const result = await connection.execute(
      `SELECT "U_Name", "U_pass", "Role_name" FROM "Member" WHERE "U_Name" = :1`,
      [u_name],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log("=== ข้อมูลที่ Node.js คว้ามาได้ ===");
    console.log("จำนวนแถวที่เจอ:", result.rows.length);
    console.log(result.rows);
    console.log("================================");
    const userFromDB = result.rows[0];

    if (!userFromDB) {
      return res.status(401).json({ message: '401.1 ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const dbHash = userFromDB.U_pass ? userFromDB.U_pass.trim() : '';
    const saltRounds = 12;
    const webHash = await bcrypt.hash(u_pass, saltRounds);
    console.log("=== สรุปข้อมูลตรวจจับ ===");
    console.log("1. รหัสผ่านดิบจากเว็บ :", u_pass);
    console.log("2. Hash แปลงจากเว็บ  :", webHash, "(ความยาว:", webHash.length, ")");
    console.log("3. Hash ที่ดึงจาก DB :", dbHash, "(ความยาว:", dbHash.length, ")");
    console.log("========================");


    const isMatch = await bcrypt.compare(u_pass, dbHash);
    console.log("ผลการเปรียบเทียบ bcrypt :", isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: '401.2 ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { username: userFromDB.U_Name, role: userFromDB.Role_name },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token: token,
      role: userFromDB.Role_name
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
});
app.get('/api/user/profile', verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();
    const sql = `SELECT "Sname", "Lname" FROM "Member" WHERE "U_Name" = :username`;
    const result = await connection.execute(sql, [req.user.username], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    if (result.rows.length > 0) {
      res.json({ success: true, Sname: result.rows[0].Sname, Lname: result.rows[0].Lname });
    } else {
      res.json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้' });
    }
  } catch (error) {
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

//======================================================================================================================================
//                                                     Driver System
//======================================================================================================================================
//Schedule ของคนขับ
app.get('/api/driver/schedules', verifyToken, async (req, res) => {
  const driverUsername = req.user.username;
  let connection;

  try {
    connection = await getDBConnection();

    // รามิสใช้เฉพาะตารางหลักที่ชัวร์ว่ามีอยู่จริง 100% ค่ะ
    const sql = ` 
      SELECT 
        s."Sch_code", 
        s."Time", 
        r."route_code" AS "route_name",
        st1."St_name" AS "start_station",
        st2."St_name" AS "end_station",
        b."Bus_plate", 
        b."Seats" AS "total_seats",
        (SELECT COUNT(t."Ticket_id") FROM "Ticket" t WHERE t."sch_code" = s."Sch_code" AND t."tick_status" IN ('Booked', 'Check-in')) AS "booked_seats"
      FROM "Schedule" s
      JOIN "Route" r ON s."route_code" = r."route_code"
      JOIN "Bus" b ON s."bus" = b."Bus_code"
      LEFT JOIN "Station" st1 ON r."br_station" = st1."St_code"
      LEFT JOIN "Station" st2 ON r."de_station" = st2."St_code"
      WHERE s."driver" = :driver_username 
        AND TRUNC(s."Time") = TRUNC(SYSDATE)
      ORDER BY s."Time" ASC
    `;
    const result = await connection.execute(sql, [driverUsername], {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    const responseData = result.rows.map(row => ({
      ...row,
      available_seats: row.total_seats - row.booked_seats
    }));

    res.json({ success: true, data: responseData });

  } catch (error) {
    console.error('🚨 รามิสพบ Error Driver Schedule:', error.message);
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
});

//Ticket
app.get('/api/driver/schedules/:sch_code/tickets', verifyToken, async (req, res) => {
  const { sch_code } = req.params;
  let connection;

  try {
    connection = await getDBConnection();

    const sql = `
      SELECT 
        t."sch_code" AS "round_code",        
        s."Time" AS "schedule_time",         
        t."Ticket_id", 
        t."U_Name", 
        t."seat_no", 
        t."tick_status",
        st1."St_name" AS "boarding_station",
        st2."St_name" AS "destination_station"
      FROM "Ticket" t
      JOIN "Station" st1 ON t."br_station" = st1."St_code"
      JOIN "Station" st2 ON t."de_station" = st2."St_code"
      JOIN "Schedule" s ON t."sch_code" = s."Sch_code"  
      WHERE t."sch_code" = :1
      ORDER BY t."seat_no" ASC
    `;

    const result = await connection.execute(sql, [sch_code], {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Driver Tickets Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั๋ว' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
});
app.put('/api/driver/schedules/:sch_code/complete', verifyToken, async (req, res) => {
  // เช็กสิทธิ์ว่าต้องเป็นคนขับเท่านั้น
  if (req.user.role !== 'Driver') return res.status(403).json({ message: 'เฉพาะคนขับเท่านั้น' });

  const { sch_code } = req.params;
  let connection;

  try {
    connection = await getDBConnection();
    // อัปเดตเฉพาะตั๋วที่ยัง Active (Booked หรือ Check-in) ในรอบรถนั้น ให้กลายเป็น Completed
    const sql = `
      UPDATE "Ticket" 
      SET "tick_status" = 'Completed' 
      WHERE "sch_code" = :1 AND "tick_status" IN ('Booked', 'Check-in')
    `;
    const result = await connection.execute(sql, [sch_code], { autoCommit: true });

    res.json({ success: true, message: 'บันทึกจบงานเรียบร้อย', updated_rows: result.rowsAffected });
  } catch (error) {
    console.error('🚨 รามิสพบ Error จบงานคนขับ:', error.message);
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

//======================================================================================================================================
//                                                 Passenger System
//======================================================================================================================================
// 1. ดึงตารางเดินรถของวันนี้ (แสดงให้ผู้โดยสารเห็น)
app.get('/api/member/schedules', verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();
    const sql = `
      SELECT 
        s."Sch_code", s."Time", r."route_code",
        st1."St_name" AS "start_station",
        st2."St_name" AS "end_station",
        b."Bus_plate", b."Seats" AS "total_seats",
        (SELECT COUNT(t."Ticket_id") FROM "Ticket" t WHERE t."sch_code" = s."Sch_code" AND t."tick_status" IN ('Booked', 'Check-in')) AS "booked_seats"
      FROM "Schedule" s
      JOIN "Route" r ON s."route_code" = r."route_code"
      JOIN "Bus" b ON s."bus" = b."Bus_code"
      LEFT JOIN "Station" st1 ON r."br_station" = st1."St_code"
      LEFT JOIN "Station" st2 ON r."de_station" = st2."St_code"
      WHERE TRUNC(s."Time") = TRUNC(SYSDATE)
      ORDER BY s."Time" ASC
    `;
    const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    // คำนวณที่นั่งว่างส่งไปให้หน้าบ้าน
    const responseData = result.rows.map(row => ({
      ...row,
      available_seats: row.total_seats - row.booked_seats
    }));
    res.json({ success: true, data: responseData });
  } catch (error) {
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

// 2. กดจองตั๋ว
app.post('/api/member/tickets', verifyToken, async (req, res) => {
  const { sch_code } = req.body;
  const username = req.user.username;
  let connection;

  try {
    connection = await getDBConnection();
    // สร้าง Ticket ID แบบอัตโนมัติด้วยตัวเลขเวลา
    const ticketId = Date.now().toString().slice(-8);
    const randomSeat = Math.floor(Math.random() * 40) + 1; // สุ่มที่นั่งชั่วคราว

    // รามิสเพิ่มคอลัมน์ expire_time เข้าไป โดยดึงเวลา Time จากตาราง Schedule มาใส่ให้เลยค่ะ
    const sql = `
      INSERT INTO "Ticket" (
        "Ticket_id", "U_Name", "sch_code", "br_station", "de_station", 
        "tick_status", "booking_time", "seat_no", "expire_time"
      )
      VALUES (
        :ticket_id, :username, :sch_code,
        (SELECT r."br_station" FROM "Route" r JOIN "Schedule" s ON r."route_code" = s."route_code" WHERE s."Sch_code" = :sch_code),
        (SELECT r."de_station" FROM "Route" r JOIN "Schedule" s ON r."route_code" = s."route_code" WHERE s."Sch_code" = :sch_code),
        'Booked', SYSDATE, :seat_no,
        (SELECT s."Time" FROM "Schedule" s WHERE s."Sch_code" = :sch_code)
      )
    `;
    await connection.execute(sql, {
      ticket_id: ticketId,
      username,
      sch_code,
      seat_no: randomSeat.toString()
    }, { autoCommit: true });

    res.json({ success: true, message: 'จองตั๋วสำเร็จ!' });
  } catch (error) {
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

// 3. ดูตั๋วทั้งหมดของตัวเอง
app.get('/api/member/my-tickets', verifyToken, async (req, res) => {
  const username = req.user.username;
  let connection;
  try {
    connection = await getDBConnection();
    const sql = `
      SELECT 
        t."Ticket_id", t."tick_status", t."booking_time", t."seat_no",
        s."Time" AS "schedule_time",
        b."Bus_plate",
        st1."St_name" AS "boarding_station",
        st2."St_name" AS "destination_station"
      FROM "Ticket" t
      JOIN "Schedule" s ON t."sch_code" = s."Sch_code"
      JOIN "Bus" b ON s."bus" = b."Bus_code"
      JOIN "Station" st1 ON t."br_station" = st1."St_code"
      JOIN "Station" st2 ON t."de_station" = st2."St_code"
      WHERE t."U_Name" = :username
      ORDER BY s."Time" DESC
    `;
    const result = await connection.execute(sql, [username], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

// 4. กดยกเลิกตั๋ว
app.put('/api/member/tickets/:ticket_id/cancel', verifyToken, async (req, res) => {
  const { ticket_id } = req.params;
  const username = req.user.username;
  let connection;
  try {
    connection = await getDBConnection();
    const sql = `UPDATE "Ticket" SET "tick_status" = 'Cancelled' WHERE "Ticket_id" = :ticket_id AND "U_Name" = :username`;
    await connection.execute(sql, { ticket_id, username }, { autoCommit: true });
    res.json({ success: true, message: 'ยกเลิกตั๋วสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

//======================================================================================================================================
//                                                 Admin System
//======================================================================================================================================
//Member
app.get('/api/admin/members', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });

  const { search, role, sort_by = '"U_Name"', order = 'ASC' } = req.query;
  let connection;

  try {
    connection = await getDBConnection();
    // รามิสแก้ชื่อคอลัมน์ Sname, Lname, U_phone ให้ตรงกับ Database ค่ะ
    let sql = `SELECT "U_Name", "Sname", "Lname", "Email", "U_phone", "Role_name" FROM "Member" WHERE 1=1`;
    const binds = {};

    if (search) {
      // รามิสแก้เงื่อนไขระบบค้นหาให้ใช้ Sname และ Lname ด้วยค่ะ จะได้ค้นหาชื่อได้ไม่ Error
      sql += ` AND (LOWER("U_Name") LIKE LOWER(:search) OR LOWER("Sname") LIKE LOWER(:search) OR LOWER("Lname") LIKE LOWER(:search))`;
      binds.search = `%${search}%`;
    }
    if (role) {
      sql += ` AND "Role_name" = :role`;
      binds.role = role;
    }

    //Sort
    sql += ` ORDER BY ${sort_by} ${order === 'DESC' ? 'DESC' : 'ASC'}`;

    const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});
//User management 
app.put('/api/admin/members/:username', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });

  const { username } = req.params;
  // รามิสแก้ตัวแปรรับค่าจาก React ให้ตรงกับชื่อใน Database ค่ะ
  const { Sname, Lname, Email, U_phone, Role_name } = req.body;
  let connection;

  try {
    connection = await getDBConnection();
    const sql = `
      UPDATE "Member" 
      SET "Sname" = :Sname, "Lname" = :Lname, "Email" = :Email, "U_phone" = :U_phone, "Role_name" = :Role_name 
      WHERE "U_Name" = :username
    `;
    await connection.execute(sql, { Sname, Lname, Email, U_phone, Role_name, username }, { autoCommit: true });
    res.json({ success: true, message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

//======================================================================================================================================
//                                          Schedule & Route Management (จัดกลุ่มใหม่ให้ถูกต้อง)
//======================================================================================================================================

// 1. ดึงรอบรถวันนี้
app.get('/api/admin/schedules/today', verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();
    const result = await connection.execute(
      `SELECT 
         s."Sch_code" AS "Schedule_ID", 
         s."Time", 
         b."Bus_plate", 
         m."Sname", 
         m."Lname",
         st_br."St_name" AS "Boarding_Station", 
         st_de."St_name" AS "Destination",
         s."bus" AS "Bus_ID", 
         s."driver" AS "Driver_ID", 
         s."route_code"
       FROM "Schedule" s
       LEFT JOIN "Bus" b ON s."bus" = b."Bus_code"
       LEFT JOIN "Member" m ON s."driver" = m."U_Name"
       LEFT JOIN "Route" r ON s."route_code" = r."route_code"
       LEFT JOIN "Station" st_br ON r."br_station" = st_br."St_code"
       LEFT JOIN "Station" st_de ON r."de_station" = st_de."St_code"
       WHERE TRUNC(s."Time") = TRUNC(SYSDATE)`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  finally { if (connection) await connection.close(); }
});

// 2. ดึงข้อมูลคนขับ
app.get('/api/admin/drivers-only', verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();
    const result = await connection.execute(
      `SELECT "U_Name", "Sname", "Lname" FROM "Member" WHERE "Role_name" = 'Driver'`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  finally { if (connection) await connection.close(); }
});

// 3. ดึงข้อมูลรถ
app.get('/api/admin/buses', verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();
    // รามิสใส่ฟันหนูกลับคืนให้ตารางและคอลัมน์ เพื่อล็อกตัวพิมพ์ให้ตรงฐานข้อมูลเป๊ะๆ ค่ะ
    const result = await connection.execute(
      `SELECT "Bus_code", "Bus_plate", "Seats" FROM "Bus"`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("🚨 Bus Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// 4. ดึงข้อมูลเส้นทาง
app.get('/api/admin/routes-info', verifyToken, async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();
    const result = await connection.execute(
      `SELECT 
         r."route_code",
         st_br."St_name" AS "br_station_name",
         st_de."St_name" AS "de_station_name"
       FROM "Route" r
       LEFT JOIN "Station" st_br ON r."br_station" = st_br."St_code"
       LEFT JOIN "Station" st_de ON r."de_station" = st_de."St_code"`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  finally { if (connection) await connection.close(); }
});

// 5. เพิ่มรอบรถ (Schedule POST)
app.post('/api/admin/schedules', verifyToken, async (req, res) => {
  let connection;
  try {
    const { Bus_ID, Driver_ID, route_code, Time } = req.body;
    connection = await getDBConnection();

    const idResult = await connection.execute(`SELECT NVL(MAX("Sch_code"), 1000) + 1 FROM "Schedule"`);
    const newSchCode = idResult.rows[0][0];

    await connection.execute(
      `INSERT INTO "Schedule" ("Sch_code", "bus", "driver", "route_code", "Time") 
       VALUES (:1, :2, :3, :4, TO_TIMESTAMP(:5, 'YYYY-MM-DD"T"HH24:MI'))`,
      [newSchCode, Bus_ID, Driver_ID, route_code, Time],
      { autoCommit: true }
    );
    res.json({ success: true, message: 'เพิ่มรอบรถสำเร็จ' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  finally { if (connection) await connection.close(); }
});

// 6. แก้ไขรอบรถ (Schedule PUT)
app.put('/api/admin/schedules/:id', verifyToken, async (req, res) => {
  const { Bus_ID, Driver_ID, route_code, Time } = req.body;
  const schCode = req.params.id;
  let connection;
  try {
    connection = await getDBConnection();
    await connection.execute(
      `UPDATE "Schedule" 
       SET "bus" = :1, "driver" = :2, "route_code" = :3, "Time" = TO_TIMESTAMP(:4, 'YYYY-MM-DD"T"HH24:MI')
       WHERE "Sch_code" = :5`,
      [Bus_ID, Driver_ID, route_code, Time, schCode],
      { autoCommit: true }
    );
    res.json({ success: true, message: 'อัปเดตข้อมูลรอบรถสำเร็จ' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  finally { if (connection) await connection.close(); }
});

// 7. ลบรอบรถ (Schedule DELETE)
app.delete('/api/admin/schedules/:id', verifyToken, async (req, res) => {
  const schCode = req.params.id;
  let connection;
  try {
    connection = await getDBConnection();
    await connection.execute(
      `DELETE FROM "Schedule" WHERE "Sch_code" = :1`,
      [schCode],
      { autoCommit: true }
    );
    res.json({ success: true, message: 'ลบรอบรถสำเร็จ' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  finally { if (connection) await connection.close(); }
});

//ticket
app.get('/api/admin/tickets', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });

  const { date, username, bus, route } = req.query;
  let connection;

  try {
    connection = await getDBConnection();
    // รามิสลบ r."route_name" ออกไปแล้วค่ะ ตัดปัญหาชื่อคอลัมน์ไม่ตรง
    let sql = `
      SELECT 
        t."Ticket_id", t."U_Name", t."seat_no", t."tick_status", t."booking_time",
        s."Sch_code", s."Time" AS "schedule_time",
        b."Bus_plate",
        st1."St_name" AS "boarding_station",
        st2."St_name" AS "destination_station",
        m."Sname" || ' ' || m."Lname" AS "driver_name"
      FROM "Ticket" t
      JOIN "Schedule" s ON t."sch_code" = s."Sch_code"
      JOIN "Bus" b ON s."bus" = b."Bus_code"
      JOIN "Route" r ON s."route_code" = r."route_code"
      JOIN "Station" st1 ON t."br_station" = st1."St_code"
      JOIN "Station" st2 ON t."de_station" = st2."St_code"
      LEFT JOIN "Member" m ON s."driver" = m."U_Name"
      WHERE 1=1
    `;
    const binds = {};

    if (date) { sql += ` AND TRUNC(s."Time") = TO_DATE(:date, 'YYYY-MM-DD')`; binds.date = date; }
    if (username) { sql += ` AND LOWER(t."U_Name") LIKE LOWER(:username)`; binds.username = `%${username}%`; }
    if (bus) { sql += ` AND b."Bus_code" = :bus`; binds.bus = bus; }
    if (route) { sql += ` AND r."route_code" = :route`; binds.route = route; }

    sql += ` ORDER BY t."booking_time" DESC`;

    const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('🚨 รามิสพบ Error ฐานข้อมูลตั๋ว:', error.message);
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

//counting

app.get('/api/admin/dashboard-stats', async (req, res) => {
  let connection;
  try {
    connection = await getDBConnection();

    const busResult = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_BUSES FROM "Bus"`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const driverResult = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_DRIVERS FROM "Member" WHERE "Role_name" = 'Driver'`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const tripResult = await connection.execute(
      `SELECT COUNT(*) AS TRIPS_TODAY FROM "Schedule" WHERE TRUNC("Time") = TRUNC(SYSDATE)`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json({
      success: true,
      data: {
        buses: busResult.rows[0].TOTAL_BUSES || 0,
        drivers: driverResult.rows[0].TOTAL_DRIVERS || 0,
        tripsToday: tripResult.rows[0].TRIPS_TODAY || 0
      }
    });
  } catch (error) {
    console.error('รามิสพบข้อผิดพลาดตอนดึงสถิติ Dashboard ค่ะ:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลสรุปได้' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error(err); }
    }
  }
});

//report
app.get('/api/admin/reports/:report_id', verifyToken, async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงรายงาน' });

  const { report_id } = req.params;
  const { date_start, date_end, sort_by = '1', order = 'ASC' } = req.query;

  let connection;

  try {
    connection = await getDBConnection();
    let baseSql = '';
    let groupBy = '';
    const binds = {};

    switch (report_id) {
      case '1':
        // รีพอร์ต 1: ยอดผู้โดยสารแต่ละสถานี เทียบตามเดือน
        baseSql = `
          SELECT TO_CHAR(s."Time", 'YYYY-MM') || ' (' || st."St_name" || ')' AS "สถานี",
                 COUNT(t."Ticket_id") AS "ยอดผู้โดยสาร"
          FROM "Ticket" t
          JOIN "Schedule" s ON t."sch_code" = s."Sch_code"
          JOIN "Station" st ON t."br_station" = st."St_code"
          WHERE 1=1
        `;
        groupBy = ` GROUP BY TO_CHAR(s."Time", 'YYYY-MM'), st."St_name"`;
        break;

      case '2':
        // รีพอร์ต 2: สถานะตั๋วสรุปเป็นรายปี
        baseSql = `
          SELECT TO_CHAR(s."Time", 'YYYY') AS "ปี",
                 COUNT(CASE WHEN t."tick_status" IN ('Booked', 'Check-in') THEN 1 END) AS "ตั๋วที่ใช้งาน",
                 COUNT(CASE WHEN t."tick_status" = 'Cancelled' THEN 1 END) AS "จำนวนตั๋วที่ยกเลิก",
                 COUNT(CASE WHEN t."tick_status" = 'No Show' THEN 1 END) AS "จำนวนตั๋วที่ไม่มา"
          FROM "Ticket" t
          JOIN "Schedule" s ON t."sch_code" = s."Sch_code"
          WHERE 1=1
        `;
        groupBy = ` GROUP BY TO_CHAR(s."Time", 'YYYY')`;
        break;

      case '3':
        // รีพอร์ต 3: พฤติกรรมผู้ใช้ (สถานีขึ้น-ลง และจำนวนสถานะตั๋ว)
        baseSql = `
          SELECT t."U_Name" || ' (' || st1."St_name" || ' ➔ ' || st2."St_name" || ')' AS "ผู้ใช้งาน",
                 COUNT(CASE WHEN t."tick_status" IN ('Check-in', 'Completed') THEN 1 END) AS "มาขึ้นรถ",
                 COUNT(CASE WHEN t."tick_status" = 'Cancelled' THEN 1 END) AS "ยกเลิก",
                 COUNT(CASE WHEN t."tick_status" = 'No Show' THEN 1 END) AS "ไม่มา"
          FROM "Ticket" t
          JOIN "Station" st1 ON t."br_station" = st1."St_code"
          JOIN "Station" st2 ON t."de_station" = st2."St_code"
          WHERE 1=1
        `;
        groupBy = ` GROUP BY t."U_Name", st1."St_name", st2."St_name"`;
        break;

      case '4':
        // รีพอร์ต 4: งานคนขับก่อนและหลัง 17:00 น.
        baseSql = `
          SELECT m."Sname" || ' ' || m."Lname" AS "ชื่อคนขับ",
                 COUNT(CASE WHEN TO_NUMBER(TO_CHAR(s."Time", 'HH24')) < 17 THEN 1 END) AS "ก่อน 17.00 น.",
                 COUNT(CASE WHEN TO_NUMBER(TO_CHAR(s."Time", 'HH24')) >= 17 THEN 1 END) AS "หลัง 17.00",
                 COUNT(s."Sch_code") AS "สรุปงานทั้งหมด"
          FROM "Schedule" s
          JOIN "Member" m ON s."driver" = m."U_Name"
          WHERE 1=1
        `;
        groupBy = ` GROUP BY m."Sname" || ' ' || m."Lname"`;
        break;

      case '5':
        // รีพอร์ต 5: จำนวนงานของรถแต่ละคัน
        baseSql = `
          SELECT b."Bus_plate" AS "ทะเบียนรถ", 
                 COUNT(s."Sch_code") AS "จำนวนรอบ"
          FROM "Schedule" s 
          JOIN "Bus" b ON s."bus" = b."Bus_code" 
          WHERE 1=1
        `;
        groupBy = ` GROUP BY b."Bus_plate"`;
        break;

      default:
        return res.status(400).json({ message: 'ไม่พบหมายเลข Report ที่ระบุ' });
    }

    if (date_start && date_end) {
      baseSql += ` AND TRUNC(s."Time") BETWEEN TO_DATE(:date_start, 'YYYY-MM-DD') AND TO_DATE(:date_end, 'YYYY-MM-DD')`;
      binds.date_start = date_start;
      binds.date_end = date_end;
    }

    const finalSql = baseSql + groupBy + ` ORDER BY ${sort_by} ${order === 'DESC' ? 'DESC' : 'ASC'}`;
    const result = await connection.execute(finalSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(`🚨 รามิสพบ Error รายงานที่ ${report_id}:`, error.message);
    res.status(500).json({ message: `Oracle Error: ${error.message}` });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) { } }
  }
});

app.listen(PORT, () => console.log(` Server is running on port ${PORT}`));