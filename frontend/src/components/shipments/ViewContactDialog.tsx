"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Save, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface ViewContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  title: string;
  onContactUpdated?: () => void;
}

// Stable sub-component defined outside the main component to prevent remounting on every keystroke
const DetailRow = ({ 
  label, 
  value, 
  field, 
  isEditing, 
  onChange 
}: { 
  label: string; 
  value: any; 
  field?: string; 
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}) => (
  <div className="space-y-1.5 py-2">
    <p className="text-slate-400 text-sm font-medium">{label}</p>
    {isEditing && field ? (
      <Input
        value={value || ""}
        onChange={(e) => onChange(field, e.target.value)}
        className="h-11 bg-slate-900/50 border-slate-700 text-white rounded-lg focus:ring-primary/50"
      />
    ) : (
      <p className="text-white font-medium text-base truncate" title={value || 'Not Provided'}>
        {value || 'Not Provided'}
      </p>
    )}
  </div>
);

export function ViewContactDialog({ 
  open, 
  onOpenChange, 
  contact, 
  title,
  onContactUpdated 
}: ViewContactDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    gst: "",
    name: "",
    phoneNumber: "",
    state: "",
    building: "",
    place: "",
    city: ""
  });

  // Initialize form data only when dialog opens or contact changes, but NOT while editing
  useEffect(() => {
    if (open && contact && !isEditing) {
      setFormData({
        gst: contact.gst || "",
        name: contact.name || "",
        phoneNumber: contact.phoneNumber || "",
        state: contact.state || "",
        building: contact.building || "",
        place: contact.place || "",
        city: contact.city || "",
        _id: contact._id || contact.id || contact.contactId || contact.originalId || contact.refId // Keep ID for updates
      });
    }
  }, [open, contact, isEditing]);

  // Reset editing mode when modal closes
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
    if (contact) {
      setFormData({
        gst: contact.gst || "",
        name: contact.name || "",
        phoneNumber: contact.phoneNumber || "",
        state: contact.state || "",
        building: contact.building || "",
        place: contact.place || "",
        city: contact.city || "",
        _id: contact._id || contact.id || contact.contactId || contact.originalId || contact.refId
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.gst?.trim() || !formData.state?.trim()) {
      toast.error("Name, GST, and State are required.");
      return;
    }

    setLoading(true);
    try {
      const contactId = formData._id;
      if (!contactId) {
        toast.error("Contact ID missing. Cannot update base record.");
        setLoading(false);
        return;
      }

      await api.put(`/contacts/${contactId}`, formData);
      toast.success("Contact updated successfully");
      
      // Auto-close mode and modal on success
      setIsEditing(false);
      onOpenChange(false);
      
      if (onContactUpdated) {
        onContactUpdated();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update contact");
    } finally {
      setLoading(false);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] p-0 overflow-hidden bg-[#0b1220] border border-slate-700 shadow-2xl rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-8 py-6 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold text-white">
              {isEditing ? `Edit ${title.replace(' Details', '')}` : title}
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-1">
              {isEditing ? "Modify contact information below" : `Contact details for ${contact.name}`}
            </DialogDescription>
          </div>
        </div>

        {/* Info Grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailRow 
              label="Full Name *" 
              value={formData.name} 
              field="name" 
              isEditing={isEditing}
              onChange={handleInputChange}
            />
            <DetailRow 
              label="GST Number *" 
              value={formData.gst} 
              field="gst" 
              isEditing={isEditing}
              onChange={handleInputChange}
            />
            <DetailRow 
              label="Phone Number" 
              value={formData.phoneNumber} 
              field="phoneNumber" 
              isEditing={isEditing}
              onChange={handleInputChange}
            />
            <DetailRow 
              label="State *" 
              value={formData.state} 
              field="state" 
              isEditing={isEditing}
              onChange={handleInputChange}
            />
            <DetailRow 
              label="Building" 
              value={formData.building} 
              field="building" 
              isEditing={isEditing}
              onChange={handleInputChange}
            />
            <DetailRow 
              label="Place / Area" 
              value={formData.place} 
              field="place" 
              isEditing={isEditing}
              onChange={handleInputChange}
            />
            <div className="md:col-span-2">
              <DetailRow 
                label="City / Location" 
                value={formData.city} 
                field="city" 
                isEditing={isEditing}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-8 py-5 bg-[#0b1220] border-t border-slate-700/50 flex flex-col sm:flex-row sm:justify-end gap-3">
          {!isEditing ? (
            <>
              <Button 
                variant="ghost"
                onClick={() => onOpenChange(false)} 
                className="h-10 px-6 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Close
              </Button>
              <Button 
                onClick={() => setIsEditing(true)} 
                className="h-10 px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-semibold transition-all active:scale-95 flex items-center gap-2"
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
                className="h-10 px-6 rounded-lg font-semibold text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2"
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
