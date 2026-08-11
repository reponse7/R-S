import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
}

interface AuthContextState {
  user: User | null;
  isLoading: boolean;
  login: (pin: string) => Promise<boolean>;
  register: (name: string, pin: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rehydrate session from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('rs-auth-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('rs-auth-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (pin: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      let data, sbError;
      
      // Try Supabase first
      if (import.meta.env.VITE_SUPABASE_URL) {
        const res = await supabase.from('auth_users').select('id, name').eq('pin', pin).single();
        data = res.data;
        sbError = res.error;
      }

      if (sbError || !data) {
        // Fallback to local mock mode
        const mockUsers = JSON.parse(localStorage.getItem('rs-mock-users') || '[]');
        const found = mockUsers.find((u: any) => u.pin === pin);
        if (found) {
          data = found;
          sbError = null;
        } else {
          setError('Invalid PIN or account not found.');
          return false;
        }
      }

      const loggedInUser: User = { id: data.id, name: data.name };
      setUser(loggedInUser);
      localStorage.setItem('rs-auth-user', JSON.stringify(loggedInUser));
      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      // Fallback one last time for network errors
      const mockUsers = JSON.parse(localStorage.getItem('rs-mock-users') || '[]');
      const found = mockUsers.find((u: any) => u.pin === pin);
      if (found) {
        const loggedInUser: User = { id: found.id, name: found.name };
        setUser(loggedInUser);
        localStorage.setItem('rs-auth-user', JSON.stringify(loggedInUser));
        return true;
      }
      
      setError(err.message || 'An error occurred while logging in.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      let existing, sbError, data;

      if (import.meta.env.VITE_SUPABASE_URL) {
        const res1 = await supabase.from('auth_users').select('id').eq('pin', pin).maybeSingle();
        existing = res1.data;
      }
      
      const mockUsers = JSON.parse(localStorage.getItem('rs-mock-users') || '[]');
      if (existing || mockUsers.some((u: any) => u.pin === pin)) {
        setError('An account with this PIN already exists. Please choose a different PIN.');
        return false;
      }

      const newId = crypto.randomUUID();

      if (import.meta.env.VITE_SUPABASE_URL) {
        const res2 = await supabase.from('auth_users').insert([{ id: newId, name, pin }]).select('id, name').single();
        data = res2.data;
        sbError = res2.error;
      }

      // If Supabase failed or isn't configured, use local mock
      if (sbError || !data) {
        console.warn('Supabase insertion failed or skipped, falling back to local mock storage');
        const newUserMock = { id: newId, name, pin };
        mockUsers.push(newUserMock);
        localStorage.setItem('rs-mock-users', JSON.stringify(mockUsers));
        data = { id: newId, name };
      }

      const newUser: User = { id: data.id, name: data.name };
      setUser(newUser);
      localStorage.setItem('rs-auth-user', JSON.stringify(newUser));
      return true;
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Fallback for network error
      const mockUsers = JSON.parse(localStorage.getItem('rs-mock-users') || '[]');
      const newId = crypto.randomUUID();
      const newUserMock = { id: newId, name, pin };
      mockUsers.push(newUserMock);
      localStorage.setItem('rs-mock-users', JSON.stringify(mockUsers));
      
      const newUser: User = { id: newId, name };
      setUser(newUser);
      localStorage.setItem('rs-auth-user', JSON.stringify(newUser));
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rs-auth-user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, error }}>
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
