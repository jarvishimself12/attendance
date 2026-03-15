import { Briefcase, Calendar, Check, CheckCircle2, Eye, EyeOff, Hammer, History, Home, Image, Layers, LogIn, LogOut, Mail, Monitor, Palette, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import ceoImage from './assets/ceo-hero.jpeg';

// Firebase Imports
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    limit,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    where
} from "firebase/firestore";
import { auth, db } from './firebase';

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
    const [globalLogs, setGlobalLogs] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [stats, setStats] = useState({ activeToday: 0, totalProjects: 12 });
    const [newMsg, setNewMsg] = useState('');

    // Form States
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [enrollmentData, setEnrollmentData] = useState({
        location: '',
        shift: '',
        summary: ''
    });
    const [selectedService, setSelectedService] = useState(null);

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
                        const data = docSnap.data();
                        setUserData(data);
                        setEditData(data);
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

    // 4. Global Activity Pulse (Top 5 clock-ins)
    useEffect(() => {
        if (user) {
            const q = query(
                collection(db, "attendance"),
                orderBy("timestamp", "desc"),
                limit(5)
            );
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setGlobalLogs(fetched);

                // Calculate quick stats (e.g., active today)
                const today = new Date().toLocaleDateString();
                const uniqueUsersToday = new Set(
                    fetched.filter(log => log.date === today).map(log => log.userEmail)
                ).size;
                setStats(prev => ({ ...prev, activeToday: uniqueUsersToday }));
            });
            return () => unsubscribe();
        }
    }, [user]);

    // 5. Global Announcements Pulse
    useEffect(() => {
        if (user) {
            const q = query(
                collection(db, "announcements"),
                orderBy("timestamp", "desc"),
                limit(3)
            );
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        }
    }, [user]);

    const sendAnnouncement = async (e) => {
        e.preventDefault();
        if (!newMsg.trim()) return;
        try {
            await addDoc(collection(db, "announcements"), {
                text: newMsg,
                author: userData ? `${userData.firstName} ${userData.lastName}` : user.email,
                timestamp: Date.now(),
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
            });
            setNewMsg('');
        } catch (err) {
            console.error("Announcement failed:", err);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');

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
                setEditData(newUserInfo);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            console.error(err);
            setError(err.message.replace("Firebase: ", ""));
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await setDoc(doc(db, "users", user.uid), editData, { merge: true });
            setUserData(editData);
            setIsEditing(false);
            alert("Profile updated successfully!");
        } catch (err) {
            setError("Update failed: " + err.message);
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

    const markAttendance = async (e) => {
        if (e) e.preventDefault();
        try {
            await addDoc(collection(db, "attendance"), {
                userEmail: user.email,
                userName: userData ? `${userData.firstName} ${userData.lastName}` : user.email,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                timestamp: Date.now(),
                status: 'Present',
                details: enrollmentData
            });
            setView('home');
            setEnrollmentData({ location: '', shift: '', summary: '' });
        } catch (err) {
            setError("Failed to mark attendance: " + err.message);
        }
    };

    if (showSplash || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
                {/* Background Glows */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-100 blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-50 blur-[100px] animate-pulse delay-700"></div>

                <div className="text-center relative z-10">
                    <div className="relative mb-8 flex justify-center">
                        <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full scale-150 animate-pulse"></div>
                        <Calendar className="w-20 h-20 text-cyan-500 relative animate-bounce" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-[0.3em] uppercase mb-2 animate-fade-in italic">
                        DC <span className="text-cyan-500">TECH</span>
                    </h1>
                    <div className="h-1.5 w-16 bg-cyan-500 mx-auto rounded-full mb-3"></div>
                    <p className="text-slate-300 text-[10px] font-black tracking-[0.5em] uppercase opacity-70">Art Services</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] aspect-square bg-indigo-600/10 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] aspect-square bg-cyan-600/10 blur-[120px] rounded-full"></div>
                </div>

                <div className="glass-card p-10 w-full max-w-md relative z-10 animate-fade-in border-white/10">
                    <div className="flex flex-col items-center mb-10">
                        <div className="bg-cyan-500/10 p-5 rounded-2xl mb-6 border border-cyan-500/5">
                            <LogIn className="w-8 h-8 text-cyan-500" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-center italic text-white">
                            DC <span className="text-cyan-500">TECH</span>
                        </h1>
                        <p className="text-slate-300 mt-2 text-xs font-bold uppercase tracking-widest opacity-60">Employee Portal</p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold text-center animate-shake backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        {isRegistering && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-field" placeholder="First Name" required />
                                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-field" placeholder="Last Name" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="Phone" required />
                                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-field appearance-none cursor-pointer" required>
                                        <option value="" disabled className="bg-slate-900">Gender</option>
                                        <option value="Male" className="bg-slate-900">Male</option>
                                        <option value="Female" className="bg-slate-900">Female</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="relative">
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-12" placeholder="Email Address" required />
                            <Mail className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        </div>

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pr-12"
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

                        <button type="submit" className="btn-primary w-full mt-4 uppercase tracking-[0.2em] text-xs py-4">
                            {isRegistering ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <button
                        onClick={() => { setIsRegistering(!isRegistering); resetForms(); }}
                        className="w-full mt-8 text-gray-500 hover:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer"
                    >
                        {isRegistering ? 'Already have an account? Log In' : 'New Employee? Register Here'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white pb-28">
            {/* Top Header */}
            <nav className="glass sticky top-0 z-30 px-6 py-4 flex justify-between items-center backdrop-blur-2xl border-b border-white/10">
                <div className="flex items-center space-x-3">
                    <div className="bg-cyan-500 p-2.5 rounded-[1rem] shadow-lg shadow-cyan-500/20">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="text-xl font-black tracking-tighter block leading-none italic text-white">DC <span className="text-cyan-500">TECH</span></span>
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-300">Employee Portal</span>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="bg-cyan-500/5 hover:bg-cyan-500/10 p-1.5 rounded-2xl flex items-center space-x-3 transition-all cursor-pointer border border-cyan-500/10 group"
                    >
                        <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform">
                            <span className="text-xs font-black uppercase tracking-tighter text-white">
                                {userData ? userData.firstName[0] + userData.lastName[0] : '...'}
                            </span>
                        </div>
                        <div className="hidden md:block pr-2 text-left">
                            <p className="text-[10px] font-black uppercase tracking-tighter leading-none text-white">
                                {userData ? userData.firstName : 'User'}
                            </p>
                            <p className="text-[8px] text-cyan-500 font-bold uppercase tracking-widest opacity-80">Verified</p>
                        </div>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 mt-4 w-64 glass-card p-2 shadow-2xl animate-fade-in z-50 overflow-hidden">
                            <div className="p-5 border-b border-white/5 text-center bg-white/5 rounded-t-[1.5rem] mb-2">
                                <p className="font-black text-sm uppercase tracking-tight italic">{userData ? `${userData.firstName} ${userData.lastName}` : 'User'}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-60">{user.email}</p>
                            </div>
                            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-3 p-4 hover:bg-red-500/10 text-red-500 rounded-2xl transition-all cursor-pointer font-black text-[10px] uppercase tracking-[0.2em]">
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out Now</span>
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6 animate-fade-in">
                {view === 'home' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Hero Rectangle */}
                        <div className="lg:col-span-3 hidden lg:block h-full">
                            <div className="glass-card h-full min-h-[500px] overflow-hidden relative group bg-slate-900/50">
                                <img
                                    src={ceoImage}
                                    alt="Hero"
                                    className="absolute inset-0 w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent"></div>
                                <div className="absolute bottom-8 left-6 right-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500 mb-2">MAKING LIFE SIMPLE</p>
                                    <h2 className="text-xl font-black italic text-white leading-tight uppercase">OF <span className="text-cyan-400">TECHNOLOGY</span>.</h2>
                                </div>
                            </div>
                        </div>

                        {/* Center Content */}
                        <div className="lg:col-span-9 space-y-8">
                            <div className="glass-card p-10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full -translate-x-12 -translate-y-12 group-hover:bg-cyan-400/20 transition-all duration-700"></div>
                                <h1 className="text-5xl font-black tracking-tighter mb-4 italic leading-tight text-white">
                                    Welcome, <span className="text-cyan-500">{userData ? userData.firstName : 'User'}</span>.
                                </h1>
                                <div className="flex items-center space-x-3 opacity-40">
                                    <div className="h-[2px] w-8 bg-cyan-400"></div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Employee Portal</p>
                                </div>
                            </div>

                            {/* Announcements Bar */}
                            {announcements.length > 0 && (
                                <div className="bg-slate-800/50 border border-white/5 p-4 rounded-3xl flex items-center justify-between px-8 animate-fade-in shadow-xl backdrop-blur-md">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-cyan-500/20 p-2 rounded-xl">
                                            <Monitor className="w-4 h-4 text-cyan-500" />
                                        </div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-[0.15em] italic">
                                            <span className="text-cyan-500 opacity-60 mr-2">CHIEF OPS:</span>
                                            "{announcements[0].text}"
                                        </p>
                                    </div>
                                    <span className="text-[8px] font-black text-white/40 uppercase font-mono">{announcements[0].time}</span>
                                </div>
                            )}

                            <div className="glass-card p-10 text-center">
                                {isMarkedToday ? (
                                    <div className="animate-fade-in">
                                        <div className="bg-cyan-500/5 border border-cyan-500/20 p-10 rounded-[2.5rem] transition-all duration-700">
                                            <div className="bg-cyan-500 p-5 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-500/20">
                                                <Check className="w-10 h-10 text-white" />
                                            </div>
                                            <p className="text-cyan-400 font-black text-2xl uppercase tracking-tighter italic">Identity Verified</p>
                                            <div className="flex items-center justify-center space-x-4 mt-6">
                                                <div className="px-5 py-2 bg-white/5 rounded-full border border-cyan-500/20 shadow-sm">
                                                    <p className="text-cyan-400 font-bold text-[10px] uppercase tracking-widest">Clock-In: {logs[0]?.time}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center space-y-8">
                                        <button
                                            onClick={() => setView('enrollment')}
                                            className="btn-primary px-16 py-8 rounded-[2rem] group"
                                        >
                                            <div className="flex flex-col items-center space-y-2">
                                                <div className="flex items-center space-x-4">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                    <span className="text-xl uppercase tracking-tighter italic">Authorize Duty</span>
                                                </div>
                                                <p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-60 group-hover:opacity-100 transition-opacity">Cloud Protocol Sync</p>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {view === 'enrollment' && (
                    <div className="glass-card p-12 animate-fade-in relative z-10">
                        <div className="mb-12 text-center">
                            <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-4">Clocking Protocol</h2>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Authentication & Assignment</p>
                        </div>

                        <form onSubmit={markAttendance} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-cyan-600 uppercase tracking-[0.3em] ml-2">Assigned Location</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={enrollmentData.location}
                                            onChange={(e) => setEnrollmentData({ ...enrollmentData, location: e.target.value })}
                                            className="input-field appearance-none py-4 pr-12"
                                        >
                                            <option value="" disabled>Select Facility</option>
                                            <option value="Main Office">Main Office / HQ</option>
                                            <option value="Remote / Home">Digital / Remote</option>
                                            <option value="On-Site Visit">External Client Site</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-slate-300 text-xs">▼</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-cyan-600 uppercase tracking-[0.3em] ml-2">Time Allocation</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={enrollmentData.shift}
                                            onChange={(e) => setEnrollmentData({ ...enrollmentData, shift: e.target.value })}
                                            className="input-field appearance-none py-4 pr-12"
                                        >
                                            <option value="" disabled>Select Shift</option>
                                            <option value="Morning (8am - 4pm)">Standard (8am - 4pm)</option>
                                            <option value="Afternoon (2pm - 10pm)">Mid-Shift (2pm - 10pm)</option>
                                            <option value="Night (10pm - 6am)">Overnight (10pm - 6am)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-slate-300 text-xs">▼</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-cyan-600 uppercase tracking-[0.3em] ml-2">Operational Summary</label>
                                <textarea
                                    required
                                    value={enrollmentData.summary}
                                    onChange={(e) => setEnrollmentData({ ...enrollmentData, summary: e.target.value })}
                                    placeholder="Execute clear reporting on planned tasks..."
                                    className="input-field h-32 resize-none py-4"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8">
                                <button
                                    type="button"
                                    onClick={() => setView('home')}
                                    className="md:col-span-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all cursor-pointer border border-white/10 active:scale-95"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="md:col-span-2 btn-primary py-5 rounded-2xl uppercase tracking-[0.3em] text-[10px]"
                                >
                                    Confirm Verified Clock-In
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {view === 'services' && (
                    <div className="animate-fade-in space-y-12">
                        <div className="text-center">
                            <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-2 text-white">Capabilities</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 opacity-60">Professional Spectrum</p>
                            <div className="h-1.5 w-24 bg-gradient-to-r from-cyan-600 to-cyan-400 mx-auto rounded-full mt-6"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { 
                                    title: 'Graphic Design', 
                                    icon: <Palette />, 
                                    image: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&q=80',
                                    desc: 'Modern visual identities and sleek digital creative solutions.',
                                    longDesc: 'We specialize in high-end brand identity design, logo creation, and digital marketing assets. Our team uses industry-leading tools like Adobe Creative Suite to ensure your business stands out with a professional, state-of-the-art aesthetic.'
                                },
                                { 
                                    title: 'Picture Frame', 
                                    icon: <Image />, 
                                    image: 'https://images.unsplash.com/photo-1583000213702-8a9667746143?auto=format&fit=crop&q=80',
                                    desc: 'Premium bespoke framing for elite art pieces and portraits.',
                                    longDesc: 'Preserve your memories and artwork with our bespoke framing services. We offer a wide range of premium materials, from museum-grade glass to custom-crafted wood and metal frames, ensuring every piece is protected and presented elegantly.'
                                },
                                { 
                                    title: '3D & 2D Signages', 
                                    icon: <Layers />, 
                                    image: 'https://images.unsplash.com/photo-1540324155974-7523202daa3f?auto=format&fit=crop&q=80',
                                    desc: 'Physical branding and high-end technical precision mountings.',
                                    longDesc: 'From illuminated 3D channel letters to sleek 2D acrylic signs, we design and install high-visibility branding solutions. Our signage is built with durability and aesthetics in mind, perfect for corporate headquarters and retail storefronts.'
                                },
                                { 
                                    title: 'Fabrications', 
                                    icon: <Hammer />, 
                                    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80',
                                    desc: 'Custom construction with high-end structural finish and design.',
                                    longDesc: 'Our engineering team handles custom metal, wood, and acrylic fabrications. Whether it is a unique structural element for a workspace or a custom staging backdrop, we bring precision and structural integrity to every build.'
                                },
                                { 
                                    title: 'Indoor Decorations', 
                                    icon: <Home />, 
                                    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80',
                                    desc: 'Bespoke corporate aesthetics and professional workspace art.',
                                    longDesc: 'Elevate your interior environment with our tailored decoration services. We provide wall installations, bespoke furniture accents, and art placement strategies that transform standard offices into inspiring, premium workspaces.'
                                },
                                { 
                                    title: 'And More', 
                                    icon: <Monitor />, 
                                    image: 'https://images.unsplash.com/photo-1454165833767-027ffea9e7a7?auto=format&fit=crop&q=80',
                                    desc: 'Continually expanding our professional creative capabilities.',
                                    longDesc: 'We are always innovating. Our services extend to digital media staging, corporate gift branding, and specialized event installations. If you have a creative vision, we have the technical expertise to bring it to life.'
                                }
                            ].map((s, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => setSelectedService(s)}
                                    className="glass-card p-10 group cursor-pointer hover:border-cyan-500/50 transition-all"
                                >
                                    <div className="bg-cyan-500 p-4 w-14 h-14 rounded-2xl mb-6 shadow-xl group-hover:scale-110 transition-all group-hover:bg-cyan-400 relative">
                                        <div className="absolute inset-0 bg-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="relative text-white">{s.icon}</div>
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight mb-3 italic text-white">{s.title}</h3>
                                    <p className="text-[11px] text-slate-300 leading-relaxed font-bold opacity-80">{s.desc}</p>
                                    <button className="mt-6 text-[8px] font-black uppercase tracking-[0.2em] text-cyan-500 group-hover:text-white transition-colors">View Details →</button>
                                </div>
                            ))}
                        </div>

                        {/* Service Detail Modal */}
                        {selectedService && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                                <div className="glass-card max-w-2xl w-full overflow-hidden relative border-white/10">
                                    <button 
                                        onClick={() => setSelectedService(null)}
                                        className="absolute top-6 right-6 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                    
                                    <div className="h-64 overflow-hidden">
                                        <img 
                                            src={selectedService.image} 
                                            alt={selectedService.title} 
                                            className="w-full h-full object-cover transition-transform duration-1000"
                                        />
                                    </div>
                                    
                                    <div className="p-10 space-y-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-cyan-500 p-3 rounded-xl text-white">
                                                {selectedService.icon}
                                            </div>
                                            <h3 className="text-3xl font-black italic uppercase text-white">{selectedService.title}</h3>
                                        </div>
                                        
                                        <div className="h-[2px] w-20 bg-cyan-500"></div>
                                        
                                        <p className="text-slate-300 text-sm leading-relaxed font-medium">
                                            {selectedService.longDesc}
                                        </p>
                                        
                                        <div className="pt-6 border-t border-white/5 flex justify-end">
                                            <button 
                                                onClick={() => setSelectedService(null)}
                                                className="btn-primary px-8 py-3 text-[10px] uppercase tracking-widest"
                                            >
                                                Close Detail
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'update' && (
                    <div className="glass-card overflow-hidden animate-fade-in shadow-2xl relative z-10">
                        <div className="p-12 border-b border-white/10 bg-white/5/50 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none text-white">Duty Logs</h2>
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 mt-2">Historical Operational Data</p>
                            </div>
                            <div className="bg-cyan-500 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-cyan-500/20 text-white">
                                {logs.length} RECORDS SECURED
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="px-12 py-5 text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Date Range</th>
                                        <th className="px-12 py-5 text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Timestamp</th>
                                        <th className="px-12 py-5 text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-cyan-50 border-b border-white/10 last:border-0 transition-all group">
                                            <td className="px-12 py-8">
                                                <div className="flex items-center space-x-5">
                                                    <div className="bg-cyan-500/10 p-3 rounded-[1rem] group-hover:bg-cyan-500/20 transition-colors">
                                                        <Calendar className="w-5 h-5 text-cyan-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-lg tracking-tight text-white">{log.date}</p>
                                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Operational Cycle</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-12 py-8">
                                                <p className="font-bold text-sm text-slate-500 font-mono tracking-tighter">{log.time}</p>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">GMT Offset Sync</p>
                                            </td>
                                            <td className="px-12 py-8 text-right">
                                                <div className="inline-flex items-center space-x-3 bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] border border-emerald-100 shadow-sm">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span>Verified</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'settings' && (
                    <div className="space-y-8 animate-fade-in relative z-10">
                        <div className="glass-card p-12">
                            <h2 className="text-4xl font-black tracking-tighter uppercase mb-12 italic text-white">Personnel Identity</h2>
                            <div className="grid gap-6">
                                <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100 blur-[80px] rounded-full opacity-50"></div>
                                    <div className="flex justify-between items-center mb-10 relative z-10">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <p className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.4em]">Official File</p>
                                        </div>
                                        <button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white border border-slate-200 px-6 py-2.5 rounded-2xl hover:bg-white transition-all cursor-pointer"
                                        >
                                            {isEditing ? 'Abort Edit' : 'Edit Credentials'}
                                        </button>
                                    </div>

                                    {isEditing ? (
                                        <form onSubmit={handleUpdateProfile} className="space-y-6 relative z-10">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] uppercase text-gray-500 font-black tracking-widest ml-2">Given Name</label>
                                                    <input type="text" value={editData.firstName} onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} className="input-field" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] uppercase text-gray-500 font-black tracking-widest ml-2">Surname</label>
                                                    <input type="text" value={editData.lastName} onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} className="input-field" required />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] uppercase text-gray-500 font-black tracking-widest ml-2">Contact Link</label>
                                                    <input type="tel" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="input-field" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] uppercase text-gray-500 font-black tracking-widest ml-2">Biological Tag</label>
                                                    <select value={editData.gender} onChange={(e) => setEditData({ ...editData, gender: e.target.value })} className="input-field cursor-pointer appearance-none" required>
                                                        <option value="Male" className="bg-slate-900">Male</option>
                                                        <option value="Female" className="bg-slate-900">Female</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button type="submit" className="btn-primary w-full py-4 text-xs uppercase tracking-[0.3em] font-black mt-4">Commit Updates</button>
                                        </form>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 relative z-10 text-white">
                                            <div>
                                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] mb-2 opacity-60">Legal Full Identity</p>
                                                <p className="font-black text-2xl uppercase tracking-tighter italic">{userData ? `${userData.firstName} ${userData.lastName}` : '...'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] mb-2 opacity-60">Authentication Index</p>
                                                <div className="px-4 py-2 bg-cyan-50 rounded-xl inline-block border border-cyan-100">
                                                    <p className="font-bold text-xs text-cyan-600 lowercase">{user.email}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] mb-2 opacity-60">Verified Link</p>
                                                <p className="font-black text-lg uppercase tracking-widest">{userData ? userData.phone : '...'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] mb-2 opacity-60">Assigned Tag</p>
                                                <p className="font-black text-lg uppercase mb-1">{userData ? userData.gender : '...'}</p>
                                                <div className="h-1.5 w-12 bg-cyan-500 rounded-full"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleLogout} className="bg-red-500/5 hover:bg-red-500/10 text-red-500 p-10 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-[10px] transition-all cursor-pointer border border-red-500/10 group mt-4">
                                    <div className="flex flex-col items-center space-y-3">
                                        <LogOut className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                        <span>Terminate Core Session</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Nav */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-lg glass-card px-4 py-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl z-40 backdrop-blur-3xl border border-white/10">
                {[
                    { icon: <Calendar className="w-6 h-6" />, label: 'Hub', view: 'home' },
                    { icon: <Briefcase className="w-6 h-6" />, label: 'Services', view: 'services' },
                    { icon: <History className="w-6 h-6" />, label: 'Logs', view: 'update' },
                    { icon: <Settings className="w-6 h-6" />, label: 'Persona', view: 'settings' }
                ].map((item) => (
                    <button
                        key={item.label}
                        onClick={() => setView(item.view)}
                        className={`flex flex-col items-center space-y-1 relative transition-all duration-300 px-6 py-2 rounded-2xl cursor-pointer ${view === item.view
                            ? 'text-cyan-600 bg-cyan-50'
                            : 'text-slate-400 hover:text-slate-900'
                            }`}
                    >
                        {item.icon}
                        <span className="text-[7px] font-black uppercase tracking-[0.4em]">{item.label}</span>
                        {view === item.view && (
                            <div className="absolute -bottom-1 w-6 h-1 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]"></div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default App;
