"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.success) {
        const userData = response.data.data;
        login(userData.token, {
          _id: userData._id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Connection to server failed. Please check if the backend is running.";
      setError(msg);
      console.error("❌ Login Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse delay-700" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-primary/20">
            <Truck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Log in to SKRT CORP</p>
        </div>

        <form onSubmit={handleLogin} className="glassmorphism p-8 rounded-3xl space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input 
              id="email" 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ttc.com" 
              className="bg-background/50 border-border/50 h-12 focus:ring-primary" 
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="bg-background/50 border-border/50 h-12 focus:ring-primary" 
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>

          <div className="text-center text-sm text-muted-foreground pt-4">
            Don't have an account? <Link href="#" className="text-primary font-medium hover:underline">Contact Admin</Link>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2024 SKRT CORP. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
