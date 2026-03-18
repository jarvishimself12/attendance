import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginScreen() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            if (isRegistering) {
                if (!firstName || !lastName) {
                    Alert.alert('Error', 'Please enter your full name');
                    setLoading(false);
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    firstName,
                    lastName,
                    email,
                    role: 'Employee',
                    createdAt: new Date().toISOString()
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Auth Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View className="items-center mb-10">
                    <View style={styles.logoContainer}>
                        <ArrowRight size={32} color="#06b6d4" />
                    </View>
                    <Text style={styles.title}>DC TECH</Text>
                    <Text style={styles.subtitle}>{isRegistering ? 'Create your identity' : 'Security Clearance Required'}</Text>
                </View>

                <View style={styles.formCard}>
                    {isRegistering && (
                        <>
                            <View style={styles.inputWrapper}>
                                <User size={20} color="#94a3b8" />
                                <TextInput
                                    placeholder="First Name"
                                    placeholderTextColor="#64748b"
                                    style={styles.input}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                            </View>
                            <View style={styles.inputWrapper}>
                                <User size={20} color="#94a3b8" />
                                <TextInput
                                    placeholder="Last Name"
                                    placeholderTextColor="#64748b"
                                    style={styles.input}
                                    value={lastName}
                                    onChangeText={setLastName}
                                />
                            </View>
                        </>
                    )}

                    <View style={styles.inputWrapper}>
                        <Mail size={20} color="#94a3b8" />
                        <TextInput
                            placeholder="Email Address"
                            placeholderTextColor="#64748b"
                            style={styles.input}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Lock size={20} color="#94a3b8" />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#64748b"
                            style={styles.input}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.authButton} 
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        <Text style={styles.authButtonText}>
                            {loading ? 'Processing...' : (isRegistering ? 'Register Account' : 'Authenticate')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.switchButton} 
                        onPress={() => setIsRegistering(!isRegistering)}
                    >
                        <Text style={styles.switchButtonText}>
                            {isRegistering ? 'Already have an account? Login' : 'New here? Register'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 30,
    },
    logoContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#06b6d4',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 4,
    },
    formCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    input: {
        flex: 1,
        marginLeft: 12,
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    authButton: {
        backgroundColor: '#06b6d4',
        height: 60,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    authButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    switchButton: {
        marginTop: 24,
        alignItems: 'center',
    },
    switchButtonText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        fontWeight: '700',
    }
});
