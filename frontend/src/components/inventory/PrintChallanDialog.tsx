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

export function PrintChallanDialog({ 
  open, 
  onOpenChange, 
  item 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  item: any; 
}) {
  if (!item || !item.challanData) return null;
  const challan = item.challanData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden w-full max-w-[800px] box-border bg-white text-black font-sans border-border shadow-2xl">
        <DialogHeader className="border-b border-gray-300 pb-4 print:hidden">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">Print Dispatch Challan</DialogTitle>
              <DialogDescription className="text-gray-600">
                Print preview formatted for standard A4 paper.
              </DialogDescription>
            </div>
            <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print Document
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Document Area */}
        <div className="p-4 sm:p-8 bg-white text-black space-y-8 print:p-0 font-sans w-full box-border overflow-x-hidden">
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-wider text-gray-900">SKRT</h1>
              <p className="text-sm font-semibold tracking-wide text-gray-600">PREMIUM LOGISTICS & CARGO CARRIERS</p>
              <p className="text-xs text-gray-500 mt-1">24/7 Operations Hub | contact@skrtcorp.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold uppercase text-gray-800">DISPATCH CHALLAN</h2>
              <p className="text-lg font-mono font-bold text-gray-900 mt-1">{challan.challanNo}</p>
              <p className="text-xs text-gray-600">Date: {new Date(challan.dispatchDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Consignment Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-100 p-4 rounded-lg border border-gray-300 w-full box-border">
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Inventory Reference</span>
              <p className="text-base font-mono font-bold text-gray-900">{item.inventoryId}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">LR / Consignment No</span>
              <p className="text-base font-mono font-bold text-gray-900">{item.lrNo}</p>
            </div>
          </div>

          {/* Route & Driver Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-y border-gray-300 py-6 w-full box-border">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase block">From / Origin</span>
                <p className="font-semibold text-lg text-gray-900">{challan.fromLocation}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase block">Sender Details</span>
                <p className="font-semibold text-gray-900">{item.senderName}</p>
                <p className="text-sm text-gray-600">{item.senderPhone}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase block">To / Destination</span>
                <p className="font-semibold text-lg text-gray-900">{challan.toLocation}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase block">Receiver Details</span>
                <p className="font-semibold text-gray-900">{item.receiverName}</p>
                <p className="text-sm text-gray-600">{item.receiverPhone}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-300 grid grid-cols-1 md:grid-cols-2 gap-6 w-full box-border">
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase block">Assigned Vehicle</span>
              <p className="text-xl font-mono font-black text-gray-900">{challan.vehicleNumber}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase block">Assigned Driver</span>
              <p className="font-semibold text-base text-gray-900">{challan.driverName}</p>
              <p className="text-sm text-gray-600 font-mono">Ph: {challan.driverPhone}</p>
            </div>
          </div>

          {/* Cargo Particulars Table */}
          <div className="space-y-2 w-full overflow-x-auto box-border">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Cargo Particulars</h3>
            <table className="w-full border-collapse border border-gray-400 min-w-[500px]">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 p-3 text-left font-bold text-sm text-gray-800">Description of Goods</th>
                  <th className="border border-gray-400 p-3 text-center font-bold text-sm text-gray-800 w-32">Packages</th>
                  <th className="border border-gray-400 p-3 text-right font-bold text-sm text-gray-800 w-32">Actual Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-4 font-medium text-gray-900">{item.cargoName}</td>
                  <td className="border border-gray-400 p-4 text-center font-semibold text-gray-900">{challan.packages}</td>
                  <td className="border border-gray-400 p-4 text-right font-semibold text-gray-900">{challan.weight} kg</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          {challan.remarks && (
            <div className="border border-dashed border-gray-400 p-4 bg-gray-50 rounded">
              <span className="text-xs font-bold text-gray-500 uppercase block">Remarks / Special Instructions</span>
              <p className="text-sm text-gray-800 italic mt-1">{challan.remarks}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-16 grid grid-cols-3 gap-8 text-center text-sm font-semibold text-gray-700">
            <div className="border-t border-gray-500 pt-2">
              Dispatch Officer Signature
            </div>
            <div className="border-t border-gray-500 pt-2">
              Driver Signature
            </div>
            <div className="border-t border-gray-500 pt-2">
              Receiver Signature & Seal
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-300 pt-4 print:hidden">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="text-gray-700 border-gray-300 hover:bg-gray-100">
            Close Preview
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
