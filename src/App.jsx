import React, { useState, useEffect } from 'react';
import { LogIn, User, Calendar, CheckCircle2, History, LogOut, Clock, Mail, Briefcase, Settings, Bell, Phone, Check, Eye, EyeOff } from 'lucide-react';

// Firebase Imports
import { auth, db } from './firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    onSnapshot,
    setDoc,
    doc,
    getDoc
} from "firebase/firestore";

function App() {
    const [showSplash, setShowSplash] = useState(true);
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isMarkedToday, setIsMarkedToday] = useState(false);
    const [view, setView] = useState('home');
    const [isRegistering, setIsRegistering] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    // Form States
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [error, setError] = useState('');

    // 1. Monitor Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Fetch extra user data from Firestore
                try {
                    const docRef = doc(db, "users", firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                }
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Splash Screen
    useEffect(() => {
        if (showSplash) {
            const timer = setTimeout(() => setShowSplash(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [showSplash]);

    // 3. Fetch Attendance Logs (Real-time)
    useEffect(() => {
        if (user) {
            const q = query(
                collection(db, "attendance"),
                where("userEmail", "==", user.email),
                orderBy("timestamp", "desc")
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedLogs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setLogs(fetchedLogs);

                // Check if marked today
                const today = new Date().toLocaleDateString();
                const alreadyMarked = fetchedLogs.some(log => log.date === today);
                setIsMarkedToday(alreadyMarked);
            });

            return () => unsubscribe();
        }
    }, [user]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');

        // Check if Firebase is configured
        if (auth.app.options.apiKey === "YOUR_API_KEY") {
            setError("Firebase not configured. Please add your API keys in src/firebase.js");
            return;
        }

        try {
            if (isRegistering) {
                if (!firstName || !lastName || !email || !password || !phone || !gender) {
                    setError('Fill in all fields'); return;
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const fbUser = userCredential.user;

                // Save extra data to Firestore
                const newUserInfo = {
                    uid: fbUser.uid,
                    firstName,
                    lastName,
                    email,
                    phone,
                    gender,
                    createdAt: new Date().toISOString()
                };
                await setDoc(doc(db, "users", fbUser.uid), newUserInfo);
                setUserData(newUserInfo);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            console.error(err);
            setError(err.message.replace("Firebase: ", ""));
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setView('home');
        setShowProfileMenu(false);
        resetForms();
    };

    const resetForms = () => {
        setFirstName(''); setLastName(''); setEmail(''); setPassword('');
        setPhone(''); setGender(''); setError('');
    };

    const markAttendance = async () => {
        try {
            await addDoc(collection(db, "attendance"), {
                userEmail: user.email,
                userName: userData ? `${userData.firstName} ${userData.lastName}` : user.email,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                timestamp: Date.now(),
                status: 'Present'
            });
        } catch (err) {
            setError("Failed to mark attendance: " + err.message);
        }
    };

    if (showSplash || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
                <div className="text-center animate-pulse">
                    <Calendar className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest">DC TECH</h1>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass p-8 rounded-2xl w-full max-w-md animate-fade-in text-white">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-blue-500/20 p-4 rounded-full mb-4">
                            <LogIn className="w-8 h-8 text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">DC Attendance</h1>
                        <p className="text-gray-400 mt-2 text-sm">Secure Production Login</p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold text-center animate-shake">{error}</div>}

                        {isRegistering && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-all" placeholder="First Name" required />
                                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-all" placeholder="Last Name" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-all" placeholder="Phone" required />
                                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 text-sm focus:border-blue-500 outline-none transition-all appearance-none" required>
                                        <option value="" disabled>Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="relative">
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-all" placeholder="Email Address" required />
                            <Mail className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-all pr-12"
                                placeholder="Password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] mt-2 uppercase tracking-widest text-xs">{isRegistering ? 'Register' : 'Login'}</button>
                    </form>

                    <button onClick={() => { setIsRegistering(!isRegistering); resetForms(); }} className="w-full mt-6 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all">{isRegistering ? 'Already have an account? Log In' : 'New Employee? Create Account'}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white pb-28">
            {/* Top Header */}
            <nav className="glass sticky top-0 z-30 px-6 py-4 flex justify-between items-center backdrop-blur-xl bg-[#0f172a]/70">
                <div className="flex items-center space-x-2">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter">DC TECH</span>
                </div>

                <div className="relative">
                    <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center border-2 border-white/10 shadow-xl cursor-pointer hover:rotate-6 transition-all duration-300">
                        <span className="text-xs font-black uppercase tracking-tighter">
                            {userData ? userData.firstName[0] + userData.lastName[0] : '...'}
                        </span>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 mt-4 w-64 glass rounded-[2rem] p-3 shadow-2xl animate-fade-in border border-white/5 overflow-hidden">
                            <div className="p-4 border-b border-white/5 text-center mb-2">
                                <p className="font-black text-sm uppercase tracking-tight">{userData ? `${userData.firstName} ${userData.lastName}` : 'User'}</p>
                                <p className="text-[10px] text-gray-500 font-mono mt-1 opacity-60 truncate">{user.email}</p>
                            </div>
                            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-3 p-4 hover:bg-red-500/10 text-red-400 rounded-2xl transition-all cursor-pointer font-black text-[10px] uppercase tracking-[0.2em]">
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6 animate-fade-in">
                {view === 'home' && (
                    <div className="space-y-8">
                        <div className="glass p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full -translate-x-12 -translate-y-12"></div>
                            <h1 className="text-5xl font-black tracking-tighter mb-2 italic">HI, {userData ? userData.firstName.toUpperCase() : 'USER'}!</h1>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.1em]">Ready for your shift at DC TECH?</p>
                        </div>

                        <div className="glass p-12 rounded-[3rem] text-center border-t border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 mb-10">Verification Portal</h2>
                            {isMarkedToday ? (
                                <div className="bg-green-500/5 border border-green-500/10 p-12 rounded-[2rem] transition-all duration-500">
                                    <div className="bg-green-500 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
                                        <Check className="w-10 h-10 text-white" />
                                    </div>
                                    <p className="text-green-400 font-black text-2xl uppercase tracking-tighter">Verified Present</p>
                                    <p className="text-gray-500 mt-2 text-[10px] font-bold uppercase tracking-widest italic font-mono">Timestamp: {logs[0]?.time}</p>
                                </div>
                            ) : (
                                <button onClick={markAttendance} className="relative group px-16 py-8 bg-blue-600 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer">
                                    <div className="flex items-center space-x-4">
                                        <CheckCircle2 className="w-6 h-6" />
                                        <span className="text-lg">Clock In Now</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {view === 'services' && (
                    <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/5 animate-fade-in">
                        <div className="mb-10 text-center">
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Capabilities</h2>
                            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { title: 'Deeper Solutions', icon: <Briefcase />, desc: 'Advanced software ecosystems for corporate infrastructure.' },
                                { title: 'Art & Motion', icon: <Calendar />, desc: 'Visual storytelling and specialized motion graphics.' },
                                { title: 'Cloud Data', icon: <Settings />, desc: 'Real-time database management and secure storage.' },
                                { title: 'System Security', icon: <LogIn />, desc: 'Identity protection and encrypted activity logs.' }
                            ].map((s, idx) => (
                                <div key={idx} className="glass p-8 rounded-3xl hover:bg-white/10 transition-all cursor-default border border-white/5 group">
                                    <div className="bg-blue-600 p-3 w-12 h-12 rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform">{s.icon}</div>
                                    <h3 className="text-lg font-black uppercase tracking-tight mb-2 italic">{s.title}</h3>
                                    <p className="text-[11px] text-gray-500 leading-relaxed font-bold">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'update' && (
                    <div className="glass rounded-[2.5rem] overflow-hidden border border-white/5 animate-fade-in shadow-2xl">
                        <div className="p-10 border-b border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Activity Feed</h2>
                            <div className="bg-blue-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20">{logs.length} RECORDS</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
                                            <td className="px-10 py-6">
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Date</p>
                                                <p className="font-bold text-sm">{log.date}</p>
                                            </td>
                                            <td className="px-10 py-6">
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Time</p>
                                                <p className="font-bold text-sm opacity-60 font-mono tracking-tighter">{log.time}</p>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-green-500/20">Verified</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'settings' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="glass p-10 rounded-[3rem] border border-white/5">
                            <h2 className="text-3xl font-black tracking-tighter uppercase mb-10 italic">Employee Hub</h2>
                            <div className="grid gap-4">
                                <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Official Profile</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6">
                                        <div><p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Full Identity</p><p className="font-black text-lg uppercase tracking-tight">{userData ? `${userData.firstName} ${userData.lastName}` : '...'}</p></div>
                                        <div><p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Gender Identity</p><p className="font-black text-lg uppercase tracking-tight">{userData ? userData.gender : '...'}</p></div>
                                        <div><p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Registered Contact</p><p className="font-black text-lg uppercase tracking-tight">{userData ? userData.phone : '...'}</p></div>
                                        <div><p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Secure Email</p><p className="font-black text-lg lowercase tracking-tight opacity-50">{user.email}</p></div>
                                    </div>
                                </div>
                                <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-8 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] transition-all cursor-pointer border border-red-500/10">Terminate Current Session</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Nav */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-lg glass px-6 py-5 rounded-[2.5rem] flex items-center justify-between shadow-2xl border border-white/5 z-40 bg-[#0f172a]/90 backdrop-blur-3xl">
                {[
                    { icon: <Calendar className="w-6 h-6" />, label: 'Home', view: 'home' },
                    { icon: <Briefcase className="w-6 h-6" />, label: 'Services', view: 'services' },
                    { icon: <History className="w-6 h-6" />, label: 'Update', view: 'update' },
                    { icon: <Settings className="w-6 h-6" />, label: 'Settings', view: 'settings' }
                ].map((item) => (
                    <button key={item.label} onClick={() => setView(item.view)} className={`flex flex-col items-center space-y-1 relative transition-all duration-300 cursor-pointer ${view === item.view ? 'text-blue-500 scale-110' : 'text-gray-500 opacity-50 hover:opacity-100 hover:text-white'}`}>
                        {item.icon}
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                        {view === item.view && <div className="absolute -top-4 w-12 h-1 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6]"></div>}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default App;
