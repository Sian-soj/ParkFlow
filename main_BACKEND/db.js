const supabase = require('./supabase');

// Initialize Supabase tables and seed data
async function initDb() {
    try {
        console.log('Initializing Supabase database...');

        // Seed app_config
        const { data: configData } = await supabase
            .from('app_config')
            .select('*');

        if (!configData || configData.length === 0) {
            await supabase.from('app_config').insert([
                { max_duration_hours: 4, max_active_slots: 3 }
            ]);
            console.log('App config seeded');
        }

        // Seed residents
        const { data: residentsData } = await supabase
            .from('residents')
            .select('*');

        if (!residentsData || residentsData.length === 0) {
            const residents = [
                { name: 'Arun', email: 'arun@parkflow.com', password: 'password123', flat_number: 'A101' },
                { name: 'Meera', email: 'meera@parkflow.com', password: 'password123', flat_number: 'A102' },
                { name: 'Rahul', email: 'rahul@parkflow.com', password: 'password123', flat_number: 'B201' },
                { name: 'Sneha', email: 'sneha@parkflow.com', password: 'password123', flat_number: 'B202' },
                { name: 'Vikram', email: 'vikram@parkflow.com', password: 'password123', flat_number: 'C301' }
            ];
            await supabase.from('residents').insert(residents);
            console.log('Residents seeded');
        }

        // Seed parking slots
        const { data: parkingSlotsData } = await supabase
            .from('parking_slots')
            .select('*');

        if (!parkingSlotsData || parkingSlotsData.length === 0) {
            const slots = Array(3).fill({ status: 'AVAILABLE' });
            await supabase.from('parking_slots').insert(slots);
            console.log('Parking slots seeded');
        }

        console.log('Database initialization complete');
    } catch (error) {
        console.error('Error initializing database:', error.message);
    }
}

// Call initialization on module load
initDb();

module.exports = supabase;
