
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

db.all('SELECT name, role, specialty FROM users', (err, rows) => {
    if (err) {
        console.error('Error fetching users:', err);
        process.exit(1);
    }
    console.log('لیست کاربران:');
    rows.forEach(row => {
        console.log(`Name: ${row.name}, Role: ${row.role || 'null'}, Specialty: ${row.specialty || '-'}`);
    });
    db.close();
});
