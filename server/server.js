require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const oracledb = require('oracledb'); 

const app = express();
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;


//======================================================================================================================================
//                                                                 Login System
//======================================================================================================================================
//Login
app.post('/api/login', async (req, res) => {
  const { u_name, u_pass } = req.body;

  try {
    if (!u_name || !u_pass) {
      return res.status(400).json({ message: 'กรุณากรอก Username และ Password' });
        }
     
    const connection = await oracledb.getConnection({ 
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`
        });

    const result = await connection.execute(
      `SELECT "U_Name", "U_pass", "Role_name" FROM "Member" WHERE "U_Name" = :1`,
      [u_name]
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
    }
});
//======================================================================================================================================
//                                                              Driver System
//======================================================================================================================================
//Schedule
app.get('/api/driver/schedules', verifyToken, async (req, res) => {
    const driverUsername = req.user.username; 
    try {
        connection = await oracledb.getConnection({ 
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`
    });

        const sql =` 
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

    }   catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงตารางเดินรถ' });
    }   finally {
        if (connection) {
        try { await connection.close(); } 
        catch (err) { console.error(err); }
    }
  }
    
});

    const responseData = mockSchedules.map(sch => ({
      ...sch,
      available_seats: sch.total_seats - sch.booked_seats
    }));

    res.json({ success: true, data: responseData });
  ;
//Ticket
app.get('/api/driver/schedules/:sch_code/tickets', verifyToken, async (req, res) => {
 const driverUsername = req.user.username; 
    try {
        connection = await oracledb.getConnection({ 
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`
        });
        
        try {
            const sql =`
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
    
        res.json({ success: true, data: mockTickets });
  } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั๋ว' });
  }
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
        if (connection) {
        try { await connection.close(); } 
        catch (err) { console.error(err); }
        }
    }
});
//======================================================================================================================================
//                                                           Passenger System
//======================================================================================================================================
//Schedule
//Ticket
//======================================================================================================================================
//                                                           Passenger System
//======================================================================================================================================
//Member
//SChedule
//ticket
//Report1
//Report2
//Report3
//Report4
//Report5
//Report6
//Report7

app.listen(5000, () => console.log('Server is running on port 5000'));