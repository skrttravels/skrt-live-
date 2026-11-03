"use client";

import React, { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

export function CreateInventoryDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCargo = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/cargo?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchParties = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/parties?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchBranches = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/branches?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);

  const [formData, setFormData] = useState({
    inventoryId: `INV${Date.now().toString().slice(-6)}`,
    lrNo: `LR${Date.now().toString().slice(-6)}`,
    cargoName: "",
    senderName: "",
    senderPhone: "",
    receiverName: "",
    receiverPhone: "",
    origin: "",
    destination: "",
    packages: 1,
    weight: 0,
    rate: 0,
    paymentMode: "To Pay",
    warehouseLocation: "Main Warehouse",
    incomingStatus: "Pending",
    remarks: ""
  });

  const totalFreight = (Number(formData.weight) || 0) * (Number(formData.rate) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        packages: Number(formData.packages),
        weight: Number(formData.weight),
        rate: Number(formData.rate),
        totalFreight
      };

      const res = await api.post("/inventory", payload);
      if (res.data.success) {
        toast.success("Inventory record created successfully!");
        setOpen(false);
        onCreated();
        setFormData({
          inventoryId: `INV${Date.now().toString().slice(-6)}`,
          lrNo: `LR${Date.now().toString().slice(-6)}`,
          cargoName: "",
          senderName: "",
          senderPhone: "",
          receiverName: "",
          receiverPhone: "",
          origin: "",
          destination: "",
          packages: 1,
          weight: 0,
          rate: 0,
          paymentMode: "To Pay",
          warehouseLocation: "Main Warehouse",
          incomingStatus: "Pending",
          remarks: ""
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create inventory record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
          <Plus className="h-4 w-4 mr-2" /> New Inventory
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[1400px] lg:min-w-[1000px] h-[85vh] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 border-b border-border/50 px-8 py-6">
          <div>
            <DialogTitle className="text-3xl font-bold text-foreground">Create New Inventory</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Fill in the details below to add a new cargo item to inventory.
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form id="create-inventory-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Inventory ID *</Label>
              <Input
                required
                value={formData.inventoryId}
                onChange={(e) => setFormData({ ...formData, inventoryId: e.target.value })}
                className="h-11 w-full bg-secondary/20 font-mono rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">LR No / Consignment No *</Label>
              <Input
                required
                value={formData.lrNo}
                onChange={(e) => setFormData({ ...formData, lrNo: e.target.value })}
                className="h-11 w-full bg-secondary/20 font-mono rounded-lg"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-sm font-semibold">Item / Cargo Name *</Label>
              <AutocompleteInput
                value={formData.cargoName}
                onChange={(v) => setFormData({ ...formData, cargoName: v })}
                onSelect={(v) => setFormData({ ...formData, cargoName: v })}
                fetchSuggestions={fetchCargo}
                placeholder="e.g. Cotton Bales, Machinery Spares"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Sender Name *</Label>
              <AutocompleteInput
                value={formData.senderName}
                onChange={(v) => setFormData({ ...formData, senderName: v })}
                onSelect={(v) => setFormData({ ...formData, senderName: v })}
                fetchSuggestions={fetchParties}
                placeholder="Sender Name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Sender Phone *</Label>
              <Input
                required
                placeholder="Sender Phone"
                value={formData.senderPhone}
                onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                className="h-11 w-full rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Receiver Name *</Label>
              <AutocompleteInput
                value={formData.receiverName}
                onChange={(v) => setFormData({ ...formData, receiverName: v })}
                onSelect={(v) => setFormData({ ...formData, receiverName: v })}
                fetchSuggestions={fetchParties}
                placeholder="Receiver Name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Receiver Phone *</Label>
              <Input
                required
                placeholder="Receiver Phone"
                value={formData.receiverPhone}
                onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                className="h-11 w-full rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Origin *</Label>
              <AutocompleteInput
                value={formData.origin}
                onChange={(v) => setFormData({ ...formData, origin: v })}
                onSelect={(v) => setFormData({ ...formData, origin: v })}
                fetchSuggestions={fetchBranches}
                placeholder="Origin City"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Destination *</Label>
              <AutocompleteInput
                value={formData.destination}
                onChange={(v) => setFormData({ ...formData, destination: v })}
                onSelect={(v) => setFormData({ ...formData, destination: v })}
                fetchSuggestions={fetchBranches}
                placeholder="Destination City"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Packages *</Label>
              <Input
                required
                type="number"
                min="1"
                value={formData.packages}
                onChange={(e) => setFormData({ ...formData, packages: Number(e.target.value) })}
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Weight (kg) *</Label>
              <Input
                required
                type="number"
                min="0"
                step="any"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                className="h-11 w-full rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Rate (per kg) *</Label>
              <Input
                required
                type="number"
                min="0"
                step="any"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-primary">Total Freight (₹)</Label>
              <div className="h-11 flex items-center px-3 rounded-lg bg-primary/10 text-primary font-bold border border-primary/20">
                ₹{totalFreight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payment Mode *</Label>
              <Select
                value={formData.paymentMode}
                onValueChange={(v) => setFormData({ ...formData, paymentMode: v })}
              >
                <SelectTrigger className="h-11 w-full rounded-lg">
                  <SelectValue placeholder="Select Payment Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="To Pay">To Pay</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Warehouse Location</Label>
              <Input
                placeholder="e.g. Main Bay 3"
                value={formData.warehouseLocation}
                onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
                className="h-11 w-full rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Incoming Status</Label>
              <Select
                value={formData.incomingStatus}
                onValueChange={(v) => setFormData({ ...formData, incomingStatus: v })}
              >
                <SelectTrigger className="h-11 w-full rounded-lg">
                  <SelectValue placeholder="Incoming Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N/A">N/A</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Arrived at Warehouse">Arrived at Warehouse</SelectItem>
                  <SelectItem value="Checked In">Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-sm font-semibold">Remarks</Label>
              <Input
                placeholder="Any additional instructions or remarks..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="h-11 w-full rounded-lg"
              />
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-8 py-5 border-t border-border/50 bg-secondary/5 flex flex-col sm:flex-row sm:justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-11 px-6 rounded-lg font-medium text-muted-foreground hover:bg-accent">
            Cancel
          </Button>
          <Button
            form="create-inventory-form"
            type="submit"
            disabled={loading}
            className="h-11 px-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm overflow-hidden"
          >
            {loading ? "Creating..." : "Create Inventory"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
