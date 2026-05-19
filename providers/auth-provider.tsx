"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { insforge } from "@/lib/insforge";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkSession = async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (data && data.user) {
        setUser(data.user);
        return data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error("Error checking session:", err);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Handle route protection client-side
  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === "/login" || pathname === "/register";
    
    if (!user && !isAuthRoute) {
      router.push("/login");
    } else if (user && isAuthRoute) {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  const signOut = async () => {
    try {
      setLoading(true);
      await insforge.auth.signOut();
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    return checkSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
