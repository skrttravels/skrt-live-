"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ViewShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: any;
}

export function ViewShipmentDialog({ open, onOpenChange, shipment }: ViewShipmentDialogProps) {
  if (!shipment) return null;

  const DetailItem = ({ label, value }: { label: string; value: any }) => (
    <div className="space-y-1 py-1.5 px-3 rounded-lg bg-slate-800/20 border border-slate-700/30">
      <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-white truncate" title={String(value || '-')}>
        {value || '-'}
      </p>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-slate-700/50 pb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {children}
      </div>
    </div>
  );

  const buildShipmentHtml = () => {
    if (!shipment) return "";
    const s = shipment;
    const val = (v: any) => v ?? "—";
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Shipment - ${val(s.consignmentNumber)}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
  h1 { text-align: center; font-size: 22px; color: #000080; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 13px; color: #555; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #e8ecf0; font-weight: bold; text-align: left; padding: 8px; border: 1px solid #999; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px; border: 1px solid #999; font-size: 13px; }
  .label { font-weight: 600; color: #000080; width: 30%; }
  .section-title { font-size: 14px; font-weight: bold; color: #000080; border-bottom: 2px solid #000080; padding-bottom: 4px; margin: 20px 0 12px; }
  .total { font-size: 18px; font-weight: bold; color: #000080; text-align: right; padding: 12px; }
</style>
</head>
<body>
  <h1>SANT KANWAR RAM TRANSPORT CORP. (BHL.)</h1>
  <div class="sub">123-124, Transport Nagar, BHILWARA - 311001 (Raj.)</div>
  <div class="section-title">General Information</div>
  <table>
    <tr><td class="label">Consignment No</td><td>${val(s.consignmentNumber)}</td></tr>
    <tr><td class="label">Vehicle Number</td><td>${val(s.vehicleNumber)}</td></tr>
    <tr><td class="label">To Branch</td><td>${val(s.toBranch)}</td></tr>
    <tr><td class="label">Booked At</td><td>${s.bookedAt ? new Date(s.bookedAt).toLocaleDateString() : "—"}</td></tr>
    <tr><td class="label">Status</td><td>${val(s.status)}</td></tr>
    <tr><td class="label">Outgoing Status</td><td>${val(s.outgoingStatus)}</td></tr>
  </table>
  <div class="section-title">Parties Involved</div>
  <table>
    <tr><td class="label">Consignor Name</td><td>${val(s.consignor?.name)}</td></tr>
    <tr><td class="label">Consignor GST</td><td>${val(s.consignor?.gst)}</td></tr>
    <tr><td class="label">Consignee Name</td><td>${val(s.consignee?.name)}</td></tr>
    <tr><td class="label">Consignee GST</td><td>${val(s.consignee?.gst)}</td></tr>
  </table>
  <div class="section-title">Consignment Details</div>
  <table>
    <tr><td class="label">Description</td><td>${val(s.description)}</td></tr>
    <tr><td class="label">Quantity</td><td>${val(s.quantity)}</td></tr>
    <tr><td class="label">Package Type</td><td>${val(s.packageType)}</td></tr>
    <tr><td class="label">Actual Weight</td><td>${val(s.actualWeight)} kg</td></tr>
    <tr><td class="label">Charged Weight</td><td>${val(s.chargedWeight)} kg</td></tr>
  </table>
  <div class="section-title">Financials</div>
  <table>
    <tr><td class="label">Payment Mode</td><td>${val(s.paymentMode)}</td></tr>
    <tr><td class="label">Total Freight</td><td>₹ ${val(s.totalFreight?.toLocaleString())}</td></tr>
    <tr><td class="label">Total Payable</td><td>₹ ${val(s.totalPayable?.toLocaleString())}</td></tr>
  </table>
</body>
</html>`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1400px] lg:min-w-[1000px] h-[85vh] p-0 overflow-hidden bg-[#0b1220] border border-slate-700 shadow-2xl rounded-2xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-700/50 px-8 py-6">
          <div>
            <DialogTitle className="text-2xl font-bold text-white tracking-tight">Shipment Details</DialogTitle>
            <DialogDescription className="text-slate-400 mt-1">
              Consignment: <span className="font-bold text-primary">{shipment.consignmentNumber}</span>
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar">
          {/* General Information */}
          <Section title="General Information">
            <DetailItem label="Consignment No" value={shipment.consignmentNumber} />
            <DetailItem label="Vehicle Number" value={shipment.vehicleNumber} />
            <DetailItem label="To Branch" value={shipment.toBranch} />
            <DetailItem label="Booked At" value={shipment.bookedAt ? new Date(shipment.bookedAt).toLocaleDateString() : '-'} />
            <DetailItem label="Status" value={shipment.status} />
            <DetailItem label="Outgoing Status" value={shipment.outgoingStatus} />
          </Section>

          {/* Parties Involved */}
          <Section title="Parties Involved">
            <DetailItem label="Consignor Name" value={shipment.consignor?.name} />
            <DetailItem label="Consignor GST" value={shipment.consignor?.gst} />
            <DetailItem label="Consignee Name" value={shipment.consignee?.name} />
            <DetailItem label="Consignee GST" value={shipment.consignee?.gst} />
          </Section>

          {/* Consignment Details */}
          <Section title="Consignment Details">
            <DetailItem label="Description" value={shipment.description} />
            <DetailItem label="Quantity" value={shipment.quantity} />
            <DetailItem label="Package Type" value={shipment.packageType} />
            <DetailItem label="Private Number" value={shipment.privateNumber} />
            <DetailItem label="Actual Weight" value={`${shipment.actualWeight} kg`} />
            <DetailItem label="Charged Weight" value={`${shipment.chargedWeight} kg`} />
            <DetailItem label="Eway Parta" value={shipment.ewayParta} />
            <DetailItem label="Invoice Number" value={shipment.invoiceNumber} />
          </Section>

          {/* weight & Rating */}
          <Section title="Financials & Rating">
            <DetailItem label="Rate Type" value={shipment.rateType} />
            <DetailItem label="Rate" value={`₹ ${shipment.rate}`} />
            <DetailItem label="Payment Mode" value={shipment.paymentMode} />
            <DetailItem label="Invoice Value" value={`₹ ${shipment.invoiceValue?.toLocaleString()}`} />
            <DetailItem label="Hamali" value={`₹ ${shipment.hamali}`} />
            <DetailItem label="Stationary" value={`₹ ${shipment.stationaryCharge}`} />
            <DetailItem label="Miscellaneous" value={`₹ ${shipment.miscellaneousCharge}`} />
            <div className="col-span-1 md:col-span-2 p-4 rounded-xl bg-primary/10 border border-primary/20">
               <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Total Payable</span>
               <p className="text-2xl font-bold text-primary">₹ {shipment.totalPayable?.toLocaleString()}</p>
            </div>
          </Section>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-4 border-t border-slate-700/50 px-8 py-5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10 px-8 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-slate-800">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
