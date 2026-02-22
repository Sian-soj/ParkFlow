const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const supabase = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

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
const checkExpiries = async () => {
    const now = new Date().toISOString();

    // 1. Mark PENDING as EXPIRED
    await supabase
        .from('visitor_passes')
        .update({ status: 'EXPIRED' })
        .eq('status', 'PENDING')
        .lt('expiry_time', now);

    // 2. Clear slots for ACTIVE passes that expired
    const { data: expiredPasses } = await supabase
        .from('visitor_passes')
        .select('id')
        .eq('status', 'ACTIVE')
        .lt('expiry_time', now);

    if (expiredPasses && expiredPasses.length > 0) {
        const expiredIds = expiredPasses.map(p => p.id);
        
        await supabase
            .from('visitor_passes')
            .update({ status: 'EXPIRED' })
            .in('id', expiredIds);

        await supabase
            .from('parking_slots')
            .update({ status: 'AVAILABLE', linked_pass_id: null })
            .in('linked_pass_id', expiredIds);
    }
};

setInterval(checkExpiries, 60000); // Check every minute

// ==========================================
// RESIDENT ENDPOINTS
// ==========================================

// Resident Login
app.post('/api/auth/resident/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase
            .from('residents')
            .select('id, name, email, flat_number')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error || !data) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({ user: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resident View Own Passes
app.get('/api/residents/:id/passes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('visitor_passes')
            .select('*')
            .eq('resident_id', req.params.id)
            .order('issue_time', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resident Create Pass
app.post('/api/passes', async (req, res) => {
    try {
        const { resident_id, visitor_name, vehicle_number, duration_hours } = req.body;
        const expiryTime = new Date(Date.now() + duration_hours * 3600000).toISOString();
        const passCode = generatePassCode();

        const { data, error } = await supabase
            .from('visitor_passes')
            .insert([
                {
                    resident_id,
                    visitor_name,
                    vehicle_number,
                    expiry_time: expiryTime,
                    status: 'PENDING',
                    pass_code: passCode
                }
            ])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Resident Cancel Pass
app.patch('/api/passes/:id/cancel', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('visitor_passes')
            .update({ status: 'COMPLETED' })
            .eq('id', req.params.id)
            .eq('status', 'PENDING')
            .select();

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(400).json({ error: 'Pass not found or not in PENDING status' });
        }
        res.json({ message: 'Pass cancelled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
app.get('/api/dashboard', async (req, res) => {
    try {
        // Get slot stats
        const { data: allSlots } = await supabase
            .from('parking_slots')
            .select('status');

        const total = allSlots?.length || 0;
        const available = allSlots?.filter(s => s.status === 'AVAILABLE').length || 0;
        const occupied = allSlots?.filter(s => s.status === 'OCCUPIED').length || 0;

        // Get parked vehicles
        const { data: parked } = await supabase
            .from('visitor_passes')
            .select(`
                *,
                parking_slots!linked_pass_id(id)
            `)
            .eq('status', 'ACTIVE');

        const parkedWithSlots = parked?.map(p => ({
            ...p,
            slot_id: p.parking_slots?.[0]?.id
        })) || [];

        res.json({ 
            slots: { total, available, occupied }, 
            parked: parkedWithSlots 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validate Pass (By ID or Code)
app.post('/api/validate-pass', async (req, res) => {
    try {
        const { passId, passCode } = req.body;

        if (!passId && !passCode) return res.status(400).json({ message: 'Pass ID or Code is required' });

        let query = supabase
            .from('visitor_passes')
            .select(`
                *,
                residents!inner(name, flat_number)
            `);

        // Search by ID first, then by code
        if (passId) {
            query = query.eq('id', passId);
        } else if (passCode) {
            query = query.eq('pass_code', passCode);
        }

        const { data: passes, error } = await query;

        if (error || !passes || passes.length === 0) {
            return res.status(404).json({ message: 'Pass not found' });
        }

        const pass = passes[0];

        // Auto-expire check
        if (pass.status === 'PENDING' && new Date(pass.expiry_time) < new Date()) {
            await supabase
                .from('visitor_passes')
                .update({ status: 'EXPIRED' })
                .eq('id', pass.id);
            
            return res.status(400).json({ 
                message: 'Pass has expired', 
                pass: {
                    ...pass,
                    resident_name: pass.residents?.name,
                    flat_number: pass.residents?.flat_number
                }
            });
        }

        res.json({
            ...pass,
            resident_name: pass.residents?.name,
            flat_number: pass.residents?.flat_number
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Allow Entry
app.post('/api/allow-entry/:id', async (req, res) => {
    try {
        const passId = req.params.id;

        // Get available slot
        const { data: slots, error: slotError } = await supabase
            .from('parking_slots')
            .select('id')
            .eq('status', 'AVAILABLE')
            .limit(1);

        if (slotError || !slots || slots.length === 0) {
            return res.status(400).json({ message: 'No slots available' });
        }

        const slotId = slots[0].id;

        // Update pass
        await supabase
            .from('visitor_passes')
            .update({ 
                status: 'ACTIVE', 
                entry_time: new Date().toISOString() 
            })
            .eq('id', passId);

        // Update slot
        await supabase
            .from('parking_slots')
            .update({ 
                status: 'OCCUPIED', 
                linked_pass_id: passId 
            })
            .eq('id', slotId);

        res.json({ success: true, slot_id: slotId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark Exit
app.post('/api/mark-exit/:id', async (req, res) => {
    try {
        const passId = req.params.id;

        // Update pass
        await supabase
            .from('visitor_passes')
            .update({ 
                status: 'COMPLETED', 
                exit_time: new Date().toISOString() 
            })
            .eq('id', passId);

        // Free slot
        await supabase
            .from('parking_slots')
            .update({ 
                status: 'AVAILABLE', 
                linked_pass_id: null 
            })
            .eq('linked_pass_id', passId);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search Activity
app.get('/api/search', async (req, res) => {
    try {
        const { vehicle } = req.query;
        const { data, error } = await supabase
            .from('visitor_passes')
            .select(`
                *,
                parking_slots!linked_pass_id(id)
            `)
            .eq('status', 'ACTIVE')
            .ilike('vehicle_number', `%${vehicle}%`);

        if (error) throw error;

        const result = data?.[0] ? {
            ...data[0],
            slot_id: data[0].parking_slots?.[0]?.id
        } : null;

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// View All Passes
app.get('/api/passes', async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = supabase
            .from('visitor_passes')
            .select(`
                *,
                residents!inner(name, flat_number)
            `)
            .order('issue_time', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Flatten resident info
        const response = data.map(pass => ({
            ...pass,
            resident_name: pass.residents?.name,
            flat_number: pass.residents?.flat_number
        }));

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Settings
app.get('/api/settings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('app_config')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        const { max_duration_hours, max_active_slots } = req.body;

        // Update settings
        await supabase
            .from('app_config')
            .update({ max_duration_hours, max_active_slots })
            .eq('id', 1);

        // Get current slots count
        const { data: slots, error: slotsError } = await supabase
            .from('parking_slots')
            .select('*');

        if (slotsError) throw slotsError;

        const currentCount = slots?.length || 0;

        if (max_active_slots > currentCount) {
            const diff = max_active_slots - currentCount;
            const newSlots = Array(diff).fill({ status: 'AVAILABLE' });
            await supabase.from('parking_slots').insert(newSlots);
        } else if (max_active_slots < currentCount) {
            // Delete available slots
            const { data: availableSlots } = await supabase
                .from('parking_slots')
                .select('id')
                .eq('status', 'AVAILABLE')
                .limit(currentCount - max_active_slots);

            if (availableSlots && availableSlots.length > 0) {
                const idsToDelete = availableSlots.map(s => s.id);
                await supabase.from('parking_slots').delete().in('id', idsToDelete);
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Unified Main Backend running on http://localhost:${PORT}`);
});
