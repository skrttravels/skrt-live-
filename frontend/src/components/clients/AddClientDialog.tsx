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
import { Plus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

export function AddClientDialog({ onClientAdded }: { onClientAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchClientNames = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/client-names?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    gstin: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/clients", formData);
      toast.success("Client added successfully!");
      setOpen(false);
      onClientAdded();
      setFormData({ name: "", contactPerson: "", email: "", phone: "", address: "", gstin: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-[500px] box-border bg-background border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 w-full box-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full box-border">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Company Name</Label>
              <AutocompleteInput
                value={formData.name}
                onChange={(v) => setFormData({...formData, name: v})}
                onSelect={(v) => setFormData({...formData, name: v})}
                fetchSuggestions={fetchClientNames}
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Person</Label>
              <Input 
                id="contact" 
                value={formData.contactPerson} 
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input 
                id="gstin" 
                value={formData.gstin} 
                onChange={(e) => setFormData({...formData, gstin: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
