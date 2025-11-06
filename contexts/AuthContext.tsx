import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseConfig } from '../firebaseConfig';
import { signInWithGoogle, signOutUser } from '../services/firebaseService';

// Check if the Firebase config has been set by the user
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.apiKey !== "";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isFirebaseConfigured: boolean;
    signIn: () => Promise<User | void>;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Don't try to authenticate if firebase isn't configured
        if (!isFirebaseConfigured) {
            setLoading(false);
            return;
        }
        
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        if (!isFirebaseConfigured) {
            console.error("Firebase is not configured. Please check your firebaseConfig.ts file.");
            return;
        }
        setLoading(true);
        try {
            return await signInWithGoogle();
        } catch (error) {
            console.error("Sign in failed", error);
            // On failure, ensure loading is set back to false if onAuthStateChanged doesn't fire
            setLoading(false);
            throw error;
        }
    };
    
    const signOut = async () => {
        if (!isFirebaseConfigured) {
            console.error("Firebase is not configured.");
            return;
        }
        setLoading(true);
        try {
            await signOutUser();
        } catch (error) {
            console.error("Sign out failed", error);
            setLoading(false);
        }
    };

    const value = {
        user,
        loading,
        isFirebaseConfigured,
        signIn,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
