import { Link } from 'react-router-dom';
import { Car, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Home() {
    const features = [
        { text: "Real-time Slot Availability", icon: <ShieldCheck className="w-5 h-5 text-emerald-500" /> },
        { text: "Instant Pass Generation", icon: <ShieldCheck className="w-5 h-5 text-emerald-500" /> },
        { text: "Secure Resident Login", icon: <ShieldCheck className="w-5 h-5 text-emerald-500" /> },
    ];

    return (
        <div className="flex items-center justify-center min-h-[75vh]">
            <div className="glass-card p-10 md:p-14 rounded-3xl max-w-3xl w-full text-center relative overflow-hidden group">

                {/* Decorative inner glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-24 h-24 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-xl transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                        <Car className="h-12 w-12 text-white" />
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight drop-shadow-sm">
                        Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">ParkFlow</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-700 leading-relaxed font-medium mb-10 max-w-2xl mx-auto">
                        The premium Visitor Parking Management System. Seamlessly manage your visitor parking access.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/60 shadow-sm">
                                {f.icon}
                                <span className="text-sm font-semibold text-slate-800">{f.text}</span>
                            </div>
                        ))}
                    </div>

                    <Link
                        to="/resident/login"
                        className="inline-flex items-center px-8 py-4 text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] group"
                    >
                        Access Resident Portal
                        <ArrowRight className="ml-3 h-6 w-6 transform group-hover:translate-x-2 transition-transform duration-300" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
