import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Monitor, Check, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { auth, db } from '../../firebase';
import { doc, getDoc, collection, addDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function HubScreen() {
    const [userData, setUserData] = useState<any>(null);
    const [isMarkedToday, setIsMarkedToday] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        const fetchInitialData = async () => {
            if (!auth.currentUser) return;
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            }
        };

        fetchInitialData();

        // Realtime logs and marking check
        if (auth.currentUser) {
            const today = new Date().toLocaleDateString('en-GB');
            const q = query(
                collection(db, "attendance"),
                where("userId", "==", auth.currentUser.uid),
                where("date", "==", today)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                setIsMarkedToday(!snapshot.empty);
                const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLogs(history);
            });

            // Announcements mock
            setAnnouncements([{ text: "System Integrity Verified. All units reporting nominal.", time: "09:00" }]);

            return unsubscribe;
        }
    }, []);

    const handleAuthorize = async () => {
        if (!auth.currentUser || isMarkedToday) return;

        const now = new Date();
        const date = now.toLocaleDateString('en-GB');
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        try {
            await addDoc(collection(db, "attendance"), {
                userId: auth.currentUser.uid,
                userName: `${userData?.firstName} ${userData?.lastName}`,
                date,
                time,
                timestamp: now.getTime()
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.heroSection}>
                <Image 
                    source={require('../../assets/images/ceo-hero.jpeg')} 
                    style={styles.heroImage}
                    resizeMode="contain"
                />
                <View style={styles.heroOverlay}>
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTag}>MAKING LIFE SIMPLE</Text>
                        <Text style={styles.heroTitle}>OF <Text style={styles.heroHighlight}>TECHNOLOGY</Text>.</Text>
                    </View>
                </View>
            </View>

            <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
                <View style={styles.welcomeCard}>
                    <Text style={styles.welcomeTitle}>
                        Welcome, <Text style={styles.nameHighlight}>{userData?.firstName || 'User'}</Text>.
                    </Text>
                    <View style={styles.statusRow}>
                        <View style={styles.statusLine} />
                        <Text style={styles.statusText}>Employee Portal</Text>
                    </View>
                </View>

                {announcements.length > 0 && (
                    <View style={styles.announcementBar}>
                        <View style={styles.monitorIcon}>
                            <Monitor size={14} color="#06b6d4" />
                        </View>
                        <Text style={styles.announcementText} numberOfLines={1}>
                            <Text style={styles.announcementTag}>CHIEF OPS: </Text>
                            "{announcements[0].text}"
                        </Text>
                    </View>
                )}

                <View style={styles.actionCard}>
                    {isMarkedToday ? (
                        <View style={styles.verifiedContainer}>
                            <View style={styles.verifiedIcon}>
                                <Check size={32} color="#fff" />
                            </View>
                            <Text style={styles.verifiedTitle}>Identity Verified</Text>
                            <View style={styles.timeBadge}>
                                <Text style={styles.timeBadgeText}>CLOCK-IN: {logs[0]?.time}</Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.authorizeButton} onPress={handleAuthorize}>
                            <View style={styles.buttonInner}>
                                <CheckCircle2 size={24} color="#fff" />
                                <Text style={styles.buttonText}>Authorize Duty</Text>
                            </View>
                            <Text style={styles.buttonSubtext}>Cloud Protocol Sync</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    heroSection: {
        height: 400,
        backgroundColor: '#020617',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
        padding: 24,
    },
    heroTextContainer: {
        marginBottom: 20,
    },
    heroTag: {
        fontSize: 10,
        fontWeight: '900',
        color: '#06b6d4',
        letterSpacing: 4,
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        fontStyle: 'italic',
        textTransform: 'uppercase',
    },
    heroHighlight: {
        color: '#06b6d4',
    },
    mainContent: {
        padding: 24,
        marginTop: -30,
    },
    welcomeCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 32,
        padding: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 24,
    },
    welcomeTitle: {
        fontSize: 40,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -1.5,
        fontStyle: 'italic',
    },
    nameHighlight: {
        color: '#06b6d4',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        opacity: 0.4,
    },
    statusLine: {
        height: 2,
        width: 30,
        backgroundColor: '#06b6d4',
        marginRight: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 3,
    },
    announcementBar: {
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    monitorIcon: {
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        padding: 8,
        borderRadius: 10,
        marginRight: 12,
    },
    announcementText: {
        flex: 1,
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    announcementTag: {
        color: '#06b6d4',
        fontWeight: '900',
    },
    actionCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 32,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    verifiedContainer: {
        alignItems: 'center',
    },
    verifiedIcon: {
        width: 64,
        height: 64,
        backgroundColor: '#06b6d4',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
    },
    verifiedTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#06b6d4',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: -0.5,
    },
    timeBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.2)',
    },
    timeBadgeText: {
        color: '#06b6d4',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
    },
    authorizeButton: {
        backgroundColor: '#06b6d4',
        width: '100%',
        paddingVertical: 24,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    buttonInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        marginLeft: 12,
    },
    buttonSubtext: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 8,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 3,
        marginTop: 6,
    }
});
