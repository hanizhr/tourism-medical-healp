const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const db = new sqlite3.Database('database.db');
const saltRounds = 10;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    next();
});

// تنظیم Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yourgmail@gmail.com', // جایگزین کنید
        pass: 'yourpassword' // جایگزین کنید
    }
});

// مسیر اصلی به login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// تابع برای اضافه کردن ستون
function addColumnIfNotExists(table, column, type) {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) {
            console.error(`Error fetching table info for ${table}:`, err);
            return;
        }
        const columnExists = rows.some(row => row.name === column);
        if (!columnExists) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
                if (err) {
                    console.error(`Error adding column ${column} to ${table}:`, err);
                } else {
                    console.log(`Column ${column} added to ${table}`);
                }
            });
        } else {
            console.log(`Column ${column} already exists in ${table}`);
        }
    });
}

// ایجاد جدول‌ها
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        mobile TEXT UNIQUE,
        role TEXT,
        email TEXT,
        specialty TEXT,
        language TEXT DEFAULT 'fa'
    )`);

    // اضافه کردن ستون‌های جدید
    addColumnIfNotExists('users', 'first_name', 'TEXT');
    addColumnIfNotExists('users', 'last_name', 'TEXT');
    addColumnIfNotExists('users', 'password', 'TEXT');
    addColumnIfNotExists('users', 'verified', 'INTEGER DEFAULT 0');
    addColumnIfNotExists('users', 'verification_code', 'TEXT');
    addColumnIfNotExists('users', 'resume', 'TEXT'); 
    addColumnIfNotExists('users', 'age', 'INTEGER');
    addColumnIfNotExists('users', 'gender', 'TEXT');
    addColumnIfNotExists('users', 'address', 'TEXT');

    db.run(`CREATE TABLE IF NOT EXISTS tourist_rep_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tourist_id INTEGER,
        rep_id INTEGER,
        status TEXT DEFAULT 'pending'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rep_doc_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rep_id INTEGER,
        doc_id INTEGER,
        status TEXT DEFAULT 'pending',
        appointment_time TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recipient_id INTEGER,
        message TEXT,
        reply TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tourist_id INTEGER,
        rep_id INTEGER
    )`);

   
   // ایجاد مدیر پیش‌فرض
bcrypt.hash('adminpass', saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hashing admin password:', err);
        return;
    }
    db.run(
        `INSERT OR IGNORE INTO users (first_name, last_name, email, mobile, role, password, verified, name, age, gender, address) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Admin', 'Main', 'admin@example.com', '0000000000', 'admin', hash, 1, 'Admin Main', null, null, null],
        (err) => {
            if (err) {
                console.error('Error creating default admin:', err);
            } else {
                console.log('Default admin created or already exists');
            }
        }
    );
});
});

// ثبت‌نام
app.post('/register', (req, res) => {
    const { first_name, last_name, email, mobile, role, password, age, gender, address } = req.body;
    const name = `${first_name} ${last_name}`; // ترکیب first_name و last_name برای ستون name
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            res.json({ success: false, error: 'Error hashing password' });
            return;
        }
        const code = crypto.randomBytes(2).toString('hex').toUpperCase();
        db.run('INSERT INTO users (first_name, last_name, email, mobile, role, password, verification_code, name, age, gender, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [first_name, last_name, email, mobile, role, hash, code, name, age, gender, address], function(err) {
            if (err) {
                res.json({ success: false, error: 'User already exists or database error' });
                return;
            }
            res.json({ success: true, userId: this.lastID });
        });
    });
});

// تأیید کد
app.post('/verify', (req, res) => {
    const { userId, code } = req.body;
    db.get('SELECT verification_code FROM users WHERE id = ?', [userId], (err, row) => {
        // if (row && row.verification_code === code) {
        //     db.run('UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?', [userId], (err) => {
        //         res.json({ success: !err });
        //     });
        // } else {
        //     res.json({ success: false, error: 'Invalid code' });
        // }
        db.run('UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?', [userId], (err) => {
                res.json({ success: !err });})
    });
});

// ورود
app.post('/login', (req, res) => {
    const { identifier, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ? OR mobile = ?', [identifier, identifier], (err, user) => {
        if (!user) {
            res.json({ success: false, error: 'User not found' });
            return;
        }
        if (!user.verified) {
            res.json({ success: false, error: 'Account not verified' });
            return;
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                res.json({ success: true, user });
            } else {
                res.json({ success: false, error: 'Invalid password' });
            }
        });
    });
});

