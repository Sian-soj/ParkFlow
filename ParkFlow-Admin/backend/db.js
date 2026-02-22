const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'parkflow_admin.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the Admin SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Drop existing tables for a clean seed on first run if needed
        // db.run(`DROP TABLE IF EXISTS app_config`);
        // db.run(`DROP TABLE IF EXISTS parking_slots`);
        // db.run(`DROP TABLE IF EXISTS visitor_passes`);
        // db.run(`DROP TABLE IF EXISTS residents`);

        db.run(`CREATE TABLE IF NOT EXISTS residents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            flat_number TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS visitor_passes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resident_id INTEGER,
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

        db.run(`CREATE TABLE IF NOT EXISTS app_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            max_duration_hours INTEGER DEFAULT 4,
            max_active_slots INTEGER DEFAULT 3
        )`);

        // Seed AppConfig
        db.get("SELECT COUNT(*) AS count FROM app_config", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO app_config (max_duration_hours, max_active_slots) VALUES (4, 3)");
            }
        });

        // Seed Residents
        db.get("SELECT COUNT(*) AS count FROM residents", (err, row) => {
            if (row && row.count === 0) {
                const residents = [
                    ['Arun', 'A101'],
                    ['Meera', 'A102'],
                    ['Rahul', 'B201'],
                    ['Sneha', 'B202'],
                    ['Vikram', 'C301']
                ];
                const stmt = db.prepare("INSERT INTO residents (name, flat_number) VALUES (?, ?)");
                residents.forEach(r => stmt.run(r));
                stmt.finalize();
            }
        });

        // Seed Parking Slots
        db.get("SELECT COUNT(*) AS count FROM parking_slots", (err, row) => {
            if (row && row.count === 0) {
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
