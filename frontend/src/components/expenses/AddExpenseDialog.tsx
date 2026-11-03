"use client";

import React, { useCallback, useState, useEffect } from "react";
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

export function AddExpenseDialog({ onExpenseAdded }: { onExpenseAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const fetchDescriptions = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/descriptions?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchExpenseCategories = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/expense-categories?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);

  const [formData, setFormData] = useState({
    category: "Fuel",
    amount: 0,
    vehicle: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    status: "paid"
  });

  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data } = await api.get("/vehicles");
        if (data.success) {
          setVehicles(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch vehicles", error);
      }
    };
    if (open) fetchVehicles();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cat = formData.category === "Other" && customCategory.trim() ? customCategory.trim() : formData.category;
      const payload: Record<string, any> = { ...formData, category: cat };
      if (!formData.vehicle || formData.vehicle === "none") delete payload.vehicle;
      await api.post("/expenses", payload);
      toast.success("Expense recorded successfully!");
      setOpen(false);
      onExpenseAdded();
      setFormData({ category: "Fuel", amount: 0, vehicle: "", description: "", date: new Date().toISOString().split('T')[0], status: "paid" });
      setCustomCategory("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-[500px] box-border bg-background border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 w-full box-border">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v) => setFormData({...formData, category: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fuel">Fuel</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Toll">Toll</SelectItem>
                <SelectItem value="Driver Payment">Driver Payment</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {formData.category === "Other" && (
              <div className="mt-2">
                <AutocompleteInput
                  value={customCategory}
                  onChange={(v) => setCustomCategory(v)}
                  onSelect={(v) => setCustomCategory(v)}
                  fetchSuggestions={fetchExpenseCategories}
                  placeholder="Type custom category name..."
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input 
              id="amount" 
              type="number"
              required
              value={formData.amount} 
              onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} 
            />
          </div>

          <div className="space-y-2">
            <Label>Vehicle (Optional)</Label>
            <Select 
              value={formData.vehicle} 
              onValueChange={(v) => setFormData({...formData, vehicle: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v._id} value={v._id}>{v.vehicleNo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date" 
              type="date"
              required
              value={formData.date} 
              onChange={(e) => setFormData({...formData, date: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <AutocompleteInput
              value={formData.description}
              onChange={(v) => setFormData({...formData, description: v})}
              onSelect={(v) => setFormData({...formData, description: v})}
              fetchSuggestions={fetchDescriptions}
              placeholder="e.g. NH-48 Toll"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(v) => setFormData({...formData, status: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
