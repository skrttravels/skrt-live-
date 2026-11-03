"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Save, RotateCcw, Eye } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

interface ViewEditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
  onEntryUpdated?: () => void;
}

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

const EditField = ({
  label,
  value,
  field,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  field: string;
  onChange: (field: string, value: string) => void;
  type?: string;
}) => (
  <div className="space-y-1.5 py-2">
    <p className="text-slate-400 text-sm font-medium">{label}</p>
    <Input
      value={value || ""}
      onChange={(e) => onChange(field, e.target.value)}
      type={type}
      className="h-11 bg-slate-900/50 border-slate-700 text-white rounded-lg focus:ring-primary/50"
    />
  </div>
);

const AutocompleteEditField = ({
  label,
  value,
  field,
  onChange,
  fetchSuggestions,
}: {
  label: string;
  value: any;
  field: string;
  onChange: (field: string, value: string) => void;
  fetchSuggestions: (q: string) => Promise<string[]>;
}) => (
  <div className="space-y-1.5 py-2">
    <p className="text-slate-400 text-sm font-medium">{label}</p>
    <AutocompleteInput
      value={value || ""}
      onChange={(v) => onChange(field, v)}
      onSelect={(v) => onChange(field, v)}
      fetchSuggestions={fetchSuggestions}
      className="bg-slate-900/50 border-slate-700 text-white rounded-lg focus:ring-primary/50"
    />
  </div>
);

