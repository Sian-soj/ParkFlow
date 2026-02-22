import { Outlet, Link, useLocation } from 'react-router-dom';
import { Car, Home as HomeIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api';

export default function Layout() {
    const location = useLocation();
    const [stats, setStats] = useState({ available: 0, total: 3 });

    useEffect(() => {
        const fetchSlots = async () => {
            try {
                const res = await api.get('/slots');
                const available = res.data.filter(s => s.status === 'AVAILABLE').length;
                setStats({ available, total: res.data.length });
            } catch (err) {
                console.error(err);
            }
        };

        fetchSlots();
        const interval = setInterval(fetchSlots, 5000);
        return () => clearInterval(interval);
    }, []);

    const navItems = [
        { path: '/', icon: <HomeIcon size={20} />, label: 'Home' },
        { path: '/resident/login', icon: <Car size={20} />, label: 'Resident Portal' }
    ];

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden font-sans">

            {/* Animated Background Blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob -z-10 pointer-events-none"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000 -z-10 pointer-events-none"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000 -z-10 pointer-events-none"></div>

            <header className="glass-panel sticky top-4 z-10 mx-4 sm:mx-8 rounded-2xl mb-4 transition-all duration-300 hover:shadow-lg">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-md">
                                <Car className="text-white h-6 w-6" />
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-slate-800">ParkFlow</span>
                        </div>

                        <nav className="flex space-x-1 sm:space-x-4">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path ||
                                    (item.path !== '/' && location.pathname.startsWith(item.path) && item.path !== '/resident/login') ||
                                    (item.path === '/resident/login' && location.pathname.startsWith('/resident'));
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center space-x-1 px-4 py-2 rounded-xl transition-all duration-300 font-semibold text-sm
                      ${isActive
                                                ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 hover:shadow-sm'
                                            }`}
                                    >
                                        {item.icon}
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="flex items-center hidden sm:flex">
                            <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white shadow-sm transition-transform hover:scale-105 cursor-default">
                                <div className={`w-2.5 h-2.5 rounded-full ${stats.available > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'} animate-pulse`}></div>
                                <span className="text-sm font-bold text-slate-800 tracking-wide">
                                    {stats.available}/{stats.total} Slots
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
                {/* Mobile slot counter */}
                <div className="sm:hidden mb-6 flex justify-center">
                    <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white shadow-sm">
                        <div className={`w-3 h-3 rounded-full ${stats.available > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'} animate-pulse`}></div>
                        <span className="text-sm font-bold text-slate-800 tracking-wide">
                            {stats.available}/{stats.total} Slots Available
                        </span>
                    </div>
                </div>

                <Outlet />
            </main>
        </div>
    );
}
