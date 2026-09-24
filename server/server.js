require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const oracledb = require('oracledb'); 

const app = express();
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret';
const PORT = process.env.PORT || 5000;

async function getDBConnection() {
  return await oracledb.getConnection({ 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`
  });
}

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
    const userFromDB = result.rows[0]; 

    if (!userFromDB) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = await bcrypt.compare(u_pass, userFromDB.U_pass);

    if (!isMatch) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
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

//======================================================================================================================================
//                                                     Driver System
//======================================================================================================================================
//Schedule
app.get('/api/driver/schedules', verifyToken, async (req, res) => {
  const driverUsername = req.user.username; 
  let connection;
  
  try {
    connection = await getDBConnection();

    const sql = ` 
      SELECT 
        s."Sch_code", 
        s."Time", 
        r."route_name",
        (SELECT st."St_name" FROM "Route_stop" rs JOIN "Station" st ON rs."St_code" = st."St_code" WHERE rs."route_code" = s."route_code" ORDER BY rs."seq_no" ASC FETCH FIRST 1 ROWS ONLY) AS "start_station",
        (SELECT st."St_name" FROM "Route_stop" rs JOIN "Station" st ON rs."St_code" = st."St_code" WHERE rs."route_code" = s."route_code" ORDER BY rs."seq_no" DESC FETCH FIRST 1 ROWS ONLY) AS "end_station",
        b."Bus_name", 
        b."Seats" AS "total_seats",
        (SELECT COUNT(*) FROM "Ticket" t WHERE t."sch_code" = s."Sch_code" AND t."tick_status" IN ('Booked', 'Check-in')) AS "booked_seats"
      FROM "Schedule" s
      JOIN "Route" r ON s."route_code" = r."route_code"
      JOIN "Bus" b ON s."bus" = b."Bus_code"
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
    console.error('Driver Schedule Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงตารางเดินรถ' });
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

//======================================================================================================================================
//                                                 Passenger System
//======================================================================================================================================
//Schedule
app.get('/api/passenger/schedules', verifyToken, async (req, res) => {
  const { station_id } = req.query; 
  let connection;

  try {
    connection = await getDBConnection();

    let sql = `
      WITH ScheduleDetails AS (
        SELECT 
          s."Sch_code", 
          s."Time", 
          r."route_name",
          (SELECT rs."St_code" FROM "Route_stop" rs WHERE rs."route_code" = s."route_code" ORDER BY rs."seq_no" ASC FETCH FIRST 1 ROWS ONLY) AS "start_st_code",
          (SELECT st."St_name" FROM "Route_stop" rs JOIN "Station" st ON rs."St_code" = st."St_code" WHERE rs."route_code" = s."route_code" ORDER BY rs."seq_no" ASC FETCH FIRST 1 ROWS ONLY) AS "start_station",
          (SELECT st."St_name" FROM "Route_stop" rs JOIN "Station" st ON rs."St_code" = st."St_code" WHERE rs."route_code" = s."route_code" ORDER BY rs."seq_no" DESC FETCH FIRST 1 ROWS ONLY) AS "end_station",
          b."Bus_name", 
          b."Seats" AS "total_seats",
          (SELECT COUNT(*) FROM "Ticket" t WHERE t."sch_code" = s."Sch_code" AND t."tick_status" IN ('Booked', 'Check-in')) AS "booked_seats"
        FROM "Schedule" s
        JOIN "Route" r ON s."route_code" = r."route_code"
        JOIN "Bus" b ON s."bus" = b."Bus_code"
        WHERE s."Time" >= SYSDATE + INTERVAL '20' MINUTE
      )
      SELECT * FROM ScheduleDetails
    `;

    const binds = {};
    if (station_id) {
      sql += ` WHERE "start_st_code" = :station_id `;
      binds.station_id = station_id;
    }
    sql += ` ORDER BY "Time" ASC`;

    const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    const responseData = result.rows.map(row => ({
      ...row,
      available_seats: row.total_seats - row.booked_seats
    }));

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Passenger Schedules Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงตารางเดินรถ' });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) {} }
  }
});

//Ticket
app.post('/api/passenger/book', verifyToken, async (req, res) => {
  const username = req.user.username; 
  const { sch_code, br_station, de_station } = req.body;
  let connection;

  try {
    connection = await getDBConnection();

    const idResult = await connection.execute(`SELECT NVL(MAX("Ticket_id"), 1000) + 1 AS "new_id" FROM "Ticket"`);
    const newTicketId = idResult.rows[0][0];

    const seatResult = await connection.execute(`SELECT COUNT(*) + 1 AS "next_seat" FROM "Ticket" WHERE "sch_code" = :1`, [sch_code]);
    const nextSeat = seatResult.rows[0][0];

    const insertSql = `
      INSERT INTO "Ticket" (
        "Ticket_id", "sch_code", "tick_status", "U_Name", "seat_no", 
        "br_station", "de_station", "booking_time", "expire_time"
      ) 
      VALUES (
        :ticket_id, :sch_code, 'Booked', :username, :seat_no, 
        :br_station, :de_station, SYSDATE, 
        (SELECT "Time" FROM "Schedule" WHERE "Sch_code" = :sch_code)
      )
    `;

    await connection.execute(insertSql, {
      ticket_id: newTicketId,
      sch_code: sch_code,
      username: username,
      seat_no: nextSeat,
      br_station: br_station,
      de_station: de_station
    }, { autoCommit: true }); 

    res.json({ success: true, message: 'จองตั๋วสำเร็จ', ticket_id: newTicketId, seat_no: nextSeat });
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจองตั๋ว' });
  } finally {
    if (connection) { try { await connection.close(); } catch (err) {} }
  }
});

//======================================================================================================================================
//                                                 Admin System
//======================================================================================================================================
//Member
//Schedule
//ticket
//Report1
//Report2
//Report3
//Report4
//Report5
//Report6
//Report7

app.listen(PORT, () => console.log(` Server is running on port ${PORT}`));