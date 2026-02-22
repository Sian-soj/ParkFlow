import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Settings as SettingsIcon, Clock, Layers, AlertCircle } from 'lucide-react';

const Settings = () => {
    const [config, setConfig] = useState({ max_duration_hours: 4, max_active_slots: 3 });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('app_config')
                    .select('*')
                    .limit(1)
                    .single();

                if (error) throw error;
                if (data) setConfig(data);
            } catch (err) {
                console.error('Error fetching settings:', err.message);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            // Update settings
            const { error: updateError } = await supabase
                .from('app_config')
                .update({
                    max_duration_hours: config.max_duration_hours,
                    max_active_slots: config.max_active_slots
                })
                .eq('id', 1);

            if (updateError) throw updateError;

            // Handle slot adjustments (increasing slots)
            const { data: slots, error: slotsError } = await supabase
                .from('parking_slots')
                .select('id');

            if (slotsError) throw slotsError;

            const currentCount = slots?.length || 0;

            if (config.max_active_slots > currentCount) {
                const diff = config.max_active_slots - currentCount;
                const newSlots = Array(diff).fill({ status: 'AVAILABLE' });
                await supabase.from('parking_slots').insert(newSlots);
            } else if (config.max_active_slots < currentCount) {
                // Delete available slots if needed (manual logic as per main_BACKEND)
                const { data: availableSlots } = await supabase
                    .from('parking_slots')
                    .select('id')
                    .eq('status', 'AVAILABLE')
                    .limit(currentCount - config.max_active_slots);

                if (availableSlots && availableSlots.length > 0) {
                    const idsToDelete = availableSlots.map(s => s.id);
                    await supabase.from('parking_slots').delete().in('id', idsToDelete);
                }
            }

            setMessage({ type: 'success', text: 'Settings updated successfully!' });
        } catch (err) {
            console.error('Save failed:', err.message);
            setMessage({ type: 'error', text: 'Failed to update settings' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-blue-600 p-3 rounded-2xl text-white">
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">System Settings</h1>
                    <p className="text-slate-500">Configure global parking constraints</p>
                </div>
            </div>

            <div className="card">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                            <Clock size={16} className="mr-2 text-slate-400" />
                            Max Visitor Duration (Hours)
                        </label>
                        <input
                            type="number"
                            className="input-field"
                            value={config.max_duration_hours}
                            onChange={(e) => setConfig({ ...config, max_duration_hours: parseInt(e.target.value) })}
                            min="1"
                            max="24"
                        />
                        <p className="text-xs text-slate-400 mt-1.5 italic">Maximum duration for visitor stays (for record-keeping)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                            <Layers size={16} className="mr-2 text-slate-400" />
                            Max Active Visitor Slots
                        </label>
                        <input
                            type="number"
                            className="input-field"
                            value={config.max_active_slots}
                            onChange={(e) => setConfig({ ...config, max_active_slots: parseInt(e.target.value) })}
                            min="1"
                            max="50"
                        />
                        <p className="text-xs text-slate-400 mt-1.5 italic">Total physical parking slots available for visitors</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            <AlertCircle size={18} />
                            <p className="text-sm font-medium">{message.text}</p>
                        </div>
                    )}
                </form>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                <h4 className="font-bold text-blue-800 mb-2 text-sm flex items-center">
                    <AlertCircle size={16} className="mr-2" />
                    Information
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                    Increasing the "Max Active Visitor Slots" will automatically create new AVAILABLE slots in the database.
                    Decreasing this value will not remove existing slots to prevent data loss if they are occupied.
                </p>
            </div>
        </div>
    );
};

export default Settings;
