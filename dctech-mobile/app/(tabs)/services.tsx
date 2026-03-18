import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { Palette, Image as ImageIcon, Layers, Hammer, Home, Monitor, X } from 'lucide-react-native';
import { useState } from 'react';

const SERVICES = [
    { 
        id: '1',
        title: 'Graphic Design', 
        icon: <Palette size={24} color="#fff" />, 
        image: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&q=80',
        desc: 'Modern visual identities and sleek digital creative solutions.',
        longDesc: 'We specialize in high-end brand identity design, logo creation, and digital marketing assets. Our team uses industry-leading tools like Adobe Creative Suite to ensure your business stands out.'
    },
    { 
        id: '2',
        title: 'Picture Frame', 
        icon: <ImageIcon size={24} color="#fff" />, 
        image: 'https://images.unsplash.com/photo-1583000213702-8a9667746143?auto=format&fit=crop&q=80',
        desc: 'Premium bespoke framing for elite art pieces and portraits.',
        longDesc: 'Preserve your memories and artwork with our bespoke framing services. We offer a wide range of premium materials, from museum-grade glass to custom-crafted wood and metal frames.'
    },
    { 
        id: '3',
        title: '3D & 2D Signages', 
        icon: <Layers size={24} color="#fff" />, 
        image: 'https://images.unsplash.com/photo-1540324155974-7523202daa3f?auto=format&fit=crop&q=80',
        desc: 'Physical branding and high-end technical precision mountings.',
        longDesc: 'From illuminated 3D channel letters to sleek 2D acrylic signs, we design and install high-visibility branding solutions built with durability and aesthetics.'
    },
    { 
        id: '4',
        title: 'Fabrications', 
        icon: <Hammer size={24} color="#fff" />, 
        image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80',
        desc: 'Custom construction with high-end structural finish and design.',
        longDesc: 'Our engineering team handles custom metal, wood, and acrylic fabrications. We bring precision and structural integrity to every build.'
    },
    { 
        id: '5',
        title: 'Indoor Decorations', 
        icon: <Home size={24} color="#fff" />, 
        image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80',
        desc: 'Bespoke corporate aesthetics and professional workspace art.',
        longDesc: 'Elevate your interior environment with our tailored decoration services. We provide wall installations and bespoke furniture accents that transform offices into premium workspaces.'
    },
    { 
        id: '6',
        title: 'And More', 
        icon: <Monitor size={24} color="#fff" />, 
        image: 'https://images.unsplash.com/photo-1454165833767-027ffea9e7a7?auto=format&fit=crop&q=80',
        desc: 'Continually expanding our professional creative services.',
        longDesc: 'We are always innovating. Our services extend to digital media staging, corporate gift branding, and specialized event installations.'
    }
];

export default function ServicesScreen() {
    const [selectedService, setSelectedService] = useState<any>(null);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.card} 
            onPress={() => setSelectedService(item)}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                {item.icon}
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
            <Text style={styles.detailLink}>VIEW DETAILS →</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Our Services</Text>
                <View style={styles.divider} />
            </View>

            <FlatList
                data={SERVICES}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={1}
                contentContainerStyle={styles.listContent}
            />

            <Modal
                visible={!!selectedService}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedService(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity 
                            style={styles.closeButton} 
                            onPress={() => setSelectedService(null)}
                        >
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                        
                        {selectedService && (
                            <>
                                <Image 
                                    source={{ uri: selectedService.image }} 
                                    style={styles.modalImage} 
                                />
                                <View style={styles.modalBody}>
                                    <View style={styles.modalHeaderRow}>
                                        <View style={[styles.iconContainer, { marginBottom: 0 }]}>
                                            {selectedService.icon}
                                        </View>
                                        <Text style={styles.modalTitle}>{selectedService.title}</Text>
                                    </View>
                                    <View style={styles.modalDivider} />
                                    <Text style={styles.modalDesc}>{selectedService.longDesc}</Text>
                                    
                                    <TouchableOpacity 
                                        style={styles.closeAction} 
                                        onPress={() => setSelectedService(null)}
                                    >
                                        <Text style={styles.closeActionText}>CLOSE DETAIL</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
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
        alignItems: 'center',
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
        letterSpacing: 4,
        marginTop: 4,
    },
    divider: {
        height: 4,
        width: 60,
        backgroundColor: '#06b6d4',
        borderRadius: 2,
        marginTop: 20,
    },
    listContent: {
        padding: 24,
        paddingBottom: 120,
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderRadius: 32,
        padding: 30,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconContainer: {
        width: 56,
        height: 56,
        backgroundColor: '#06b6d4',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    cardDesc: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
        lineHeight: 18,
    },
    detailLink: {
        fontSize: 9,
        fontWeight: '900',
        color: '#06b6d4',
        letterSpacing: 1,
        marginTop: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.9)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        minHeight: '70%',
        overflow: 'hidden',
    },
    closeButton: {
        position: 'absolute',
        top: 24,
        right: 24,
        zIndex: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalImage: {
        width: '100%',
        height: 250,
    },
    modalBody: {
        padding: 32,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        marginLeft: 20,
    },
    modalDivider: {
        height: 2,
        width: 40,
        backgroundColor: '#06b6d4',
        marginBottom: 24,
    },
    modalDesc: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
        lineHeight: 22,
    },
    closeAction: {
        backgroundColor: '#06b6d4',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    closeActionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
    }
});
