import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../firebase';

interface User {
  email: string;
  role: 'ppi' | 'guest';
  uid: string;
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_EMAILS = [
  'kalpithagunawardhana03@gmail.com',
  'bdshan248@gmail.com'
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser && firebaseUser.email) {
        const isAllowed = ALLOWED_EMAILS.some(
          email => email.toLowerCase() === firebaseUser.email?.toLowerCase()
        );
        
        if (isAllowed) {
          setUser({
            email: firebaseUser.email,
            role: 'ppi',
            uid: firebaseUser.uid
          });
        } else {
          signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      if (firebaseUser.email) {
        const isAllowed = ALLOWED_EMAILS.some(
          email => email.toLowerCase() === firebaseUser.email?.toLowerCase()
        );
        
        return isAllowed;
      }
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, isLoading } as any}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
