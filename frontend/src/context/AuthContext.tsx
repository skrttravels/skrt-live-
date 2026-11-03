"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  can: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);
  const router = useRouter();

  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/my-permissions");
      if (data.success) {
        setPermissions(data.data);
      }
    } catch {
      setPermissions(null);
    }
  }, []);

  const can = useCallback((module: string, action: string): boolean => {
    if (!permissions) return false;
    if (permissions.all) return true;
    return !!(permissions[module] && permissions[module][action]);
  }, [permissions]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await api.get("/auth/profile");
          if (res.data?.success) {
            setUser(res.data.data);
          } else {
            setUser(res.data);
          }
          await fetchPermissions();
        } catch (err) {
          console.error("Auth initialization failed:", err);
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [fetchPermissions]);

  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    setUser(userData);
    fetchPermissions();
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setPermissions(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
