"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export function DeleteInventoryDialog({ 
  open, 
  onOpenChange, 
  item, 
  onDeleted 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: any; 
  onDeleted: () => void; 
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) return;
    setLoading(true);

    try {
      const res = await api.delete(`/inventory/${item._id}`);
      if (res.data.success) {
        toast.success("Inventory record deleted successfully!");
        onOpenChange(false);
        onDeleted();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete inventory record");
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-4xl bg-background border-border shadow-2xl rounded-2xl backdrop-blur-sm box-border">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3 text-destructive mb-2">
              <AlertTriangle className="h-6 w-6" />
              <DialogTitle className="text-xl font-bold">Confirm Deletion</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete inventory record <strong className="text-foreground">{item.inventoryId}</strong> ({item.cargoName})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 w-full box-border" />

          <DialogFooter className="flex gap-3 pt-6 border-t border-border">
            <Button disabled={loading} variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={loading} variant="destructive" onClick={handleDelete}>
              {loading ? "Deleting..." : "Delete Record"}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
