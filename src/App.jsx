import { Activity, ArrowRight, Award, Briefcase, Calendar, Camera, Check, CheckCircle2, Clock, Eye, EyeOff, Hammer, History, Home, Image, Layers, LogIn, LogOut, Mail, MapPin, Monitor, Palette, Search, Settings, Shield, ShoppingBag, Star, User, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import ceoImage from './assets/ceo-hero.jpeg';
import logoImg from './assets/logo_v2.png';


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
    updateDoc,
    where
} from "firebase/firestore";
import { auth, db } from './firebase';
import AdminSite from './AdminSite';


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
    const [expandedSubService, setExpandedSubService] = useState(null);
    const fileInputRef = useRef(null);

    const handleProfilePicUpdate = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Size validation (Max 1MB for base64 storage in Firestore)
        if (file.size > 1024 * 1024) {
            alert("File too large. Max 1MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result;
            try {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, { profilePic: base64String });
                setUserData(prev => ({ ...prev, profilePic: base64String }));
            } catch (err) {
                console.error("Error updating profile pic:", err);
            }
        };
        reader.readAsDataURL(file);
    };

    // 1. Monitor Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Fetch extra user data from Firestore
                try {
                    const docRef = doc(db, "users", firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    let data = docSnap.exists() ? docSnap.data() : { firstName: 'Admin', lastName: 'User' };
                    
                    // For convenience/demo - making admin@dctech.com an admin automatically
                    if (firebaseUser.email === 'admin@dctech.com') {
                        data.isAdmin = true;
                    }
                    
                    setUserData(data);
                    setEditData(data);
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

    const handleServiceRequest = async (service, subService = null, price = null, size = null) => {
        if (!user) {
            alert("Please sign in to submit a request.");
            setView('home');
            return;
        }

        try {
            await addDoc(collection(db, "orders"), {
                userId: user.uid,
                userEmail: user.email,
                userName: userData ? `${userData.firstName} ${userData.lastName}` : user.email,
                serviceTitle: service.title,
                subService: subService?.name || null,
                price: price || null,
                size: size || null,
                timestamp: Date.now(),
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                status: 'Pending'
            });
            alert(`Request for ${service.title} submitted successfully! Our team will contact you.`);
        } catch (err) {
            console.error("Order failed:", err);
            alert("Failed to submit request. Please try again.");
        }
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
                        <img src={logoImg} alt="DC TECH" className="w-48 h-48 relative object-contain mix-blend-multiply" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-[0.3em] mb-2 animate-fade-in italic hidden">
                        DC <span className="text-cyan-500">TECH</span>
                    </h1>
                    <div className="h-1.5 w-16 bg-cyan-500 mx-auto rounded-full mb-3"></div>
                    <p className="text-slate-500 text-[10px] font-black tracking-[0.5em] opacity-70">Art Services</p>
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
                        <div className="bg-white/50 p-8 rounded-[4rem] mb-6 shadow-2xl border border-cyan-500/10 backdrop-blur-md">
                            <img src={logoImg} alt="DC TECH" className="w-56 h-56 object-contain mix-blend-multiply" />
                        </div>
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

                        <button type="submit" className="btn-primary w-full mt-4 tracking-[0.2em] text-xs py-4">
                            {isRegistering ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <button
                        onClick={() => { setIsRegistering(!isRegistering); resetForms(); }}
                        className="w-full mt-8 text-gray-500 hover:text-indigo-400 text-[10px] font-black tracking-[0.2em] transition-all cursor-pointer"
                    >
                        {isRegistering ? 'Already have an account? Log In' : 'New Employee? Register Here'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-slate-900 pb-28">
            {/* Top Header */}
            <nav className="glass sticky top-0 z-30 px-6 py-4 flex justify-between items-center backdrop-blur-2xl border-b border-white/10">
                <div className="flex items-center space-x-3">
                    <button onClick={() => setView('home')} className="hover:scale-105 transition-transform">
                        <img src={logoImg} alt="DC TECH" className="w-20 h-20 object-contain mix-blend-multiply" />
                    </button>
                    <div className="hidden">
                        <span className="text-xl font-black tracking-tighter block leading-none italic text-slate-900">DC <span className="text-cyan-500">TECH</span></span>
                        <span className="text-[8px] font-black tracking-[0.3em] text-cyan-600">Employee Portal</span>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="bg-cyan-500/5 hover:bg-cyan-500/10 p-1.5 rounded-2xl flex items-center space-x-3 transition-all cursor-pointer border border-cyan-500/10 group"
                    >
                        <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform overflow-hidden font-outfit">
                            {userData?.profilePic ? (
                                <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-black tracking-tighter text-white">
                                    {userData ? userData.firstName[0] + userData.lastName[0] : '...'}
                                </span>
                            )}
                        </div>
                        <div className="hidden md:block pr-2 text-left">
                            <p className="text-[10px] font-black tracking-tighter leading-none text-white">
                                {userData ? userData.firstName : 'User'}
                            </p>
                            <p className="text-[8px] text-cyan-500 font-bold tracking-widest opacity-80">Verified</p>
                        </div>
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 mt-4 w-64 glass-card p-2 shadow-2xl animate-fade-in z-50 overflow-hidden">
                            <div className="p-5 border-b border-white/5 text-center bg-white/5 rounded-t-[1.5rem] mb-2">
                                <p className="font-extrabold text-sm tracking-tight italic">{userData ? `${userData.firstName} ${userData.lastName}` : 'User'}</p>
                                <p className="text-[9px] text-gray-400 font-bold tracking-widest mt-1 opacity-60">{user.email}</p>
                            </div>
                            {userData?.isAdmin && (
                                <button 
                                    onClick={() => { setView('admin'); setShowProfileMenu(false); }}
                                    className="w-full flex items-center space-x-3 p-4 hover:bg-cyan-500/10 text-cyan-500 rounded-2xl transition-all cursor-pointer font-black text-[10px] tracking-[0.2em]"
                                >
                                    <Shield className="w-4 h-4" />
                                    <span>Admin Dashboard</span>
                                </button>
                            )}
                            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-3 p-4 hover:bg-red-500/10 text-red-500 rounded-2xl transition-all cursor-pointer font-black text-[10px] tracking-[0.2em]">
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out Now</span>
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {view === 'admin' ? (
                <AdminSite onBack={() => setView('home')} />
            ) : (
                <>
                <main className="max-w-4xl mx-auto p-6 animate-fade-in">
                {view === 'home' && (
                    <div className="space-y-12 animate-fade-in pb-20">
                        {/* 1. Modern Hero Greeting & Identity Hub */}
                        <div className="flex flex-col md:flex-row items-center justify-between pt-12 pb-6 space-y-8 md:space-y-0">
                            <div className="space-y-4 text-center md:text-left">
                                <h1 className="text-7xl md:text-8xl font-black italic tracking-[-(0.05em)] leading-none text-slate-900 drop-shadow-sm select-none">
                                    Hey, <br/>
                                    <span className="bg-gradient-to-r from-cyan-500 via-cyan-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-none">
                                        {userData ? userData.firstName : 'Partner'}
                                    </span>
                                </h1>
                            </div>
                            
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-indigo-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
                                <div className="w-32 h-32 md:w-40 md:h-40 glass-card rounded-[3rem] p-2 relative z-10 transition-transform duration-700 group-hover:rotate-6">
                                    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-white rounded-[2.5rem] flex items-center justify-center overflow-hidden border border-white/40 shadow-inner">
                                        {userData?.profilePic ? (
                                            <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl md:text-5xl font-black italic text-cyan-600/30 font-outfit select-none">
                                                {userData ? userData.firstName[0] + userData.lastName[0] : 'DC'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-3 rounded-2xl shadow-xl shadow-emerald-500/30 border-4 border-white animate-bounce-slow">
                                        <Shield className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Floating Mission Statement */}
                        <div className="pt-20 text-center">
                            <div className="h-px w-24 bg-slate-100 mx-auto mb-8"></div>
                            <p className="text-slate-400 text-sm font-medium italic max-w-sm mx-auto leading-relaxed">
                                "Precision in Every Pixel. Excellence in Every Frame. Engineering the Future of DC Tech & Art Services."
                            </p>
                        </div>
                    </div>
                )}

                {view === 'enrollment' && (
                    <div className="glass-card p-12 animate-fade-in relative z-10">
                        <div className="mb-12 text-center">
                            <h2 className="text-4xl font-black tracking-tighter italic mb-4 font-outfit">Clocking Protocol</h2>
                            <p className="text-gray-500 text-[10px] font-black tracking-[0.4em] opacity-60">Authentication & Assignment</p>
                        </div>

                        <form onSubmit={markAttendance} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-cyan-600 tracking-[0.3em] ml-2">Assigned Location</label>
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
                                    <label className="block text-[10px] font-black text-cyan-600 tracking-[0.3em] ml-2">Time Allocation</label>
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
                                <label className="block text-[10px] font-black text-cyan-600 tracking-[0.3em] ml-2">Operational Summary</label>
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
                                    className="md:col-span-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black py-5 rounded-2xl tracking-[0.2em] text-[10px] transition-all cursor-pointer border border-white/10 active:scale-95"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="md:col-span-2 btn-primary py-5 rounded-2xl tracking-[0.3em] text-[10px]"
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
                            <h2 className="text-5xl font-black italic tracking-tighter mb-2 text-white font-outfit">Our Services</h2>
                            <div className="h-1.5 w-24 bg-gradient-to-r from-cyan-600 to-cyan-400 mx-auto rounded-full mt-6"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { 
                                    title: 'Graphic Design', 
                                    icon: <Palette />, 
                                    image: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&q=80',
                                    desc: 'Modern visual identities and sleek digital creative solutions.',
                                    longDesc: 'We specialize in high-end brand identity design, logo creation, and digital marketing assets. Our team uses industry-leading tools like Adobe Creative Suite to ensure your business stands out with a professional, state-of-the-art aesthetic.',
                                    subServices: [
                                        {
                                            name: 'Flyers',
                                            pricing: [
                                                { size: 'A6 (Single Sided)', price: '₵50.00' },
                                                { size: 'A5 (Single Sided)', price: '₵80.00' },
                                                { size: 'A4 (Single Sided)', price: '₵120.00' },
                                                { size: 'DL (Double Sided)', price: '₵150.00' }
                                            ]
                                        },
                                        {
                                            name: 'Funeral Poster',
                                            pricing: [
                                                { size: '12x18 (Glossy)', price: '₵100.00' },
                                                { size: '16x20 (Premium)', price: '₵180.00' },
                                                { size: '20x30 (Elite)', price: '₵250.00' }
                                            ]
                                        },
                                        {
                                            name: 'Invitation Card',
                                            pricing: [
                                                { size: '5x7 (Standard)', price: '₵40.00' },
                                                { size: 'Custom Cut (Luxury)', price: '₵120.00' }
                                            ]
                                        }
                                    ],
                                    gallery: [
                                        'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80',
                                        'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80',
                                        'https://images.unsplash.com/photo-1611532736597-ec2e4a6605a2?auto=format&fit=crop&q=80'
                                    ]
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
                                    desc: 'Continually expanding our professional creative services.',
                                    longDesc: 'We are always innovating. Our services extend to digital media staging, corporate gift branding, and specialized event installations. If you have a creative vision, we have the technical expertise to bring it to life.'
                                }
                            ].map((s, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        setSelectedService(s);
                                        setView('service_detail');
                                    }}
                                    className="glass-card p-10 group cursor-pointer hover:border-cyan-500/50 transition-all text-slate-800"
                                >
                                    <div className="bg-cyan-500 p-4 w-14 h-14 rounded-2xl mb-6 shadow-xl group-hover:scale-110 transition-all group-hover:bg-cyan-400 relative">
                                        <div className="absolute inset-0 bg-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="relative text-white">{s.icon}</div>
                                    </div>
                                    <h3 className="text-xl font-black tracking-tight mb-3 italic text-slate-900 font-outfit">{s.title}</h3>
                                    <p className="text-[11px] text-slate-600 leading-relaxed font-bold opacity-80">{s.desc}</p>
                                    <button className="mt-6 text-[8px] font-black tracking-[0.2em] text-cyan-600 group-hover:text-cyan-800 transition-colors">View Details →</button>
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
                                            <h3 className="text-3xl font-black italic text-slate-900 font-outfit">{selectedService.title}</h3>
                                        </div>
                                        
                                        <div className="h-[2px] w-20 bg-cyan-500"></div>
                                        
                                        <p className="text-slate-700 text-sm leading-relaxed font-medium">
                                            {selectedService.longDesc}
                                        </p>

                                        {selectedService.gallery && (
                                            <div className="space-y-4 pt-6">
                                                <h4 className="text-[10px] font-black tracking-[0.3em] text-cyan-600">Portfolio Highlights</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {selectedService.gallery.map((img, i) => (
                                                        <div key={i} className="h-40 rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md hover:border-cyan-500/20 transition-all group">
                                                            <img 
                                                                src={img} 
                                                                alt={`Gallery ${i}`} 
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="pt-6 border-t border-white/5 flex justify-end">
                                            <button 
                                                onClick={() => setSelectedService(null)}
                                                className="btn-primary px-8 py-3 text-[10px] tracking-widest font-black transition-all"
                                            >
                                                Close Detail
                                            </button>
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
                                <h2 className="text-4xl font-black tracking-tighter italic leading-none text-slate-900 font-outfit">Production Archive</h2>
                                <p className="text-[9px] font-black tracking-[0.4em] text-cyan-600 mt-2">Historical Operational Data</p>
                            </div>
                            <div className="bg-cyan-500 px-8 py-3 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-xl shadow-cyan-500/20 text-white">
                                {logs.length} Records Secured
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-cyan-50/50">
                                        <th className="px-12 py-5 text-[9px] font-black tracking-[0.4em] text-cyan-700">Date Range</th>
                                        <th className="px-12 py-5 text-[9px] font-black tracking-[0.4em] text-cyan-700">Timestamp</th>
                                        <th className="px-12 py-5 text-[9px] font-black tracking-[0.4em] text-cyan-700 text-right">Status</th>
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
                                                        <p className="font-extrabold text-lg tracking-tight text-slate-900">{log.date}</p>
                                                        <p className="text-[9px] font-black text-slate-400 tracking-widest leading-none">Operational Cycle</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-12 py-8">
                                                <p className="font-bold text-sm text-slate-500 font-mono tracking-tighter">{log.time}</p>
                                                <p className="text-[9px] font-black text-slate-300 tracking-widest mt-1">GMT Offset Sync</p>
                                            </td>
                                            <td className="px-12 py-8 text-right">
                                                <div className="inline-flex items-center space-x-3 bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-2xl text-[9px] font-black tracking-[0.3em] border border-emerald-100 shadow-sm">
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
                    <div className="space-y-8 animate-fade-in relative z-10 pb-20">
                        {/* 1. Header Profile & Status */}
                        <div className="glass-card p-10 relative overflow-hidden group">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full group-hover:bg-cyan-400/20 transition-all duration-700"></div>
                            
                            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 relative z-10">
                                <div 
                                    onClick={() => fileInputRef.current.click()}
                                    className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative group/avatar hover:scale-105 transition-all cursor-pointer overflow-hidden border-4 border-white"
                                >
                                    {userData?.profilePic ? (
                                        <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-5xl font-black text-white italic font-outfit">
                                            {userData ? userData.firstName[0] + userData.lastName[0] : '...'}
                                        </span>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-all duration-500">
                                        <Camera className="w-8 h-8 text-white mb-2" />
                                        <span className="text-[8px] font-black tracking-widest text-white">Update Photo</span>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleProfilePicUpdate} 
                                    />
                                    <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl z-20">
                                        <Award className="w-6 h-6 text-amber-500" />
                                    </div>
                                </div>
                                <div className="text-center md:text-left space-y-2 pt-2 text-slate-800">
                                    <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                                        <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none font-outfit">
                                            {userData ? `${userData.firstName} ${userData.lastName}` : 'User Profile'}
                                        </h2>
                                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black tracking-widest border border-emerald-100 flex items-center space-x-2">
                                            <Shield className="w-3 h-3" />
                                            <span>Tier 1 Verified</span>
                                        </span>
                                    </div>
                                    <p className="text-slate-500 font-bold text-sm">{user.email}</p>
                                    <div className="flex items-center justify-center md:justify-start space-x-3 pt-2">
                                        <div className="h-1 w-12 bg-cyan-500 rounded-full"></div>
                                        <span className="text-[10px] font-black tracking-[0.3em] text-cyan-600">Senior Art Specialist</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Performance Stats Grid */}
                        <div className="grid grid-cols-3 gap-6">
                            {[
                                { icon: <Activity className="w-5 h-5" />, label: 'Active Tasks', value: '14', color: 'text-rose-500' },
                                { icon: <Award className="w-5 h-5" />, label: 'Awards', value: '08', color: 'text-amber-500' },
                                { icon: <Clock className="w-5 h-5" />, label: 'Cycles', value: '124', color: 'text-cyan-500' }
                            ].map((stat, i) => (
                                <div key={i} className="glass-card p-6 text-center group hover:border-cyan-500/30 transition-all">
                                    <div className={`mx-auto w-10 h-10 flex items-center justify-center rounded-2xl mb-3 bg-white shadow-sm ${stat.color} group-hover:scale-110 transition-transform`}>
                                        {stat.icon}
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 leading-none">{stat.value}</p>
                                    <p className="text-[8px] font-black tracking-widest text-slate-400 mt-2">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* 3. Credential Archive */}
                        <div className="glass-card overflow-hidden">
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center text-slate-800">
                                <div>
                                    <h3 className="text-xl font-black italic text-slate-900 leading-none tracking-tighter font-outfit">Credential Archive</h3>
                                    <p className="text-[9px] font-black tracking-[0.4em] text-slate-400 mt-2">Official Enterprise Records</p>
                                </div>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="bg-white border border-slate-200 px-6 py-3 rounded-2xl text-[9px] font-black tracking-widest shadow-sm hover:border-cyan-500 hover:text-cyan-600 transition-all active:scale-95 cursor-pointer"
                                >
                                    {isEditing ? 'Abort Ops' : 'Update Credentials'}
                                </button>
                            </div>

                            <div className="p-10">
                                {isEditing ? (
                                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">Legal Name</label>
                                                <input type="text" value={editData.firstName} onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} className="input-field" required />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">Legal Surname</label>
                                                <input type="text" value={editData.lastName} onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} className="input-field" required />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">Secure Link (Phone)</label>
                                                <input type="tel" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="input-field" required />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 tracking-widest ml-1">Biological Identity</label>
                                                <div className="relative">
                                                    <select value={editData.gender} onChange={(e) => setEditData({ ...editData, gender: e.target.value })} className="input-field appearance-none cursor-pointer" required>
                                                        <option value="Male">Male Identity</option>
                                                        <option value="Female">Female Identity</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
                                                </div>
                                            </div>
                                        </div>
                                        <button type="submit" className="btn-primary w-full py-5 text-[10px] tracking-[0.3em] font-black mt-4 shadow-xl shadow-cyan-500/25">Deploy Profile Updates</button>
                                    </form>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                        {[
                                            { icon: <User className="w-5 h-5" />, label: 'Official Personnel Name', value: userData ? `${userData.firstName} ${userData.lastName}` : '...' },
                                            { icon: <Mail className="w-5 h-5" />, label: 'Authentication Index', value: user.email, isEmail: true },
                                            { icon: <Briefcase className="w-5 h-5" />, label: 'Secure Communication', value: userData ? userData.phone : '...' },
                                            { icon: <Shield className="w-5 h-5" />, label: 'Assigned Identity', value: userData ? userData.gender : '...' }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-start space-x-4 group">
                                                <div className="p-3 bg-cyan-50 rounded-2xl group-hover:bg-cyan-100 transition-colors">
                                                    <div className="text-cyan-600">{item.icon}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] text-slate-400 font-black tracking-widest leading-none mb-1.5">{item.label}</p>
                                                    <p className={`font-black tracking-tight text-slate-900 italic ${item.isEmail ? 'text-sm lowercase not-italic font-bold' : 'text-lg'}`}>
                                                        {item.value}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Session Control */}
                        <button onClick={handleLogout} className="w-full bg-red-50 hover:bg-red-100 text-red-500 p-10 rounded-[2.5rem] font-black tracking-[0.4em] text-[10px] transition-all cursor-pointer border border-red-100 group">
                            <div className="flex flex-col items-center space-y-3">
                                <LogOut className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                <span>Terminate Core Session</span>
                            </div>
                        </button>
                    </div>
                )}
                {view === 'service_detail' && selectedService && (
                    <div className="animate-fade-in space-y-10 pb-24">
                        <div className="flex items-center justify-between">
                            <button 
                                onClick={() => {
                                    setView('services');
                                    setSelectedService(null);
                                    setExpandedSubService(null);
                                }}
                                className="flex items-center space-x-3 text-[10px] font-black tracking-[0.2em] text-cyan-600 hover:text-cyan-800 transition-all group cursor-pointer"
                            >
                                <div className="p-2 bg-cyan-50 rounded-lg group-hover:-translate-x-1 transition-transform border border-cyan-100 flex items-center justify-center">←</div>
                                <span>Back to Services</span>
                            </button>
                            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full border border-emerald-100 text-[9px] font-black tracking-widest shadow-sm">
                                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span>Service Online</span>
                            </div>
                        </div>

                        <div className="glass-card overflow-hidden border-white/20">
                            <div className="h-[32rem] relative group">
                                <img 
                                    src={selectedService.image} 
                                    alt={selectedService.title} 
                                    className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
                                <div className="absolute bottom-16 left-12 right-12">
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="h-[2px] w-12 bg-cyan-500"></div>
                                        <span className="text-[10px] font-black tracking-[0.6em] text-cyan-600">Enterprise Asset // {selectedService.title}</span>
                                    </div>
                                    <h2 className="text-7xl md:text-8xl font-black italic tracking-tighter leading-[0.8] text-slate-900 drop-shadow-sm font-outfit">
                                        {selectedService.title.split(' ')[0]} <br/>
                                        <span className="text-cyan-500">{selectedService.title.split(' ').slice(1).join(' ')}</span>
                                    </h2>
                                    <div className="mt-8 flex items-center space-x-6">
                                        <div className="px-6 py-2 bg-slate-900 text-white rounded-full text-[9px] font-black tracking-widest shadow-2xl">Tier 1 Certified</div>
                                        <div className="px-6 py-2 bg-white text-slate-900 rounded-full text-[9px] font-black tracking-widest border border-slate-100 shadow-sm">Verified Output</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-12 space-y-12">
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black italic text-slate-900 leading-none tracking-tighter mb-4 border-l-4 border-cyan-500 pl-4 text-slate-800 font-outfit">Service Philosophy</h3>
                                    <p className="text-slate-700 text-base leading-relaxed font-medium">
                                        {selectedService.longDesc}
                                    </p>
                                </div>

                                {selectedService.subServices && (
                                    <div className="space-y-8 pt-10 border-t border-slate-50">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-2xl font-black italic text-slate-900 leading-none tracking-tighter text-slate-800 font-outfit">Service Catalog</h3>
                                            <p className="text-[9px] font-black tracking-[0.5em] text-cyan-500">Tiered Specifications</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {selectedService.subServices.map((sub, i) => (
                                                <div key={i} className={`glass-card overflow-hidden transition-all duration-700 ${expandedSubService === i ? 'ring-2 ring-cyan-500/20' : 'border-slate-100 hover:border-cyan-500/30'}`}>
                                                    <button 
                                                        onClick={() => setExpandedSubService(expandedSubService === i ? null : i)}
                                                        className="w-full p-10 flex items-center justify-between hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                                    >
                                                        <div className="flex items-center space-x-8 text-slate-800 text-left">
                                                            <div className={`p-5 rounded-3xl transition-all duration-500 ${expandedSubService === i ? 'bg-cyan-500 text-white shadow-xl rotate-12 scale-110' : 'bg-slate-50 text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600'}`}>
                                                                <Palette className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <span className="text-2xl font-black italic tracking-tighter block group-hover:translate-x-2 transition-transform font-outfit">{sub.name}</span>
                                                                <span className="text-[9px] font-black tracking-[0.4em] text-slate-400">View Configuration</span>
                                                            </div>
                                                        </div>
                                                        <div className={`w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-cyan-500 transition-all duration-500 ${expandedSubService === i ? 'rotate-180 bg-cyan-50' : 'group-hover:bg-cyan-500 group-hover:text-white'}`}>
                                                            <ArrowRight className="w-5 h-5 -rotate-90 group-hover:rotate-0 transition-transform" />
                                                        </div>
                                                    </button>
                                                    
                                                    {expandedSubService === i && (
                                                        <div className="px-10 pb-10 pt-4 animate-fade-in space-y-2">
                                                            {sub.pricing.map((item, idx) => (
                                                                <div key={idx} className="flex items-center justify-between p-6 rounded-2xl hover:bg-cyan-50/50 transition-all group/item border border-transparent hover:border-cyan-100">
                                                                    <div className="flex items-center space-x-4 text-slate-800">
                                                                        <div className="h-2 w-2 bg-cyan-500 rounded-full scale-0 group-hover/item:scale-100 transition-transform"></div>
                                                                        <span className="font-black text-sm tracking-tight font-outfit">{item.size}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="font-black text-slate-950 text-2xl italic tracking-tighter block font-outfit leading-none">{item.price}</span>
                                                                        <span className="text-[8px] font-black tracking-[0.3em] text-slate-300">Operational Rate</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div className="pt-8">
                                                                <button 
                                                                    onClick={() => handleServiceRequest(selectedService, sub, item.price, item.size)}
                                                                    className="w-full btn-primary py-6 text-[10px] tracking-[0.4em] font-black rounded-2xl shadow-xl shadow-cyan-500/20 active:scale-95 transition-all"
                                                                >
                                                                    Submit Service Request
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedService.gallery && (
                                    <div className="space-y-8 pt-10 border-t border-slate-50">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-2xl font-black italic text-slate-900 leading-none tracking-tighter text-slate-800 font-outfit">Visual Archive</h3>
                                            <p className="text-[9px] font-black tracking-[0.5em] text-cyan-500">Portfolio Proof</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                            {selectedService.gallery.map((img, i) => (
                                                <div key={i} className="h-72 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all group border border-slate-100 bg-white">
                                                    <img 
                                                        src={img} 
                                                        alt={`Gallery ${i}`} 
                                                        className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-125" 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-10 flex flex-col md:flex-row gap-6">
                                    <button 
                                        onClick={() => handleServiceRequest(selectedService)}
                                        className="btn-primary flex-1 py-6 text-[10px] tracking-widest font-black shadow-2xl shadow-cyan-500/30"
                                    >
                                        Initiate Collaboration
                                    </button>
                                    <button className="flex-1 bg-white border border-slate-200 py-6 text-[10px] tracking-widest font-black text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">Technical Specifications</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Nav */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-lg glass-card px-4 py-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl z-40 backdrop-blur-3xl border border-white/10">
                {[
                    { icon: <Home className="w-6 h-6" />, label: 'Home', view: 'home' },
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
                        <span className="text-[7px] font-black tracking-[0.4em]">{item.label}</span>
                        {view === item.view && (
                            <div className="absolute -bottom-1 w-6 h-1 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]"></div>
                        )}
                    </button>
                ))}
            </div>
            </>
            )}
        </div>
    );
}

export default App;
