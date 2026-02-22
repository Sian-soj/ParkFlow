import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Filter, Calendar, User, Car } from 'lucide-react';

const Passes = () => {
    const [passes, setPasses] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchPasses = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('visitor_passes')
                .select(`
                    *,
                    residents!inner(name, flat_number)
                `)
                .order('issue_time', { ascending: false });

            if (statusFilter) {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Flatten resident info to match expected format
            const flattenedData = data.map(pass => ({
                ...pass,
                resident_name: pass.residents?.name,
                flat_number: pass.residents?.flat_number
            }));

            setPasses(flattenedData);
        } catch (err) {
            console.error('Error fetching passes:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPasses();
    }, [statusFilter]);

    const getStatusStyles = (status) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-700';
            case 'ACTIVE': return 'bg-green-100 text-green-700';
            case 'COMPLETED': return 'bg-blue-100 text-blue-700';
            case 'EXPIRED': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Visitor Passes</h1>
                    <p className="text-slate-500">History of all entry and exit records</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-sm w-full sm:w-64">
                    <Filter size={18} className="text-slate-400 ml-2" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-slate-700 outline-none w-full font-medium"
                    >
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="ACTIVE">Active</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="EXPIRED">Expired</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider text-left">
                                <th className="px-6 py-4">Visitor & Vehicle</th>
                                <th className="px-6 py-4">Resident</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Issue Time</th>
                                <th className="px-6 py-4">Entry / Exit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-20 text-center text-slate-400 italic">Loading records...</td></tr>
                            ) : passes.length > 0 ? passes.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="bg-slate-100 p-2 rounded-lg mr-3">
                                                <Car size={16} className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{p.visitor_name}</p>
                                                <p className="text-xs text-slate-500 font-mono">{p.vehicle_number}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-sm text-slate-600">
                                            <User size={14} className="mr-2 opacity-50" />
                                            {p.resident_name} ({p.flat_number})
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${getStatusStyles(p.status)}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-xs text-slate-500">
                                            <Calendar size={14} className="mr-2 opacity-50" />
                                            {formatDate(p.issue_time)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-[11px] space-y-1">
                                            <div className="flex items-center text-slate-500">
                                                <span className="w-12 font-bold uppercase text-[9px]">Entry:</span>
                                                {formatDate(p.entry_time)}
                                            </div>
                                            <div className="flex items-center text-slate-500">
                                                <span className="w-12 font-bold uppercase text-[9px]">Exit:</span>
                                                {formatDate(p.exit_time)}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="px-6 py-20 text-center text-slate-400 italic">No records found for this filter</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Passes;
