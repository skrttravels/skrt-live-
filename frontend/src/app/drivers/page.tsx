"use client";

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Star, MapPin, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

import api from "@/lib/api";
import { AddDriverDialog } from "@/components/drivers/AddDriverDialog";
import { useAuth } from "@/context/AuthContext";

export default function DriversPage() {
  const { can } = useAuth();
  const [driverList, setDriverList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/drivers");
      if (data.success) {
        setDriverList(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch drivers", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDrivers();
  }, []);

  const filteredDrivers = driverList.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm) || false
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Driver Directory</h2>
            <p className="text-muted-foreground">Manage your drivers, their performance, and current status.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search drivers..." 
                className="pl-10 w-64 bg-secondary/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {can('drivers', 'create') && <AddDriverDialog onDriverAdded={fetchDrivers} />}
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-48 animate-pulse bg-secondary/10 border-border/50" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredDrivers.map((driver) => (
              <Card key={driver._id} className="border-border/50 bg-secondary/10 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all group">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                        {driver.name.charAt(0)}
                      </div>
                      <Badge variant="outline" className={
                        driver.status === "Available" ? "text-accent border-accent/20 bg-accent/10" :
                        driver.status === "On Duty" ? "text-primary border-primary/20 bg-primary/10" :
                        "text-muted-foreground bg-secondary"
                      }>
                        {driver.status || "Offline"}
                      </Badge>
                    </div>
                  
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{driver.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">ID: {driver.id}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {driver.phone}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {driver.location}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {driver.rating} ({driver.experience})
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-border/50 bg-white/5 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-xs">View Profile</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">Manage Trips</Button>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