export function ViewEditEntryDialog({
  open,
  onOpenChange,
  entry,
  onEntryUpdated,
}: ViewEditEntryDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchBranches = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/branches?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchParties = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/parties?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);
  const fetchCargo = useCallback(async (q: string): Promise<string[]> => {
    try { const { data } = await api.get(`/suggestions/cargo?q=${encodeURIComponent(q)}`); return data.data || []; } catch { return []; }
  }, []);

  useEffect(() => {
    if (open && entry && !isEditing) {
      setFormData({
        sno: entry.sno || "",
        from: entry.from || "",
        to: entry.to || "",
        grNo: entry.grNo || "",
        consignor: entry.consignor || "",
        consignee: entry.consignee || "",
        noOfPackages: entry.noOfPackages || "",
        contents: entry.contents || "",
        freight: entry.freight || "",
        deliveryReceiptNo: entry.deliveryReceiptNo || "",
        dateOfDelivery: entry.dateOfDelivery || "",
        deliveryStatus: entry.deliveryStatus || (entry.dateOfDelivery ? "Complete" : "Pending"),
        _id: entry._id,
        _registerId: entry._registerId,
      });
    }
  }, [open, entry, isEditing]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleCancel = () => {
    if (entry) {
      setFormData({
        sno: entry.sno || "",
        from: entry.from || "",
        to: entry.to || "",
        grNo: entry.grNo || "",
        consignor: entry.consignor || "",
        consignee: entry.consignee || "",
        noOfPackages: entry.noOfPackages || "",
        contents: entry.contents || "",
        freight: entry.freight || "",
        deliveryReceiptNo: entry.deliveryReceiptNo || "",
        dateOfDelivery: entry.dateOfDelivery || "",
        deliveryStatus: entry.deliveryStatus || (entry.dateOfDelivery ? "Complete" : "Pending"),
        _id: entry._id,
        _registerId: entry._registerId,
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData._registerId || !formData._id) {
      toast.error("Missing register or entry ID.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        sno: formData.sno,
        from: formData.from,
        to: formData.to,
        grNo: formData.grNo,
        consignor: formData.consignor,
        consignee: formData.consignee,
        noOfPackages: formData.noOfPackages,
        contents: formData.contents,
        freight: formData.freight,
        deliveryReceiptNo: formData.deliveryReceiptNo,
        dateOfDelivery: formData.dateOfDelivery,
        deliveryStatus: formData.deliveryStatus,
      };

      await api.put(`/entry/${formData._registerId}/entries/${formData._id}`, payload);
      toast.success("Entry updated successfully");
      setIsEditing(false);
      onOpenChange(false);
      if (onEntryUpdated) {
        onEntryUpdated();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update entry");
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1100px] lg:min-w-[800px] h-[85vh] p-0 overflow-hidden bg-[#0b1220] border border-slate-700 shadow-2xl rounded-2xl flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-700/50 px-8 py-6">
          <div>
            <DialogTitle className="text-2xl font-bold text-white tracking-tight">
              {isEditing ? "Edit Entry" : "Entry Details"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-1">
              {isEditing
                ? "Modify entry fields below"
                : `G.R. No: ${entry.grNo || '-'} — ${entry.consignor || '-'} → ${entry.consignee || '-'}`}
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar">
          {!isEditing ? (
            <>
              <Section title="General Information">
                <DetailItem label="S.No." value={entry.sno} />
                <DetailItem label="From" value={entry.from} />
                <DetailItem label="To" value={entry.to} />
                <DetailItem label="G.R. No." value={entry.grNo} />
              </Section>

              <Section title="Parties">
                <DetailItem label="Consignor" value={entry.consignor} />
                <DetailItem label="Consignee" value={entry.consignee} />
              </Section>

              <Section title="Cargo Details">
                <DetailItem label="No. of Packages" value={entry.noOfPackages} />
                <DetailItem label="Contents" value={entry.contents} />
                <DetailItem label="Freight" value={entry.freight} />
              </Section>

              <Section title="Delivery Information">
                <DetailItem label="Delivery Receipt No." value={entry.deliveryReceiptNo} />
                <DetailItem label="Date of Delivery" value={entry.dateOfDelivery} />
                <div className="space-y-1 py-1.5 px-3 rounded-lg bg-slate-800/20 border border-slate-700/30">
                  <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Delivery Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${entry.deliveryStatus === "Complete"
                    ? "bg-emerald-900/50 text-emerald-400"
                    : "bg-amber-900/50 text-amber-400"
                  }`}>
                    {entry.deliveryStatus}
                  </span>
                </div>
              </Section>

              <Section title="Register Reference">
                <DetailItem label="Register Date" value={entry._registerDate} />
                <DetailItem label="Page No." value={entry._registerPage} />
                <DetailItem label="Challan No." value={entry._registerChallan} />
                <DetailItem label="Vehicle No." value={entry._registerVehicleNo} />
              </Section>
            </>
          ) : (
            <div className="space-y-8">
              <Section title="General Information">
                <EditField label="S.No." value={formData.sno} field="sno" onChange={handleInputChange} />
                <AutocompleteEditField label="From" value={formData.from} field="from" onChange={handleInputChange} fetchSuggestions={fetchBranches} />
                <AutocompleteEditField label="To" value={formData.to} field="to" onChange={handleInputChange} fetchSuggestions={fetchBranches} />
                <EditField label="G.R. No." value={formData.grNo} field="grNo" onChange={handleInputChange} />
              </Section>

              <Section title="Parties">
                <AutocompleteEditField label="Consignor" value={formData.consignor} field="consignor" onChange={handleInputChange} fetchSuggestions={fetchParties} />
                <AutocompleteEditField label="Consignee" value={formData.consignee} field="consignee" onChange={handleInputChange} fetchSuggestions={fetchParties} />
              </Section>

              <Section title="Cargo Details">
                <EditField label="No. of Packages" value={formData.noOfPackages} field="noOfPackages" onChange={handleInputChange} />
                <AutocompleteEditField label="Contents" value={formData.contents} field="contents" onChange={handleInputChange} fetchSuggestions={fetchCargo} />
                <EditField label="Freight" value={formData.freight} field="freight" onChange={handleInputChange} />
              </Section>

              <Section title="Delivery Information">
                <EditField label="Delivery Receipt No." value={formData.deliveryReceiptNo} field="deliveryReceiptNo" onChange={handleInputChange} />
                <EditField label="Date of Delivery" value={formData.dateOfDelivery} field="dateOfDelivery" onChange={handleInputChange} type="date" />
                <div className="space-y-1.5 py-2">
                  <p className="text-slate-400 text-sm font-medium">Delivery Status</p>
                  <Select
                    value={formData.deliveryStatus || "Pending"}
                    onValueChange={(val) => handleInputChange("deliveryStatus", val)}
                  >
                    <SelectTrigger className="h-11 bg-slate-900/50 border-slate-700 text-white rounded-lg focus:ring-primary/50">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Section>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 border-t border-slate-700/50 px-8 py-5">
          {!isEditing ? (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-10 px-8 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Close
              </Button>
              <Button
                onClick={() => setIsEditing(true)}
                className="h-10 px-8 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-semibold transition-all active:scale-95 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={loading}
                className="h-10 px-8 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="h-10 px-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-semibold transition-all active:scale-95 flex items-center gap-2"
              >
                {loading ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
