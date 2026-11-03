"use client";

import React, { useCallback, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

export function AddVehicleDialog({ onVehicleAdded }: { onVehicleAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchVehicleModels = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/vehicle-models?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchVehicleOwners = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/vehicle-owners?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);

  const [formData, setFormData] = useState({
    vehicleNo: "",
    model: "",
    type: "Truck",
    capacity: 0,
    ownerName: "",
    ownerPhone: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        vehicleNo: formData.vehicleNo,
        model: formData.model,
        type: formData.type,
        capacity: Number(formData.capacity),
        owner: {
          name: formData.ownerName,
          phone: formData.ownerPhone
        }
      };

      await api.post("/vehicles", payload);
      toast.success("Vehicle added successfully!");
      setOpen(false);
      onVehicleAdded();
      setFormData({ vehicleNo: "", model: "", type: "Truck", capacity: 0, ownerName: "", ownerPhone: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-[425px] box-border">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 w-full box-border">
          <div className="space-y-2">
            <Label htmlFor="vehicleNo">Vehicle Number</Label>
            <Input 
              id="vehicleNo" 
              required
              placeholder="RJ-06-GB-XXXX"
              value={formData.vehicleNo} 
              onChange={(e) => setFormData({...formData, vehicleNo: e.target.value.toUpperCase()})} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model Name</Label>
            <AutocompleteInput
              value={formData.model}
              onChange={(v) => setFormData({...formData, model: v})}
              onSelect={(v) => setFormData({...formData, model: v})}
              fetchSuggestions={fetchVehicleModels}
              placeholder="Tata Prima / Leyland"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(v) => setFormData({...formData, type: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Truck">Truck</SelectItem>
                <SelectItem value="Trailer">Trailer</SelectItem>
                <SelectItem value="Container">Container</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (kg)</Label>
            <Input 
              id="capacity" 
              type="number"
              required
              value={formData.capacity} 
              onChange={(e) => setFormData({...formData, capacity: Number(e.target.value)})} 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full box-border">
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner Name</Label>
              <AutocompleteInput
                value={formData.ownerName}
                onChange={(v) => setFormData({...formData, ownerName: v})}
                onSelect={(v) => setFormData({...formData, ownerName: v})}
                fetchSuggestions={fetchVehicleOwners}
                placeholder="Owner Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerPhone">Owner Phone</Label>
              <Input 
                id="ownerPhone" 
                value={formData.ownerPhone} 
                onChange={(e) => setFormData({...formData, ownerPhone: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
