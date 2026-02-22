import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, MapPin, Clock, User, Car, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const Dashboard = () => {
    const [data, setData] = useState({ slots: { total: 0, available: 0, occupied: 0 }, parked: [] });
    const [passId, setPassId] = useState('');
    const [searchVehicle, setSearchVehicle] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [validationResult, setValidationResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        try {
            // Get slot stats
            const { data: allSlots } = await supabase
                .from('parking_slots')
                .select('status');

            const total = allSlots?.length || 0;
            const available = allSlots?.filter(s => s.status === 'AVAILABLE').length || 0;
            const occupied = allSlots?.filter(s => s.status === 'OCCUPIED').length || 0;

            // Get parked vehicles
            const { data: parkedData, error: parkedError } = await supabase
                .from('visitor_passes')
                .select(`
                    *,
                    parking_slots!linked_pass_id(id)
                `)
                .eq('status', 'ACTIVE');

            if (parkedError) throw parkedError;

            const parkedWithSlots = parkedData?.map(p => ({
                ...p,
                slot_id: p.parking_slots?.[0]?.id
            })) || [];

            setData({
                slots: { total, available, occupied },
                parked: parkedWithSlots
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err.message);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleValidate = async () => {
        if (!passId) return;
        setLoading(true);
        setError('');
        setValidationResult(null);
        try {
            let query = supabase
                .from('visitor_passes')
                .select(`
                    *,
                    residents!inner(name, flat_number)
                `);

            if (isNaN(passId)) {
                query = query.eq('pass_code', passId);
            } else {
                query = query.eq('id', parseInt(passId));
            }

            const { data: passes, error: validationError } = await query;

            if (validationError || !passes || passes.length === 0) {
                setError('Pass not found');
                return;
            }

            const pass = passes[0];
            const now = new Date();

            // Removed auto-expiry check as requested

            if (pass.status !== 'PENDING' && pass.status !== 'EXPIRED') {
                setError(`Pass is already ${pass.status}`);
                return;
            }

            setValidationResult({
                ...pass,
                resident_name: pass.residents?.name,
                flat_number: pass.residents?.flat_number
            });
        } catch (err) {
            setError('Verification failed');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAllowEntry = async (id) => {
        try {
            // Get available slot
            const { data: slots, error: slotError } = await supabase
                .from('parking_slots')
                .select('id')
                .eq('status', 'AVAILABLE')
                .limit(1);

            if (slotError || !slots || slots.length === 0) {
                alert('No slots available');
                return;
            }

            const slotId = slots[0].id;

            // Update pass
            await supabase
                .from('visitor_passes')
                .update({
                    status: 'ACTIVE',
                    entry_time: new Date().toISOString()
                })
                .eq('id', id);

            // Update slot
            await supabase
                .from('parking_slots')
                .update({
                    status: 'OCCUPIED',
                    linked_pass_id: id
                })
                .eq('id', slotId);

            setValidationResult(null);
            setPassId('');
            fetchData();
            alert('Entry allowed successfully!');
        } catch (err) {
            alert('Error allowing entry');
            console.error(err);
        }
    };

    const handleMarkExit = async (id) => {
        if (!confirm('Are you sure you want to mark this vehicle as exited?')) return;
        try {
            // Update pass
            await supabase
                .from('visitor_passes')
                .update({
                    status: 'COMPLETED',
                    exit_time: new Date().toISOString()
                })
                .eq('id', id);

            // Free slot
            await supabase
                .from('parking_slots')
                .update({
                    status: 'AVAILABLE',
                    linked_pass_id: null
                })
                .eq('linked_pass_id', id);

            fetchData();
        } catch (err) {
            alert('Error marking exit');
            console.error(err);
        }
    };

    const handleSearch = async () => {
        if (!searchVehicle) {
            setSearchResult(null);
            return;
        }
        try {
            const { data: searchData, error: searchError } = await supabase
                .from('visitor_passes')
                .select(`
                    *,
                    parking_slots!linked_pass_id(id)
                `)
                .eq('status', 'ACTIVE')
                .ilike('vehicle_number', `%${searchVehicle}%`);

            if (searchError) throw searchError;

            if (searchData && searchData[0]) {
                setSearchResult({
                    ...searchData[0],
                    slot_id: searchData[0].parking_slots?.[0]?.id
                });
            } else {
                setSearchResult(null);
            }
        } catch (err) {
            console.error('Search failed:', err.message);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Real-time Slot Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card bg-blue-50 border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Slots</p>
                            <h3 className="text-3xl font-bold text-blue-700">{data.slots.total}</h3>
                        </div>
                        <div className="bg-blue-200 p-3 rounded-xl text-blue-700">
                            <MapPin size={24} />
                        </div>
                    </div>
                </div>
                <div className="card bg-green-50 border-green-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Available</p>
                            <h3 className="text-3xl font-bold text-green-700">{data.slots.available}</h3>
                        </div>
                        <div className="bg-green-200 p-3 rounded-xl text-green-700">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>
                <div className="card bg-orange-50 border-orange-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Occupied</p>
                            <h3 className="text-3xl font-bold text-orange-700">{data.slots.occupied}</h3>
                        </div>
                        <div className="bg-orange-200 p-3 rounded-xl text-orange-700">
                            <Car size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Entry & Search */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Scan Section (Simulation) */}
                    <div className="card">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <Info className="mr-2 text-blue-500" size={20} />
                            Verify Visitor Pass
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">Pass ID or Code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Enter ID or 8-digit Code"
                                        value={passId}
                                        onChange={(e) => setPassId(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                                    />
                                    <button
                                        onClick={handleValidate}
                                        disabled={loading}
                                        className="btn-primary whitespace-nowrap"
                                    >
                                        Validate
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start">
                                    <XCircle className="text-red-500 mr-2 shrink-0 mt-0.5" size={16} />
                                    <p className="text-red-700 text-sm">{error}</p>
                                </div>
                            )}

                            {validationResult && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-3">
                                    <div className="flex justify-between border-b border-blue-100 pb-2">
                                        <span className="text-slate-500 text-sm">Visitor</span>
                                        <span className="font-bold text-slate-800">{validationResult.visitor_name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-blue-100 pb-2">
                                        <span className="text-slate-500 text-sm">Vehicle</span>
                                        <span className="font-bold text-slate-800">{validationResult.vehicle_number}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-blue-100 pb-2">
                                        <span className="text-slate-500 text-sm">Resident</span>
                                        <span className="font-bold text-slate-800">{validationResult.resident_name} ({validationResult.flat_number})</span>
                                    </div>
                                    <button
                                        onClick={() => handleAllowEntry(validationResult.id)}
                                        className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition-all mt-2 shadow-md shadow-green-100"
                                    >
                                        Allow Entry
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="card">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <Search className="mr-2 text-slate-500" size={20} />
                            Search Vehicle
                        </h2>
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Search vehicle number..."
                                    value={searchVehicle}
                                    onChange={(e) => setSearchVehicle(e.target.value)}
                                    onKeyUp={handleSearch}
                                />
                            </div>

                            {searchResult ? (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800">{searchResult.vehicle_number}</p>
                                            <p className="text-xs text-slate-500">Slot ID: {searchResult.slot_id} • {searchResult.visitor_name}</p>
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            ) : searchVehicle && (
                                <p className="text-center text-slate-400 text-sm italic">No active visitor found</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Parked Vehicles */}
                <div className="lg:col-span-2">
                    <div className="card overflow-hidden">
                        <div className="flex justify-between items-center px-2 mb-6">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center">
                                <Car className="mr-2 text-orange-500" size={20} />
                                Currently Parked Vehicles
                            </h2>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                                {data.parked.length} Total
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider text-left">
                                        <th className="px-4 py-3">Visitor Info</th>
                                        <th className="px-4 py-3">Slot ID</th>
                                        <th className="px-4 py-3">Entry Time</th>
                                        <th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.parked.length > 0 ? data.parked.map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-800">{v.visitor_name}</p>
                                                <p className="text-xs text-slate-500">{v.vehicle_number}</p>
                                            </td>
                                            <td className="px-4 py-4 font-mono font-bold text-blue-600">
                                                #{v.slot_id}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center text-slate-600 text-sm">
                                                    <Clock size={14} className="mr-1.5 opacity-50" />
                                                    {formatTime(v.entry_time)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleMarkExit(v.id)}
                                                    className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded hover:bg-orange-100 hover:text-orange-700 transition-colors"
                                                >
                                                    Mark Exit
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <AlertCircle className="text-slate-300 mb-2" size={40} />
                                                    <p className="text-slate-400 font-medium">No vehicles parked right now</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
