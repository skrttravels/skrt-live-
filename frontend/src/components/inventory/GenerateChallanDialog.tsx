"use client";

import React, { useCallback, useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { toast } from "sonner";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

export function GenerateChallanDialog({ 
  open, 
  onOpenChange, 
  item, 
  onGenerated 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: any; 
  onGenerated: () => void; 
}) {
  const [loading, setLoading] = useState(false);

  const fetchVehicleNos = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/vehicle-nos?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchDrivers = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/drivers?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchBranches = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/branches?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);

  const [formData, setFormData] = useState({
    challanNo: `CH-${Date.now().toString().slice(-6)}`,
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    fromLocation: "",
    toLocation: "",
    dispatchDate: new Date().toISOString().split('T')[0],
    packages: 1,
    weight: 0,
    remarks: ""
  });

  useEffect(() => {
    if (item) {
      setFormData({
        challanNo: `CH-${Date.now().toString().slice(-6)}`,
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
        fromLocation: item.origin || "",
        toLocation: item.destination || "",
        dispatchDate: new Date().toISOString().split('T')[0],
        packages: item.packages || 1,
        weight: item.weight || 0,
        remarks: `Dispatching ${item.cargoName}`
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setLoading(true);

    try {
      const payload = {
        ...formData,
        packages: Number(formData.packages),
        weight: Number(formData.weight)
      };

      const res = await api.post(`/inventory/${item._id}/challan`, payload);
      if (res.data.success) {
        toast.success("Challan generated successfully!");
        onOpenChange(false);
        onGenerated();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to generate challan");
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-4xl bg-background border-border shadow-2xl rounded-2xl backdrop-blur-sm box-border">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold">Generate Dispatch Challan</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Generate delivery challan for record #{item.inventoryId}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4 w-full box-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full box-border">
            <div className="space-y-2">
              <Label>Challan No *</Label>
              <Input 
                required
                value={formData.challanNo} 
                onChange={(e) => setFormData({...formData, challanNo: e.target.value})}
                className="bg-secondary/40 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Dispatch Date *</Label>
              <Input 
                required
                type="date"
                value={formData.dispatchDate} 
                onChange={(e) => setFormData({...formData, dispatchDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Inventory ID</Label>
              <Input disabled value={item.inventoryId} className="bg-secondary/40 font-mono text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>LR No / Consignment No</Label>
              <Input disabled value={item.lrNo} className="bg-secondary/40 font-mono text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>Vehicle Number *</Label>
              <AutocompleteInput
                value={formData.vehicleNumber}
                onChange={(v) => setFormData({...formData, vehicleNumber: v})}
                onSelect={(v) => setFormData({...formData, vehicleNumber: v})}
                fetchSuggestions={fetchVehicleNos}
                placeholder="e.g. MH-12-PQ-1234"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver Name *</Label>
              <AutocompleteInput
                value={formData.driverName}
                onChange={(v) => setFormData({...formData, driverName: v})}
                onSelect={(v) => setFormData({...formData, driverName: v})}
                fetchSuggestions={fetchDrivers}
                placeholder="Driver Name"
              />
            </div>

            <div className="space-y-2">
              <Label>Driver Phone *</Label>
              <Input 
                required
                placeholder="Driver Phone"
                value={formData.driverPhone} 
                onChange={(e) => setFormData({...formData, driverPhone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>From Location *</Label>
              <AutocompleteInput
                value={formData.fromLocation}
                onChange={(v) => setFormData({...formData, fromLocation: v})}
                onSelect={(v) => setFormData({...formData, fromLocation: v})}
                fetchSuggestions={fetchBranches}
                placeholder="Origin Warehouse/City"
              />
            </div>

            <div className="space-y-2">
              <Label>To Location *</Label>
              <AutocompleteInput
                value={formData.toLocation}
                onChange={(v) => setFormData({...formData, toLocation: v})}
                onSelect={(v) => setFormData({...formData, toLocation: v})}
                fetchSuggestions={fetchBranches}
                placeholder="Destination Hub/City"
              />
            </div>
            <div className="space-y-2">
              <Label>Packages *</Label>
              <Input 
                required
                type="number"
                min="1"
                value={formData.packages} 
                onChange={(e) => setFormData({...formData, packages: Number(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label>Weight (kg) *</Label>
              <Input 
                required
                type="number"
                min="0"
                step="any"
                value={formData.weight} 
                onChange={(e) => setFormData({...formData, weight: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input 
                placeholder="Dispatch notes or special handling..."
                value={formData.remarks} 
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-6 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
              {loading ? "Generating..." : "Generate Challan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
