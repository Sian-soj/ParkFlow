import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Settings as SettingsIcon, Clock, Layers, AlertCircle } from 'lucide-react';

const Settings = () => {
    const [config, setConfig] = useState({ max_duration_hours: 4, max_active_slots: 3 });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/api/settings');
                if (response.data) setConfig(response.data);
            } catch (err) {
                console.error('Error fetching settings');
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await axios.put('/api/settings', config);
            setMessage({ type: 'success', text: 'Settings updated successfully!' });
        } catch (err) {
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
                        <p className="text-xs text-slate-400 mt-1.5 italic">Passes will expire automatically after this time</p>
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
