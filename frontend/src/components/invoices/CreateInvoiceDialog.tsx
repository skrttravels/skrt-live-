"use client";

import React, { useState, useEffect } from "react";
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

export function CreateInvoiceDialog({ onInvoiceCreated }: { onInvoiceCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shipments, setShipments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    shipmentId: "",
    clientName: "",
    amount: 0,
    tax: 0,
    total: 0,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const { data } = await api.get("/shipments");
        if (data.success) {
          setShipments(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch shipments", error);
      }
    };
    if (open) fetchShipments();
  }, [open]);

  const handleShipmentChange = (shipmentId: string) => {
    const selected = shipments.find(s => s._id === shipmentId);
    if (selected) {
      const amount = selected.totalFreight || 0;
      const tax = amount * 0.18; // 18% GST default
      setFormData({
        ...formData,
        shipmentId,
        clientName: selected.sender?.name || "",
        amount,
        tax,
        total: amount + tax
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        invoiceNo: formData.invoiceNo,
        shipment: formData.shipmentId,
        client: {
          name: formData.clientName
        },
        amount: formData.amount,
        tax: formData.tax,
        total: formData.total,
        dueDate: formData.dueDate
      };

      await api.post("/invoices", payload);
      toast.success("Invoice created successfully!");
      setOpen(false);
      onInvoiceCreated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-[425px] box-border">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 w-full box-border">
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input 
              value={formData.invoiceNo} 
              onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Select Shipment</Label>
            <Select onValueChange={handleShipmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a shipment" />
              </SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.shipmentId} - {s.sender?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full box-border">
            <div className="space-y-2">
              <Label>Base Amount</Label>
              <Input type="number" value={formData.amount} readOnly className="bg-secondary/20" />
            </div>
            <div className="space-y-2">
              <Label>Tax (GST 18%)</Label>
              <Input type="number" value={formData.tax} readOnly className="bg-secondary/20" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-primary font-bold">Total Payable</Label>
            <div className="text-2xl font-bold text-primary">₹{formData.total.toLocaleString()}</div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input 
              type="date" 
              value={formData.dueDate} 
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})} 
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading || !formData.shipmentId}>
              {loading ? "Generating..." : "Generate Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
