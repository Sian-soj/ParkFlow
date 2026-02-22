const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Auto-expire passes (Runs every minute in a real app, here checking synchronously on access, or via interval)
setInterval(() => {
    db.run(`
        UPDATE visitor_passes 
        SET status = 'EXPIRED' 
        WHERE status = 'PENDING' 
        AND expiry_time < datetime('now')
    `);
}, 60000); // Check every minute

// API Routes

// ---- AUTH ----
app.post('/api/auth/resident/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT id, name, email, flat_number FROM residents WHERE email = ? AND password = ?', [email, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid email or password' });
        res.json({ user: row }); // Return user data (simulate token)
    });
});

// ---- RESIDENTS ----
app.get('/api/residents', (req, res) => {
    db.all("SELECT * FROM residents", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/residents/:id/passes', (req, res) => {
    db.all("SELECT * FROM visitor_passes WHERE resident_id = ? ORDER BY issue_time DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Pass
app.post('/api/passes', (req, res) => {
    const { resident_id, visitor_name, vehicle_number, duration_hours } = req.body;

    // Validate inputs
    if (!resident_id || !visitor_name || !vehicle_number || !duration_hours) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert pass
    const expiryTimestamp = new Date(Date.now() + duration_hours * 3600000).toISOString();

    db.run(
        `INSERT INTO visitor_passes (resident_id, visitor_name, vehicle_number, expiry_time, status) VALUES (?, ?, ?, ?, 'PENDING')`,
        [resident_id, visitor_name, vehicle_number, expiryTimestamp],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Return created pass
            db.get("SELECT * FROM visitor_passes WHERE id = ?", [this.lastID], (err, row) => {
                res.status(201).json(row);
            });
        }
    );
});

// Cancel Pass
app.patch('/api/passes/:id/cancel', (req, res) => {
    db.run(`UPDATE visitor_passes SET status = 'COMPLETED' WHERE id = ? AND status = 'PENDING'`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(400).json({ error: 'Pass not found or not in PENDING status' });
        res.json({ message: 'Pass cancelled' });
    });
});

// ---- GUARDS ----
// Validate Pass
app.get('/api/passes/:id/validate', (req, res) => {
    db.get(`
        SELECT vp.*, r.name as resident_name, r.flat_number 
        FROM visitor_passes vp 
        JOIN residents r ON vp.resident_id = r.id 
        WHERE vp.id = ?
    `, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Pass not found' });

        // Auto-expire check
        if (row.status === 'PENDING' && new Date(row.expiry_time) < new Date()) {
            db.run(`UPDATE visitor_passes SET status = 'EXPIRED' WHERE id = ?`, [row.id]);
            row.status = 'EXPIRED';
        }

        res.json(row);
    });
});

// Allow Entry
app.post('/api/passes/:id/entry', (req, res) => {
    const passId = req.params.id;

    // First check if pass is valid
    db.get("SELECT status FROM visitor_passes WHERE id = ?", [passId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Pass not found' });
        if (row.status !== 'PENDING') return res.status(400).json({ error: `Pass is ${row.status}, cannot allow entry` });

        // Check for available slots
        db.get("SELECT id FROM parking_slots WHERE status = 'AVAILABLE' LIMIT 1", (err, slot) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!slot) return res.status(400).json({ error: 'No parking slots available' });

            // Begin transaction-like updates
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                db.run(
                    "UPDATE visitor_passes SET status = 'ACTIVE', entry_time = CURRENT_TIMESTAMP WHERE id = ?",
                    [passId]
                );

                db.run(
                    "UPDATE parking_slots SET status = 'OCCUPIED', linked_pass_id = ? WHERE id = ?",
                    [passId, slot.id]
                );

                db.run("COMMIT", (err) => {
                    if (err) return res.status(500).json({ error: 'Transaction failed' });
                    res.json({ message: 'Entry allowed, slot assigned', slot_id: slot.id });
                });
            });
        });
    });
});

// Mark Exit
app.post('/api/passes/:id/exit', (req, res) => {
    const passId = req.params.id;

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run(
            "UPDATE visitor_passes SET status = 'COMPLETED', exit_time = CURRENT_TIMESTAMP WHERE id = ? AND status = 'ACTIVE'",
            [passId],
            function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    db.run("ROLLBACK");
                    return res.status(400).json({ error: 'Pass not ACTIVE or not found' });
                }

                db.run(
                    "UPDATE parking_slots SET status = 'AVAILABLE', linked_pass_id = NULL WHERE linked_pass_id = ?",
                    [passId]
                );

                db.run("COMMIT", (err) => {
                    if (err) return res.status(500).json({ error: 'Transaction failed' });
                    res.json({ message: 'Exit marked, slot freed' });
                });
            }
        );
    });
});

// Search Active Visitor by Vehicle Number (Guard Dash)
app.get('/api/passes/active/search', (req, res) => {
    const { vehicle } = req.query;
    if (!vehicle) return res.json([]);

    db.all(`
        SELECT vp.*, ps.id as slot_id 
        FROM visitor_passes vp
        LEFT JOIN parking_slots ps ON ps.linked_pass_id = vp.id
        WHERE vp.status = 'ACTIVE' AND vp.vehicle_number LIKE ?
            `, [`%${vehicle}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


// ---- ADMIN & SYSTEM ----
app.get('/api/passes', (req, res) => {
    const { status } = req.query;
    let query = `
        SELECT vp.*, r.name as resident_name, r.flat_number
        FROM visitor_passes vp
        JOIN residents r ON vp.resident_id = r.id
        ORDER BY vp.issue_time DESC
            `;
    let params = [];

    if (status) {
        query = `
            SELECT vp.*, r.name as resident_name, r.flat_number
            FROM visitor_passes vp
            JOIN residents r ON vp.resident_id = r.id
            WHERE vp.status = ?
            ORDER BY vp.issue_time DESC
            `;
        params = [status];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/slots', (req, res) => {
    db.all("SELECT * FROM parking_slots", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/settings', (req, res) => {
    db.get("SELECT * FROM settings LIMIT 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.post('/api/settings', (req, res) => {
    const { max_visitor_duration, max_active_visitor_slots } = req.body;
    db.serialize(() => {
        db.run(
            "UPDATE settings SET max_visitor_duration = ?, max_active_visitor_slots = ?",
            [max_visitor_duration, max_active_visitor_slots],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Readjust slots if max changed
                db.all("SELECT * FROM parking_slots", (err, slots) => {
                    const currentCount = slots.length;
                    if (max_active_visitor_slots > currentCount) {
                        const diff = max_active_visitor_slots - currentCount;
                        const stmt = db.prepare("INSERT INTO parking_slots (status) VALUES ('AVAILABLE')");
                        for (let i = 0; i < diff; i++) stmt.run();
                        stmt.finalize();
                    } else if (max_active_visitor_slots < currentCount) {
                        // Complex to remove if occupied. For MVP, we'll just delete available ones.
                        const diff = currentCount - max_active_visitor_slots;
                        db.run("DELETE FROM parking_slots WHERE id IN (SELECT id FROM parking_slots WHERE status = 'AVAILABLE' LIMIT ?)", [diff]);
                    }
                    res.json({ message: 'Settings updated' });
                });
            }
        );
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