// اضافه کردن subadmin
app.post('/add-subadmin', (req, res) => {
    const { first_name, last_name, email, mobile, password, adminUser, age, gender, address } = req.body;
    const name = `${first_name} ${last_name}`; // ترکیب برای ستون name
    if (adminUser.role !== 'admin') {
        res.json({ success: false, error: 'Unauthorized' });
        return;
    }
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            res.json({ success: false, error: 'Error hashing password' });
            return;
        }
        db.run('INSERT INTO users (first_name, last_name, email, mobile, role, password, verified, name, age, gender, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [first_name, last_name, email, mobile, 'subadmin', hash, 1, name, age, gender, address], (err) => {
            res.json({ success: !err });
        });
    });
});


// دریافت همه پیام‌ها (فقط برای مدیر و زیرمدیر)
app.get('/get-all-messages', (req, res) => {
    const user = req.query.user ? JSON.parse(req.query.user) : null;
    if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
    }
    db.all(`
        SELECT m.id, u.last_name as senderName, u.role as senderRole, m.message, m.reply
        FROM messages m 
        JOIN users u ON m.user_id = u.id 
        ORDER BY m.id DESC
    `, (err, rows) => {
        if (err) {
            console.error('Error fetching all messages:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});

// دریافت همه کاربران (فقط برای مدیر و زیرمدیر)
app.get('/get-all-users', (req, res) => {
    const user = req.query.user ? JSON.parse(req.query.user) : null;

    db.all('SELECT id, first_name, last_name, email, mobile, role, age, gender, address FROM users', (err, rows) => {
        if (err) {
            console.error('Error fetching all users:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});

app.get('/get-doctor-connections', (req, res) => {
    const user = req.query.user ? JSON.parse(req.query.user) : null;
    // if (!user || (user.role !== 'admin' && user.role !== 'subadmin')) {
    //     res.status(403).json({ success: false, error: 'Unauthorized' });
    //     return;
    // }
    db.all(`
        SELECT c.id, ur.id as rep_id, ur.last_name as repName, ud.last_name as doctorName, c.appointment_time, c.doc_id
        FROM rep_doc_requests c 
        JOIN users ur ON c.rep_id = ur.id
        JOIN users ud ON c.doc_id = ud.id
    `, (err, rows) => {
        if (err) {
            console.error('Error fetching doctor connections:', err);
            res.status(500).json([]);
            return;
        }
        console.log('Doctor connections fetched:', rows); // لاگ برای دیباگ
        res.json(rows);
    });
});


// دریافت نمایندگان نزدیک (برای توریست)
app.get('/get-nearby-representatives', (req, res) => {
    const { touristLat, touristLng, maxDistance = 50 } = req.query; // maxDistance in km
    if (!touristLat || !touristLng) {
        res.json([]);
        return;
    }
    db.all(`
        SELECT id, first_name, last_name, gender, age, experience_years, rating, online_status, phone, location, address
        FROM users 
        WHERE role = "representative" AND location IS NOT NULL
    `, (err, reps) => {
        if (err) {
            console.error('Error fetching representatives:', err);
            res.status(500).json([]);
            return;
        }
        const nearbyReps = reps.filter(rep => {
            if (!rep.location) return false;
            const loc = JSON.parse(rep.location);
            const distance = math.distance([parseFloat(touristLat), parseFloat(touristLng)], [loc.lat, loc.lng]); // فاصله با mathjs
            return distance <= maxDistance;
        }).map(rep => ({
            id: rep.id,
            name: `${rep.first_name} ${rep.last_name}`,
            gender: rep.gender,
            age: rep.age,
            experience_years: rep.experience_years,
            rating: rep.rating,
            online_status: rep.online_status ? 'آنلاین' : 'آفلاین',
            phone: rep.phone,
            address: rep.address
        }));
        res.json(nearbyReps);
    });
});

// به‌روزرسانی وضعیت آنلاین
app.post('/update-online-status', (req, res) => {
    const { userId, status } = req.body;
    db.run('UPDATE users SET online_status = ? WHERE id = ?', [status ? 1 : 0, userId], (err) => {
        res.json({ success: !err });
    });
});

// ثبت درخواست توریست به نماینده
app.post('/tourist-request-rep', (req, res) => {
    const { touristId, repId, description } = req.body;
    db.run('INSERT INTO tourist_rep_requests (tourist_id, rep_id, description, status) VALUES (?, ?, ?, ?)', 
        [touristId, repId, description, 'pending'], (err) => {
        res.json({ success: !err });
    });
});

app.post('/update-role', (req, res) => {
     console.log("update-role body:", req.body); 
    const { mobile, role } = req.body;
    if (!mobile || !role) {
        return res.json({ success: false, message: "mobile or role missing" });
    }

    db.run("UPDATE users SET role = ? WHERE mobile = ?", [role, mobile], function(err) {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: "db error" });
        }
        if (this.changes === 0) {
            db.run("INSERT INTO users (mobile, role) VALUES (?, ?)", [mobile, role], (err2) => {
                if (err2) {
                    console.error(err2);
                    return res.json({ success: false, message: "insert error" });
                }
                return res.json({ success: true, message: "role inserted" });
            });
        } else {
            return res.json({ success: true, message: "role updated" });
        }
    });
});

app.post('/update-language', (req, res) => {
    const { mobile, language } = req.body;
    db.run('UPDATE users SET language = ? WHERE mobile = ?', [language, mobile], (err) => {
        res.json({ success: !err });
    });
});

app.post('/update-specialty', (req, res) => {
    const { mobile, specialty, resume } = req.body;
    db.run('UPDATE users SET specialty = ?, resume = ? WHERE mobile = ?', [specialty, resume, mobile], (err) => {
        if (err) {
            console.error('Error updating specialty and resume:', err);
            res.json({ success: false });
            return;
        }
        res.json({ success: true });
    });
});

app.post('/update-email', (req, res) => {
    const { mobile, email } = req.body;
    db.run('UPDATE users SET email = ? WHERE mobile = ?', [email, mobile], (err) => {
        res.json({ success: !err });
    });
});

app.get('/get-representatives', (req, res) => {
    db.all('SELECT id, name, email, age, gender, address FROM users WHERE role = "representative"', (err, rows) => {
        res.json(rows);
    });
});

app.post('/request-representative', (req, res) => {
    const { touristId, repId } = req.body;
    console.log('Request from tourist ID:', touristId, 'to representative ID:', repId);
    db.run('INSERT INTO tourist_rep_requests (tourist_id, rep_id, status) VALUES (?, ?, ?)', [touristId, repId, 'pending'], function(err) {
        if (err) {
            console.error('Error inserting request:', err);
            res.status(500).json({ success: false, error: err.message });
            return;
        }
        console.log('Request inserted with ID:', this.lastID);
        res.json({ success: true });
    });
});

app.get('/get-tourist-status/:id', (req, res) => {
    const id = req.params.id;
    db.get(`
        SELECT trr.status, u.name as repName 
        FROM tourist_rep_requests trr 
        LEFT JOIN users u ON trr.rep_id = u.id 
        WHERE trr.tourist_id = ?`, 
        [id], (err, row) => {
        if (err) {
            console.error('Error fetching tourist status:', err);
            res.status(500).json({ success: false, error: 'Database error' });
            return;
        }
        res.json({ 
            status: row ? row.status : 'no_request',
            repName: row ? row.repName : null 
        });
    });
});

app.get('/get-requests-for-rep/:id', (req, res) => {
    const id = req.params.id;
    db.all(`SELECT trr.id, u.first_name as touristName FROM tourist_rep_requests trr 
            JOIN users u ON trr.tourist_id = u.id 
            WHERE trr.rep_id = ? AND trr.status = 'pending'`, [id], (err, rows) => {
        if (err) {
            console.error('Error fetching requests for representative:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});

app.post('/accept-tourist-request', (req, res) => {
    const { reqId } = req.body;
    db.run('UPDATE tourist_rep_requests SET status = "accepted" WHERE id = ?', [reqId], (err) => {
        if (err) {
            console.error('Error accepting tourist request:', err);
            res.status(500).json({ success: false, error: err.message });
            return;
        }
        db.get('SELECT tourist_id, rep_id FROM tourist_rep_requests WHERE id = ?', [reqId], (err, req) => {
            if (err) {
                console.error('Error fetching request for connection:', err);
                return;
            }
            db.run('INSERT INTO connections (tourist_id, rep_id) VALUES (?, ?)', [req.tourist_id, req.rep_id], (err) => {
                if (err) {
                    console.error('Error inserting connection:', err);
                }
            });
        });
        res.json({ success: true });
    });
});
app.get('/get-doctors', (req, res) => {
    db.all('SELECT id, name, first_name,last_name, specialty, resume, age, gender, address FROM users WHERE role = "doctor"', (err, rows) => {
        if (err) {
            console.error('Error fetching doctors:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});
app.post('/send-request-to-doc', (req, res) => {
    const { repId, docId } = req.body;
    db.run('INSERT INTO rep_doc_requests (rep_id, doc_id) VALUES (?, ?)', [repId, docId], (err) => {
        if (err) {
            console.error('Error inserting doctor request:', err);
            res.status(500).json({ success: false, error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

app.get('/get-requests-for-doc/:id', (req, res) => {
    const id = req.params.id;
    db.all(`SELECT rdr.id, u.last_name as repName FROM rep_doc_requests rdr 
            JOIN users u ON rdr.rep_id = u.id 
            WHERE rdr.doc_id = ? AND rdr.status = 'pending'`, [id], (err, rows) => {
        if (err) {
            console.error('Error fetching requests for doctor:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});

app.post('/handle-doc-request', (req, res) => {
    const { reqId, action, appointmentTime } = req.body;
    const status = action === 'accept' ? 'accepted' : 'rejected';
    let updateQuery = 'UPDATE rep_doc_requests SET status = ?';
    let updateParams = [status];
    if (action === 'accept' && appointmentTime) {
        updateQuery += ', appointment_time = ?';
        updateParams.push(appointmentTime);
    }
    updateQuery += ' WHERE id = ?';
    updateParams.push(reqId);
    db.run(updateQuery, updateParams, (err) => {
        if (err) {
            console.error('Error handling doctor request:', err);
            res.status(500).json({ success: false, error: err.message });
            return;
        }
        if (action === 'accept') {
            db.get('SELECT rep_id, doc_id FROM rep_doc_requests WHERE id = ?', [reqId], (err, req) => {
                if (err) {
                    console.error('Error fetching request for connection:', err);
                    return;
                }
                db.run('INSERT INTO doctor_rep_connections (rep_id, doc_id, appointment_time) VALUES (?, ?, ?)', 
                    [req.rep_id, req.doc_id, appointmentTime], (err) => {
                        if (err) {
                            console.error('Error inserting doctor connection:', err);
                        }
                    });
            });
        }
        res.json({ success: true });
    });
});

app.get('/get-sent-requests-for-rep/:id', (req, res) => {
    const id = req.params.id;
    db.all(`
        SELECT rdr.id, u.first_name as docName, rdr.status, rdr.appointment_time 
        FROM rep_doc_requests rdr 
        JOIN users u ON rdr.doc_id = u.id 
        WHERE rdr.rep_id = ?`, 
        [id], (err, rows) => {
        if (err) {
            console.error('Error fetching sent requests for representative:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});

app.get('/get-doctor-connections', (req, res) => {
    db.all(`
        SELECT c.id, ur.id as rep_id, ur.last_name as repName, c.appointment_time, c.doc_id
        FROM doctor_rep_connections c 
        JOIN users ur ON c.rep_id = ur.id
    `, (err, rows) => {
        if (err) {
            console.error('Error fetching doctor connections:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});


app.post('/send-message-to-admin', (req, res) => {
    const { userId, message } = req.body;
    if (!userId || !message) {
        console.error('Missing userId or message in request:', req.body);
        res.status(400).json({ success: false, error: 'Missing userId or message' });
        return;
    }
    db.get('SELECT id FROM users WHERE role = "admin"', (err, admin) => {
        if (err) {
            console.error('Error fetching admin:', err);
            res.status(500).json({ success: false, error: 'Database error' });
            return;
        }
        if (!admin) {
            console.error('No admin found in database');
            res.status(404).json({ success: false, error: 'No admin found' });
            return;
        }
        db.run('INSERT INTO messages (user_id, recipient_id, message) VALUES (?, ?, ?)', [userId, admin.id, message], (err) => {
            if (err) {
                console.error('Error inserting message:', err);
                res.status(500).json({ success: false, error: err.message });
                return;
            }
            res.json({ success: true });
        });
    });
});

// پاسخ به پیام
app.post('/reply-to-message', (req, res) => {
    const { msgId, reply } = req.body;
    if (!msgId || !reply) {
        console.error('Missing msgId or reply in request:', req.body);
        res.status(400).json({ success: false, error: 'Missing msgId or reply' });
        return;
    }
    db.run('UPDATE messages SET reply = ? WHERE id = ?', [reply, msgId], (err) => {
        if (err) {
            console.error('Error replying to message:', err);
            res.status(500).json({ success: false, error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// دریافت پیام‌های کاربر خاص
app.get('/get-messages/:userId', (req, res) => {
    const userId = req.params.userId;
    db.all(`SELECT m.id, u.name as senderName, m.message, m.reply 
            FROM messages m 
            JOIN users u ON m.user_id = u.id 
            WHERE m.recipient_id = ? OR m.user_id = ? 
            ORDER BY m.id DESC`, [userId, userId], (err, rows) => {
        if (err) {
            console.error('Error fetching messages:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});


app.get('/get-tourist-connections', (req, res) => {
    db.all(`SELECT c.id, ut.last_name as touristName, ur.last_name as repName, c.rep_id 
            FROM connections c 
            JOIN users ut ON c.tourist_id = ut.id 
            JOIN users ur ON c.rep_id = ur.id`, (err, rows) => {
        if (err) {
            console.error('Error fetching tourist connections:', err);
            res.status(500).json([]);
            return;
        }
        res.json(rows);
    });
});

app.post('/save-resume', (req, res) => {
    const { userId, resume } = req.body;
    db.run('UPDATE users SET resume = ? WHERE id = ? AND role = "doctor"', [resume, userId], (err) => {
        if (err) {
            console.error('Error saving resume:', err);
            res.json({ success: false, error: err.message });
            return;
        }
        res.json({ success: true });
    });
});
app.listen(4000, () => {
    console.log('Server running on port 3000');
});