const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Helper to run expiry logic
const checkExpiries = () => {
    const now = new Date().toISOString();

    // 1. Mark PENDING as EXPIRED if past expiry_time
    db.run(`UPDATE visitor_passes SET status = 'EXPIRED' 
            WHERE status = 'PENDING' AND expiry_time < ?`, [now]);

    // 2. Clear slots for ACTIVE passes that have expired
    db.all(`SELECT id FROM visitor_passes WHERE status = 'ACTIVE' AND expiry_time < ?`, [now], (err, rows) => {
        if (rows && rows.length > 0) {
            const expiredIds = rows.map(r => r.id);
            db.run(`UPDATE visitor_passes SET status = 'EXPIRED' WHERE id IN (${expiredIds.join(',')})`);
            db.run(`UPDATE parking_slots SET status = 'AVAILABLE', linked_pass_id = NULL WHERE linked_pass_id IN (${expiredIds.join(',')})`);
        }
    });
};

// Middleware to run expiry check on dashboard-related requests
app.use((req, res, next) => {
    if (req.path === '/dashboard' || req.path === '/passes') {
        checkExpiries();
    }
    next();
});

// Authentication
app.post('/login', (req, res) => {
    const { id, password } = req.body;
    if (id === 'admin' && password === 'admin123') {
        res.json({ success: true, user: { role: 'admin' } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Dashboard Info
app.get('/dashboard', (req, res) => {
    checkExpiries();
    db.get(`SELECT 
        (SELECT COUNT(*) FROM parking_slots) as total,
        (SELECT COUNT(*) FROM parking_slots WHERE status = 'AVAILABLE') as available,
        (SELECT COUNT(*) FROM parking_slots WHERE status = 'OCCUPIED') as occupied`,
        (err, slots) => {
            db.all(`SELECT vp.*, ps.id as slot_id 
                FROM visitor_passes vp 
                JOIN parking_slots ps ON vp.id = ps.linked_pass_id 
                WHERE vp.status = 'ACTIVE'`, (err, parked) => {
                res.json({ slots, parked });
            });
        });
});

// Validate Pass
app.post('/validate-pass', (req, res) => {
    const { passId } = req.body;
    const now = new Date().toISOString();
    db.get(`SELECT vp.*, r.name as resident_name, r.flat_number 
            FROM visitor_passes vp 
            JOIN residents r ON vp.resident_id = r.id 
            WHERE vp.id = ?`, [passId], (err, pass) => {
        if (!pass) return res.status(404).json({ message: 'Pass not found' });

        if (pass.expiry_time < now && pass.status === 'PENDING') {
            db.run(`UPDATE visitor_passes SET status = 'EXPIRED' WHERE id = ?`, [passId]);
            return res.status(400).json({ message: 'Pass has expired' });
        }

        if (pass.status !== 'PENDING') {
            return res.status(400).json({ message: `Pass is already ${pass.status}` });
        }

        res.json(pass);
    });
});

// Allow Entry
app.post('/allow-entry/:id', (req, res) => {
    const passId = req.params.id;
    const now = new Date().toISOString();

    // Check available slots
    db.get(`SELECT id FROM parking_slots WHERE status = 'AVAILABLE' LIMIT 1`, (err, slot) => {
        if (!slot) return res.status(400).json({ message: 'No slots available' });

        db.run(`UPDATE visitor_passes SET status = 'ACTIVE', entry_time = ? WHERE id = ?`, [now, passId], (err) => {
            db.run(`UPDATE parking_slots SET status = 'OCCUPIED', linked_pass_id = ? WHERE id = ?`, [passId, slot.id], (err) => {
                res.json({ success: true, slot_id: slot.id });
            });
        });
    });
});

// Mark Exit
app.post('/mark-exit/:id', (req, res) => {
    const passId = req.params.id;
    const now = new Date().toISOString();

    db.run(`UPDATE visitor_passes SET status = 'COMPLETED', exit_time = ? WHERE id = ?`, [now, passId], (err) => {
        db.run(`UPDATE parking_slots SET status = 'AVAILABLE', linked_pass_id = NULL WHERE linked_pass_id = ?`, [passId], (err) => {
            res.json({ success: true });
        });
    });
});

// View All Passes
app.get('/passes', (req, res) => {
    const { status } = req.query;
    let query = `SELECT vp.*, r.name as resident_name, r.flat_number FROM visitor_passes vp JOIN residents r ON vp.resident_id = r.id`;
    let params = [];
    if (status) {
        query += ` WHERE vp.status = ?`;
        params.push(status);
    }
    query += ` ORDER BY vp.issue_time DESC`;
    db.all(query, params, (err, rows) => {
        res.json(rows);
    });
});

// Search Active Visitor
app.get('/search', (req, res) => {
    const { vehicle } = req.query;
    db.get(`SELECT vp.*, ps.id as slot_id 
            FROM visitor_passes vp 
            JOIN parking_slots ps ON vp.id = ps.linked_pass_id 
            WHERE vp.status = 'ACTIVE' AND vp.vehicle_number LIKE ?`, [`%${vehicle}%`], (err, row) => {
        res.json(row || null);
    });
});

// Settings
app.get('/settings', (req, res) => {
    db.get(`SELECT * FROM app_config LIMIT 1`, (err, row) => {
        res.json(row);
    });
});

app.put('/settings', (req, res) => {
    const { max_duration_hours, max_active_slots } = req.body;
    db.run(`UPDATE app_config SET max_duration_hours = ?, max_active_slots = ?`,
        [max_duration_hours, max_active_slots], (err) => {

            // If max_active_slots increased, add new slots
            db.get(`SELECT COUNT(*) as count FROM parking_slots`, (err, row) => {
                const currentSlots = row.count;
                if (max_active_slots > currentSlots) {
                    const diff = max_active_slots - currentSlots;
                    const stmt = db.prepare("INSERT INTO parking_slots (status) VALUES ('AVAILABLE')");
                    for (let i = 0; i < diff; i++) {
                        stmt.run();
                    }
                    stmt.finalize();
                }
                // Note: Decreasing slots is trickier (which ones to remove?), 
                // but for MVP we'll just handle increasing or staying same.
            });

            res.json({ success: true });
        });
});

app.listen(PORT, () => {
    console.log(`Admin Backend running on http://localhost:${PORT}`);

    // Background interval for expiry logic (every 5 minutes)
    setInterval(checkExpiries, 5 * 60 * 1000);
});
