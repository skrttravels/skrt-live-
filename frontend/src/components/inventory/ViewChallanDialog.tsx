"use client";

import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function ViewChallanDialog({ 
  open, 
  onOpenChange, 
  item,
  onPrint
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: any; 
  onPrint: () => void;
}) {
  if (!item || !item.challanData) return null;
  const challan = item.challanData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-4xl bg-background border-border shadow-2xl rounded-2xl backdrop-blur-sm box-border">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold text-primary">DISPATCH CHALLAN</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Challan No: <span className="font-mono text-foreground font-semibold">{challan.challanNo}</span>
              </DialogDescription>
            </div>
            <Button size="sm" variant="outline" onClick={onPrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print Challan
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 text-sm w-full box-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/10 p-4 rounded-lg border border-border/50 font-mono w-full box-border">
            <div>
              <span className="text-xs text-muted-foreground block font-sans">Inventory ID</span>
              <p className="font-semibold text-base">{item.inventoryId}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-sans">LR / Consignment No</span>
              <p className="font-semibold text-base">{item.lrNo}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full box-border">
            <div className="bg-secondary/20 p-3 rounded-md space-y-1">
              <span className="text-xs text-muted-foreground block font-semibold">Dispatch Route</span>
              <p className="font-medium text-base">{challan.fromLocation} → {challan.toLocation}</p>
            </div>
            <div className="bg-secondary/20 p-3 rounded-md space-y-1">
              <span className="text-xs text-muted-foreground block font-semibold">Dispatch Date</span>
              <p className="font-medium text-base">{new Date(challan.dispatchDate).toLocaleDateString()}</p>
            </div>

            <div className="bg-secondary/20 p-3 rounded-md space-y-1">
              <span className="text-xs text-muted-foreground block font-semibold">Vehicle Number</span>
              <p className="font-mono text-base font-bold text-primary">{challan.vehicleNumber}</p>
            </div>
            <div className="bg-secondary/20 p-3 rounded-md space-y-1">
              <span className="text-xs text-muted-foreground block font-semibold">Driver Details</span>
              <p className="font-medium">{challan.driverName}</p>
              <p className="text-xs text-muted-foreground">{challan.driverPhone}</p>
            </div>

            <div className="bg-secondary/20 p-3 rounded-md space-y-1">
              <span className="text-xs text-muted-foreground block font-semibold">Packages Dispatched</span>
              <p className="font-medium">{challan.packages} unit(s)</p>
            </div>
            <div className="bg-secondary/20 p-3 rounded-md space-y-1">
              <span className="text-xs text-muted-foreground block font-semibold">Weight Dispatched</span>
              <p className="font-medium">{challan.weight} kg</p>
            </div>
          </div>

          <div className="bg-secondary/20 p-3 rounded-md space-y-1">
            <span className="text-xs text-muted-foreground block font-semibold">Cargo Description</span>
            <p className="font-medium">{item.cargoName}</p>
          </div>

          {challan.remarks && (
            <div className="bg-secondary/20 p-3 rounded-md space-y-1">
              <span className="text-xs text-muted-foreground block font-semibold">Dispatch Remarks</span>
              <p className="text-sm italic">{challan.remarks}</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Generated on {new Date(challan.createdAt).toLocaleString()}</p>
          <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
