import { View, Text, StyleSheet, FlatList } from 'react-native';
import { History, Calendar } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';

export default function LogsScreen() {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        if (!auth.currentUser) return;
        
        const q = query(
            collection(db, "attendance"),
            where("userId", "==", auth.currentUser.uid),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const history = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(history);
        });

        return unsubscribe;
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.logCard}>
            <View style={styles.iconContainer}>
                <Calendar size={20} color="#06b6d4" />
            </View>
            <View style={styles.logInfo}>
                <Text style={styles.dateText}>{item.date}</Text>
                <Text style={styles.metaText}>Operational Cycle Sync</Text>
            </View>
            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{item.time}</Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>VERIFIED</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Duty Logs</Text>
                <Text style={styles.subtitle}>Historical Operational Data</Text>
                <View style={styles.recordBadge}>
                    <Text style={styles.recordText}>SECURED RECORDS: {logs.length}</Text>
                </View>
            </View>

            <FlatList
                data={logs}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <History size={48} color="rgba(255,255,255,0.05)" />
                        <Text style={styles.emptyText}>No historical data found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        paddingTop: 80,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -1,
        fontStyle: 'italic',
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 4,
    },
    recordBadge: {
        backgroundColor: '#06b6d4',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 16,
    },
    recordText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    listContent: {
        padding: 24,
    },
    logCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconContainer: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logInfo: {
        flex: 1,
        marginLeft: 16,
    },
    dateText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    metaText: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    timeText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    statusBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 4,
    },
    statusText: {
        color: '#10b981',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.1)',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 16,
    }
});
