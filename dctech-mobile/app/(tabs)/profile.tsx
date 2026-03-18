import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { User, Mail, Shield, LogOut, ChevronRight, Settings } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';

export default function ProfileScreen() {
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!auth.currentUser) return;
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            }
        };
        fetchUserData();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarShadow}>
                        <View style={styles.avatar}>
                            <User size={40} color="#06b6d4" />
                        </View>
                    </View>
                </View>
                <Text style={styles.userName}>{userData?.firstName} {userData?.lastName}</Text>
                <Text style={styles.userRole}>SECURED {userData?.role || 'Employee'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Identity Info</Text>
                <View style={styles.card}>
                    <View style={styles.item}>
                        <Mail size={20} color="#64748b" />
                        <View style={styles.itemContent}>
                            <Text style={styles.itemLabel}>Email Address</Text>
                            <Text style={styles.itemValue}>{userData?.email}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.item}>
                        <Shield size={20} color="#64748b" />
                        <View style={styles.itemContent}>
                            <Text style={styles.itemLabel}>Security Status</Text>
                            <Text style={styles.itemValue}>Level 1 Clearance</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.item}>
                        <Settings size={20} color="#64748b" />
                        <View style={styles.itemContent}>
                            <Text style={styles.itemLabel}>System Settings</Text>
                        </View>
                        <ChevronRight size={20} color="#475569" />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Terminate Core Session</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>DC TECH PORTAL v1.0.0</Text>
                <Text style={styles.footerText}>MAKING LIFE SIMPLE OF TECHNOLOGY</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 40,
    },
    avatarContainer: {
        marginBottom: 20,
    },
    avatarShadow: {
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        padding: 4,
        borderRadius: 36,
    },
    avatar: {
        width: 80,
        height: 80,
        backgroundColor: '#1e293b',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.3)',
    },
    userName: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
    },
    userRole: {
        fontSize: 10,
        fontWeight: '900',
        color: '#06b6d4',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 4,
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 24,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    itemContent: {
        flex: 1,
        marginLeft: 16,
    },
    itemLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 2,
    },
    itemValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginHorizontal: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        marginHorizontal: 24,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
        marginBottom: 40,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 10,
    },
    footer: {
        alignItems: 'center',
        marginBottom: 40,
        opacity: 0.3,
    },
    footerText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
        marginTop: 2,
    }
});
