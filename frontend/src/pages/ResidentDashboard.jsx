import { useState, useEffect } from 'react';
import { PlusCircle, Clock, Trash2, Car, MapPin, UserCheck, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ResidentDashboard() {
  const [user, setUser] = useState(null);
  const [passes, setPasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [duration, setDuration] = useState('4');

  useEffect(() => {
    const storedUser = localStorage.getItem('parkflow_user');
    if (!storedUser) {
      navigate('/resident/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchPasses();
    }
  }, [user]);

  const fetchPasses = async () => {
    try {
      const res = await api.get(`/residents/${user.id}/passes`);
      setPasses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePass = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/passes', {
        resident_id: user.id,
        visitor_name: visitorName,
        phone,
        vehicle_number: vehicleNumber,
        duration_hours: parseInt(duration)
      });
      setVisitorName('');
      setPhone('');
      setVehicleNumber('');
      setDuration('4');
      fetchPasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create pass');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPass = async (id) => {
    if (!confirm('Are you sure you want to cancel this pass?')) return;
    try {
      await api.patch(`/passes/${id}/cancel`);
      fetchPasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel pass');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parkflow_user');
    navigate('/resident/login');
  };

  if (!user) return null;

  return (
    <div className="space-y-10 pb-12">
      {/* Premium Header Profile Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 border-white/60">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 opacity-10 rounded-full blur-3xl -z-10 extract-transform translate-x-1/3 -translate-y-1/2"></div>

        <div className="flex items-center gap-6 z-10 w-full sm:w-auto">
          <div className="relative">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl w-20 h-20 flex justify-center items-center shadow-lg border border-white/20">
              <span className="text-3xl font-extrabold text-white">{user.name.charAt(0)}</span>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
              <UserCheck className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight drop-shadow-sm">Hi, {user.name}</h1>
            <p className="text-slate-600 font-semibold mt-1 flex items-center">
              <MapPin className="w-4 h-4 mr-1.5 text-indigo-500" /> Flat {user.flat_number}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="z-10 bg-white/80 hover:bg-white text-slate-700 hover:text-red-600 px-6 py-3 rounded-xl font-bold transition-all shadow-sm border border-slate-200 hover:border-red-200 hover:shadow-md flex items-center sm:self-center self-stretch justify-center"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Create Form */}
        <div className="lg:col-span-4 h-fit">
          <div className="glass-card rounded-3xl p-8 sticky top-28 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center drop-shadow-sm">
              <div className="bg-blue-100 p-2 rounded-xl mr-3">
                <PlusCircle className="h-6 w-6 text-blue-600" />
              </div>
              New Visitor
            </h2>

            <form onSubmit={handleCreatePass} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Visitor Name</label>
                <input required type="text" value={visitorName} onChange={e => setVisitorName(e.target.value)}
                  className="w-full bg-white/70 border border-slate-200 rounded-xl p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium text-slate-800" placeholder="e.g. Alice Smith" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Phone Number</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full bg-white/70 border border-slate-200 rounded-xl p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium text-slate-800" placeholder="e.g. 9876543210" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Vehicle Details</label>
                <div className="relative">
                  <Car className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <input required type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} placeholder="MH12AB1234"
                    className="w-full bg-white/70 border border-slate-200 rounded-xl pl-11 pr-3.5 py-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium text-slate-800" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Requested Duration</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                  <select value={duration} onChange={e => setDuration(e.target.value)}
                    className="w-full bg-white/70 border border-slate-200 rounded-xl pl-11 pr-3.5 py-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium text-slate-800 appearance-none cursor-pointer">
                    <option value="1">1 Hour Backup</option>
                    <option value="2">2 Hours Short Visit</option>
                    <option value="4">4 Hours Standard</option>
                    <option value="8">8 Hours Extended</option>
                    <option value="24">24 Hours Overnight</option>
                  </select>
                </div>
              </div>

              <button
                disabled={isLoading}
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-lg px-5 py-4 text-center transition-all shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)] hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none"
              >
                {isLoading ? 'Generating Pass...' : 'Generate Parking Pass'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Pass History */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-slate-800 drop-shadow-sm flex items-center">
              Active & Recent Passes
              <span className="ml-3 bg-blue-100/80 text-blue-800 text-xs py-1 px-3 rounded-full border border-blue-200">{passes.length} Total</span>
            </h2>
            <button onClick={fetchPasses} className="text-slate-500 hover:text-blue-600 bg-white/50 p-2 rounded-lg border border-slate-200 shadow-sm transition-colors">
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>

          {passes.length === 0 ? (
            <div className="text-center py-20 bg-white/40 backdrop-blur-md rounded-3xl border border-white shadow-sm flex flex-col items-center">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Car className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No Passes Yet</h3>
              <p className="text-slate-500 font-medium max-w-sm">Use the form on the left to generate a pass for your arriving visitors.</p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {passes.map(pass => {
                const expiryDate = new Date(pass.expiry_time);
                const isExpired = isPast(expiryDate) || pass.status === 'EXPIRED';

                return (
                  <div key={pass.id} className={`p-6 rounded-3xl border relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-md
                    ${pass.status === 'PENDING' ? 'bg-amber-50/80 border-amber-200/60 shadow-[0_4px_20px_rgba(251,191,36,0.1)] hover:shadow-[0_8px_30px_rgba(251,191,36,0.15)]' : ''}
                    ${pass.status === 'ACTIVE' ? 'bg-emerald-50/80 border-emerald-200/60 ring-1 ring-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.1)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]' : ''}
                    ${pass.status === 'COMPLETED' ? 'bg-white/60 border-slate-200/60 shadow-sm grayscale-[0.2]' : ''}
                    ${pass.status === 'EXPIRED' || isExpired ? 'bg-red-50/60 border-red-200/50 grayscale-[0.5]' : ''}
                  `}>

                    {pass.status === 'PENDING' && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 opacity-5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>}
                    {pass.status === 'ACTIVE' && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400 opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>}

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">{pass.visitor_name}</h3>
                        <div className="inline-flex mt-2 items-center bg-white/80 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                          <Car className="h-4 w-4 mr-1.5 text-blue-500" />
                          <span className="font-bold text-slate-700 text-sm tracking-wide">{pass.vehicle_number}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm border
                          ${pass.status === 'PENDING' && !isExpired ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
                          ${pass.status === 'ACTIVE' && !isExpired ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : ''}
                          ${pass.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                          ${(pass.status === 'EXPIRED' || isExpired) ? 'bg-red-100 text-red-800 border-red-200' : ''}
                        `}>
                          {isExpired && pass.status === 'PENDING' ? 'EXPIRED' : pass.status}
                        </span>
                        <div className="text-xs font-bold text-slate-400 opactity-70">
                          ID: #{String(pass.id).padStart(4, '0')}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-5 border-t border-slate-200/50 relative z-10">
                      <div className="flex items-center text-sm font-medium text-slate-600 bg-white/50 p-2.5 rounded-xl border border-white shadow-sm">

                        {!isExpired && (pass.status === 'PENDING' || pass.status === 'ACTIVE') ? (
                          <>
                            <div className="bg-indigo-100 p-1.5 rounded-lg mr-2">
                              <Clock className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span>Expires {formatDistanceToNow(expiryDate, { addSuffix: true })}</span>
                          </>
                        ) : (
                          <>
                            <div className="bg-slate-200 p-1.5 rounded-lg mr-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                            </div>
                            <span className="text-slate-500">Expired {formatDistanceToNow(expiryDate, { addSuffix: true })}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {pass.status === 'PENDING' && !isExpired && (
                      <button
                        onClick={() => handleCancelPass(pass.id)}
                        className="mt-4 w-full flex items-center justify-center text-sm text-red-600 bg-white/60 hover:bg-white border border-red-100 hover:border-red-300 py-3 rounded-xl font-bold transition-all shadow-sm z-10 relative"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Cancel Pass
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
