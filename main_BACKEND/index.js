const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 5005; // Unified port

app.use(cors());
app.use(express.json());

// Helper to generate unique 8-digit alphanumeric code
function generatePassCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Background Task: Auto-expiry logic
const checkExpiries = () => {
    const now = new Date().toISOString();

    // 1. Mark PENDING as EXPIRED
    db.run(`UPDATE visitor_passes SET status = 'EXPIRED' 
            WHERE status = 'PENDING' AND expiry_time < ?`, [now]);

    // 2. Clear slots for ACTIVE passes that expired
    db.all(`SELECT id FROM visitor_passes WHERE status = 'ACTIVE' AND expiry_time < ?`, [now], (err, rows) => {
        if (rows && rows.length > 0) {
            const expiredIds = rows.map(r => r.id);
            db.run(`UPDATE visitor_passes SET status = 'EXPIRED' WHERE id IN (${expiredIds.join(',')})`);
            db.run(`UPDATE parking_slots SET status = 'AVAILABLE', linked_pass_id = NULL WHERE linked_pass_id IN (${expiredIds.join(',')})`);
        }
    });
};

setInterval(checkExpiries, 60000); // Check every minute

// ==========================================
// RESIDENT ENDPOINTS
// ==========================================

// Resident Login
app.post('/api/auth/resident/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT id, name, email, flat_number FROM residents WHERE email = ? AND password = ?', [email, password], (err, row) => {
        if (!row) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ user: row });
    });
});

// Resident View Own Passes
app.get('/api/residents/:id/passes', (req, res) => {
    db.all("SELECT * FROM visitor_passes WHERE resident_id = ? ORDER BY issue_time DESC", [req.params.id], (err, rows) => {
        res.json(rows);
    });
});

// Resident Create Pass
app.post('/api/passes', (req, res) => {
    const { resident_id, visitor_name, vehicle_number, duration_hours } = req.body;
    const expiryTimestamp = new Date(Date.now() + duration_hours * 3600000).toISOString();
    const passCode = generatePassCode();

    db.run(
        `INSERT INTO visitor_passes (resident_id, visitor_name, vehicle_number, expiry_time, status, pass_code) VALUES (?, ?, ?, ?, 'PENDING', ?)`,
        [resident_id, visitor_name, vehicle_number, expiryTimestamp, passCode],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get("SELECT * FROM visitor_passes WHERE id = ?", [this.lastID], (err, row) => {
                res.status(201).json(row);
            });
        }
    );
});

// Resident Cancel Pass
app.patch('/api/passes/:id/cancel', (req, res) => {
    db.run(`UPDATE visitor_passes SET status = 'COMPLETED' WHERE id = ? AND status = 'PENDING'`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(400).json({ error: 'Pass not found or not in PENDING status' });
        res.json({ message: 'Pass cancelled' });
    });
});

// ==========================================
// ADMIN / GUARD ENDPOINTS
// ==========================================

// Admin Login
app.post('/api/login', (req, res) => {
    const { id, password } = req.body;
    if (id === 'admin' && password === 'admin123') {
        res.json({ success: true, user: { role: 'admin' } });
    } else {
        res.status(401).json({ error: 'Invalid admin credentials' });
    }
});

// Guard Dashboard Stats
app.get('/api/dashboard', (req, res) => {
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

// Validate Pass (By ID or Code)
app.post('/api/validate-pass', (req, res) => {
    const { passId, passCode } = req.body;
    const value = passId || passCode;

    if (!value) return res.status(400).json({ message: 'Pass ID or Code is required' });

    let query = `
        SELECT vp.*, r.name as resident_name, r.flat_number 
        FROM visitor_passes vp 
        JOIN residents r ON vp.resident_id = r.id 
        WHERE vp.id = ? OR vp.pass_code = ?
    `;

    db.get(query, [value, value], (err, pass) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pass) return res.status(404).json({ message: 'Pass not found' });

        // Auto-expire check
        if (pass.status === 'PENDING' && new Date(pass.expiry_time) < new Date()) {
            db.run(`UPDATE visitor_passes SET status = 'EXPIRED' WHERE id = ?`, [pass.id]);
            pass.status = 'EXPIRED';
            return res.status(400).json({ message: 'Pass has expired', pass });
        }
        res.json(pass);
    });
});

// Allow Entry
app.post('/api/allow-entry/:id', (req, res) => {
    const passId = req.params.id;
    db.get(`SELECT id FROM parking_slots WHERE status = 'AVAILABLE' LIMIT 1`, (err, slot) => {
        if (!slot) return res.status(400).json({ message: 'No slots available' });
        db.run(`UPDATE visitor_passes SET status = 'ACTIVE', entry_time = datetime('now') WHERE id = ?`, [passId], () => {
            db.run(`UPDATE parking_slots SET status = 'OCCUPIED', linked_pass_id = ? WHERE id = ?`, [passId, slot.id], () => {
                res.json({ success: true, slot_id: slot.id });
            });
        });
    });
});

// Mark Exit
app.post('/api/mark-exit/:id', (req, res) => {
    db.run(`UPDATE visitor_passes SET status = 'COMPLETED', exit_time = datetime('now') WHERE id = ?`, [req.params.id], () => {
        db.run(`UPDATE parking_slots SET status = 'AVAILABLE', linked_pass_id = NULL WHERE linked_pass_id = ?`, [req.params.id], () => {
            res.json({ success: true });
        });
    });
});

// Search Activity
app.get('/api/search', (req, res) => {
    const { vehicle } = req.query;
    db.get(`SELECT vp.*, ps.id as slot_id FROM visitor_passes vp JOIN parking_slots ps ON vp.id = ps.linked_pass_id WHERE vp.status = 'ACTIVE' AND vp.vehicle_number LIKE ?`, [`%${vehicle}%`], (err, row) => {
        res.json(row || null);
    });
});

// View All Passes
app.get('/api/passes', (req, res) => {
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

// Settings
app.get('/api/settings', (req, res) => {
    db.get(`SELECT * FROM app_config LIMIT 1`, (err, row) => {
        res.json(row);
    });
});

app.put('/api/settings', (req, res) => {
    const { max_duration_hours, max_active_slots } = req.body;
    db.run(`UPDATE app_config SET max_duration_hours = ?, max_active_slots = ?`, [max_duration_hours, max_active_slots], () => {
        db.get(`SELECT COUNT(*) as count FROM parking_slots`, (err, row) => {
            if (max_active_slots > row.count) {
                const diff = max_active_slots - row.count;
                const stmt = db.prepare("INSERT INTO parking_slots (status) VALUES ('AVAILABLE')");
                for (let i = 0; i < diff; i++) stmt.run();
                stmt.finalize();
            }
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Unified Main Backend running on http://localhost:${PORT}`);
});
