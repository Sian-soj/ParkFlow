import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, Car, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function ResidentLogin() {
    const [email, setEmail] = useState('john@gmail.com');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { data, error: authError } = await supabase
                .from('residents')
                .select('id, name, email, flat_number')
                .eq('email', email)
                .eq('password', password)
                .single();

            if (authError || !data) {
                setError('Invalid credentials');
                return;
            }

            localStorage.setItem('parkflow_user', JSON.stringify(data));
            navigate('/resident');
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="flex w-full max-w-4xl bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden relative">

                {/* Left Side: Illustration / Brand info */}
                <div className="hidden md:flex flex-col w-5/12 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white relative overflow-hidden">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/30 shadow-lg">
                                <Car className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-extrabold mb-4 drop-shadow-md">ParkFlow <br />Resident Portal</h2>
                            <p className="text-blue-100 font-medium leading-relaxed">
                                Log in to securely generate visitor parking passes, monitor active arrivals, and manage your vehicle history from one central dashboard.
                            </p>
                        </div>

                        <div className="text-sm font-semibold text-blue-200">
                            <p>&copy; 2026 ParkFlow Systems</p>
                        </div>
                    </div>

                    {/* Decorative shapes */}
                    <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-64 h-64 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-80 h-80 bg-blue-500 opacity-30 rounded-full blur-3xl"></div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full md:w-7/12 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white/60">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-500 mt-2 font-medium">Please enter your resident credentials to securely sign in.</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50/80 backdrop-blur-sm text-red-700 rounded-xl flex items-center border border-red-200 shadow-sm animate-[pulse_1s_ease-in-out]">
                            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                            <span className="font-semibold text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-white/80 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm text-slate-800 font-medium"
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-white/80 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm text-slate-800 font-medium"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-lg px-5 py-4 flex items-center justify-center transition-all shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)] hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none mt-8 group"
                        >
                            {isLoading ? 'Authenticating...' : (
                                <>
                                    Secure Sign In
                                    <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center text-sm text-slate-500 bg-slate-50/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200">
                        <p className="font-semibold mb-1">Demo Resident Accounts (pw: password123)</p>
                        <div className="flex justify-center space-x-4">
                            <span className="font-mono bg-white px-2 py-1 rounded shadow-sm">john@gmail.com</span>
                            <span className="font-mono bg-white px-2 py-1 rounded shadow-sm">jane@gmail.com</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
