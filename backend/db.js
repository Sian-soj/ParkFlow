const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'parkflow.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Create tables
        db.run(`CREATE TABLE IF NOT EXISTS residents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            flat_number TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS visitor_passes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resident_id INTEGER NOT NULL,
            visitor_name TEXT NOT NULL,
            vehicle_number TEXT NOT NULL,
            issue_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            expiry_time DATETIME NOT NULL,
            status TEXT CHECK(status IN ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED')) DEFAULT 'PENDING',
            entry_time DATETIME,
            exit_time DATETIME,
            FOREIGN KEY(resident_id) REFERENCES residents(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS parking_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT CHECK(status IN ('AVAILABLE', 'OCCUPIED')) DEFAULT 'AVAILABLE',
            linked_pass_id INTEGER,
            FOREIGN KEY(linked_pass_id) REFERENCES visitor_passes(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            max_visitor_duration INTEGER DEFAULT 4,
            max_active_visitor_slots INTEGER DEFAULT 3
        )`);

        // Seed settings
        db.get("SELECT COUNT(*) AS count FROM settings", (err, row) => {
            if (row.count === 0) {
                db.run("INSERT INTO settings (max_visitor_duration, max_active_visitor_slots) VALUES (4, 3)");
            }
        });

        // Seed residents
        db.get("SELECT COUNT(*) AS count FROM residents", (err, row) => {
            if (row.count === 0) {
                const stmt = db.prepare("INSERT INTO residents (name, email, password, flat_number) VALUES (?, ?, ?, ?)");
                // Using a flat "password123" for MVP simplicity instead of bcrypt
                const residents = [
                    ['John Doe', 'john@gmail.com', 'password123', 'A-101'],
                    ['Jane Smith', 'jane@gmail.com', 'password123', 'B-205'],
                    ['Robert Brown', 'robert@gmail.com', 'password123', 'C-302'],
                    ['Emily White', 'emily@gmail.com', 'password123', 'D-401'],
                    ['Michael Green', 'michael@gmail.com', 'password123', 'E-505']
                ];
                residents.forEach(r => stmt.run(r));
                stmt.finalize();
            }
        });

        // Seed parking slots
        db.get("SELECT COUNT(*) AS count FROM parking_slots", (err, row) => {
            if (row.count === 0) {
                const stmt = db.prepare("INSERT INTO parking_slots (status) VALUES ('AVAILABLE')");
                for (let i = 0; i < 3; i++) {
                    stmt.run();
                }
                stmt.finalize();
            }
        });
    });
}

module.exports = db;
