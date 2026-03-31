import { useEffect, useState } from 'react';
import { 
    Users, 
    ShoppingBag, 
    Calendar, 
    ArrowLeft, 
    Search, 
    Filter, 
    Download, 
    MoreVertical, 
    CheckCircle, 
    XCircle, 
    Clock,
    TrendingUp,
    Activity,
    Shield,
    Mail,
    Phone,
    User
} from 'lucide-react';
import { 
    collection, 
    onSnapshot, 
    query, 
    orderBy,
    doc,
    updateDoc,
    getDocs
} from "firebase/firestore";
import { db } from './firebase';

const AdminSite = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setLoading(true);
        
        // Fetch Users
        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch Orders
        const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("timestamp", "desc")), (snapshot) => {
            setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch Attendance
        const unsubAttendance = onSnapshot(query(collection(db, "attendance"), orderBy("timestamp", "desc")), (snapshot) => {
            setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubUsers();
            unsubOrders();
            unsubAttendance();
        };
    }, []);

    const stats = [
        { label: 'Total Personnel', value: users.length, icon: <Users className="w-6 h-6" />, color: 'bg-blue-500', trend: '+12%' },
        { label: 'Active Orders', value: orders.length, icon: <ShoppingBag className="w-6 h-6" />, color: 'bg-emerald-500', trend: '+5%' },
        { label: 'Today Attendance', value: attendance.filter(a => a.date === new Date().toLocaleDateString()).length, icon: <Calendar className="w-6 h-6" />, color: 'bg-amber-500', trend: 'Stable' },
        { label: 'Revenue Est.', value: '₵12.4k', icon: <TrendingUp className="w-6 h-6" />, color: 'bg-purple-500', trend: '+18%' },
    ];

    const filteredUsers = users.filter(u => 
        u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOrders = orders.filter(o => 
        o.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 animate-fade-in">
            {/* Admin Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black italic tracking-tighter text-slate-900 leading-none">
                                DC <span className="text-cyan-500">TECH</span> <span className="text-[10px] uppercase tracking-[0.3em] ml-2 text-slate-400 font-bold not-italic">Admin Hub</span>
                            </h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                        <div className="relative hidden md:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Global search..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                            />
                        </div>
                        <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-cyan-500/20">
                            AD
                        </div>
                    </div>
                </div>
                
                {/* Admin Tabs */}
                <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
                    <div className="flex items-center space-x-8">
                        {[
                            { id: 'dashboard', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
                            { id: 'users', label: 'Personnel', icon: <Users className="w-4 h-4" /> },
                            { id: 'orders', label: 'Service Requests', icon: <ShoppingBag className="w-4 h-4" /> },
                            { id: 'attendance', label: 'Attendance Logs', icon: <Calendar className="w-4 h-4" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'border-cyan-500 text-cyan-600' 
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-8 pb-20">
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((stat, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`${stat.color} p-3 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform`}>
                                            {stat.icon}
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                            {stat.trend}
                                        </span>
                                    </div>
                                    <h3 className="text-slate-400 text-[10px] font-black tracking-widest uppercase">{stat.label}</h3>
                                    <p className="text-3xl font-black text-slate-900 mt-1 italic tracking-tighter">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Recent Activity Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Recent Personnel */}
                            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-black italic tracking-tighter">New Personnel</h3>
                                    <button onClick={() => setActiveTab('users')} className="text-[10px] font-black tracking-widest text-cyan-600 hover:underline">VIEW ALL</button>
                                </div>
                                <div className="space-y-6">
                                    {users.slice(0, 5).map((u, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500 overflow-hidden">
                                                    {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" /> : u.firstName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{u.firstName} {u.lastName}</p>
                                                    <p className="text-[10px] text-slate-400">{u.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Orders */}
                            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-black italic tracking-tighter">Incoming Requests</h3>
                                    <button onClick={() => setActiveTab('orders')} className="text-[10px] font-black tracking-widest text-cyan-600 hover:underline">VIEW ALL</button>
                                </div>
                                <div className="space-y-6">
                                    {orders.slice(0, 5).map((o, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-500">
                                                    <ShoppingBag className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{o.serviceTitle}</p>
                                                    <p className="text-[10px] text-slate-400">By {o.userName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-900 font-outfit">{o.price || 'Quote Req'}</p>
                                                <p className="text-[10px] text-slate-400">{o.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {orders.length === 0 && <p className="text-center text-slate-400 text-sm py-10 italic">No incoming requests yet.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm animate-fade-in">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black italic tracking-tighter">Personnel Directory</h3>
                                <p className="text-[10px] font-black tracking-widest text-slate-400 mt-1 uppercase">Official Employee Records</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-500 hover:border-cyan-500 hover:text-cyan-600 transition-all">
                                    <Filter className="w-4 h-4" />
                                </button>
                                <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-500 hover:border-cyan-500 hover:text-cyan-600 transition-all">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/80">
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Personnel</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Communication</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Identity</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Joined</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-400 group-hover:scale-110 transition-transform overflow-hidden shadow-inner">
                                                        {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-slate-900 italic tracking-tight">{u.firstName} {u.lastName}</p>
                                                        <div className="flex items-center space-x-2 mt-0.5">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Unit</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2 text-slate-600">
                                                        <Mail className="w-3 h-3 opacity-50" />
                                                        <span className="text-xs font-medium">{u.email}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-slate-600">
                                                        <Phone className="w-3 h-3 opacity-50" />
                                                        <span className="text-xs font-medium">{u.phone}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-600 tracking-widest uppercase">
                                                    {u.gender || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-slate-700">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Historical'}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Enrollment</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm animate-fade-in">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black italic tracking-tighter">Incoming Service Orders</h3>
                                <p className="text-[10px] font-black tracking-widest text-slate-400 mt-1 uppercase">Client Acquisition Pipeline</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/80">
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Service Asset</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Requester</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Configuration</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Timestamp</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredOrders.map((o) => (
                                        <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-10 h-10 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-500 shadow-sm border border-cyan-100">
                                                        <ShoppingBag className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-slate-900 italic tracking-tight uppercase text-xs">{o.serviceTitle}</p>
                                                        <p className="text-[9px] font-black text-cyan-600 mt-1 tracking-widest uppercase">DC-OP-{o.id.slice(0, 4)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-slate-900">{o.userName}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{o.userEmail}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-700">{o.subService || 'Standard Unit'}</p>
                                                    <p className="text-[10px] text-slate-400 italic">"{o.size || 'Default Specs'}"</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-medium text-slate-600">{o.date}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{o.time}</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <p className="text-lg font-black text-slate-900 italic font-outfit leading-none tracking-tighter">{o.price || '---'}</p>
                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1 block">Verified Quote</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-20 text-center text-slate-400 italic text-sm">
                                                The acquisition pipeline is currently empty.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm animate-fade-in">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black italic tracking-tighter">Personnel Presence Matrix</h3>
                                <p className="text-[10px] font-black tracking-widest text-slate-400 mt-1 uppercase">Daily Operational Clock-Ins</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/80">
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Personnel</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Logistical Node</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Shift Cycle</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase">Timestamp</th>
                                        <th className="px-8 py-4 text-[10px] font-black tracking-widest text-slate-400 uppercase text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {attendance.map((a) => (
                                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-slate-900">{a.userName}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{a.userEmail}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                                    <span className="text-xs font-bold text-slate-700">{a.details?.location || 'HQ - Main'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 tracking-widest uppercase">
                                                    {a.details?.shift || 'Standard'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-medium text-slate-600">{a.date}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{a.time}</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 text-[9px] font-black tracking-widest">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span>PRESENT</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminSite;
