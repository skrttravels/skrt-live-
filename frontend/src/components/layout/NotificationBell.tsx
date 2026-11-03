"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

let cachedUserId = "";
let cachedNotifications: any[] = [];
let cachedAt = 0;
let pendingUserId = "";
let pendingRequest: Promise<any[]> | null = null;

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Polling for new notifications every minute
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async (force = false) => {
    if (!user) return;
    const userId = user._id;
    if (!force && cachedUserId === userId && Date.now() - cachedAt < 15000) {
      setNotifications(cachedNotifications);
      setUnreadCount(cachedNotifications.filter((n: any) => !n.read).length);
      return;
    }
    try {
      let request = pendingUserId === userId ? pendingRequest : null;
      if (!request) {
        const nextRequest = api.get('/notifications').then((res) => {
          const result = res.data.data || [];
          cachedUserId = userId;
          cachedNotifications = result;
          cachedAt = Date.now();
          return result;
        }).finally(() => {
          if (pendingRequest === nextRequest) {
            pendingRequest = null;
            pendingUserId = "";
          }
        });
        pendingUserId = userId;
        pendingRequest = nextRequest;
        request = nextRequest;
      }
      const result = await request;
      setNotifications(result);
      setUnreadCount(result.filter((n: any) => !n.read).length);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      cachedNotifications = cachedNotifications.map((notification) =>
        notification._id === id ? { ...notification, read: true } : notification
      );
      cachedAt = Date.now();
      setNotifications(cachedNotifications);
      setUnreadCount(cachedNotifications.filter((notification) => !notification.read).length);
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h4 className="font-bold">Notifications</h4>
          <Badge variant="secondary">{unreadCount} New</Badge>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No new notifications
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n._id}
                className={`p-4 flex gap-3 items-start cursor-default focus:bg-secondary/50 ${!n.read ? "bg-primary/5" : ""}`}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!n.read) markAsRead(n._id);
                }}
              >
                <div className="mt-1">{getIcon(n.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    {!n.read && <Button variant="ghost" size="icon" className="h-4 w-4 h-fit p-0" onClick={() => markAsRead(n._id)}><Check className="w-3 h-3" /></Button>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <div className="p-2 border-t border-border text-center">
          <Button variant="ghost" size="sm" className="text-xs w-full">View All Notifications</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
