import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Passes from './components/Passes';
import Settings from './components/Settings';
import { LogOut, LayoutDashboard, ClipboardList, Settings as SettingsIcon } from 'lucide-react';

const App = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('adminUser')));

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('adminUser', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('adminUser');
    };

    const PrivateRoute = ({ children }) => {
        return user ? children : <Navigate to="/login" />;
    };

    return (
        <Router>
            <div className="min-h-screen flex flex-col">
                {user && (
                    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between h-16">
                                <div className="flex items-center">
                                    <span className="text-xl font-bold text-blue-600 mr-8">ParkFlow Admin</span>
                                    <div className="hidden sm:flex space-x-4">
                                        <Link to="/" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600">
                                            <LayoutDashboard size={20} className="mr-2" />
                                            Dashboard
                                        </Link>
                                        <Link to="/passes" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600">
                                            <ClipboardList size={20} className="mr-2" />
                                            All Passes
                                        </Link>
                                        <Link to="/settings" className="flex items-center px-3 py-2 text-slate-600 hover:text-blue-600">
                                            <SettingsIcon size={20} className="mr-2" />
                                            Settings
                                        </Link>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center px-3 py-2 text-slate-600 hover:text-red-600 transition-colors"
                                    >
                                        <LogOut size={20} className="mr-2" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </nav>
                )}

                <main className="flex-grow">
                    <Routes>
                        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
                        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/passes" element={<PrivateRoute><Passes /></PrivateRoute>} />
                        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                    </Routes>
                </main>

                <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-500 text-sm">
                    &copy; 2026 ParkFlow Security System
                </footer>
            </div>
        </Router>
    );
};

export default App;
