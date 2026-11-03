"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
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
import { Plus, Printer, Download } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

function formatConsignmentNumber(index: number) {
  return `SK-${String(index).padStart(3, '0')}`;
}

export function CreateShipmentDialog({
  onShipmentCreated,
  shipmentData,
  isEdit = false,
  open: externalOpen,
  onOpenChange: setExternalOpen
}: {
  onShipmentCreated: () => void;
  shipmentData?: any;
  isEdit?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const fetchParties = useCallback(async (q: string): Promise<string[]> => {
    try {
      const { data } = await api.get(`/suggestions/parties?q=${encodeURIComponent(q)}`);
      return data.data || [];
    } catch { return []; }
  }, []);

  const fetchBranches = useCallback(async (q: string): Promise<string[]> => {
    try {
      const { data } = await api.get(`/suggestions/branches?q=${encodeURIComponent(q)}`);
      return data.data || [];
    } catch { return []; }
  }, []);

  const fetchDescriptions = useCallback(async (q: string): Promise<string[]> => {
    try {
      const { data } = await api.get(`/suggestions/descriptions?q=${encodeURIComponent(q)}`);
      return data.data || [];
    } catch { return []; }
  }, []);

  const fetchVehicleNos = useCallback(async (q: string): Promise<string[]> => {
    try {
      const { data } = await api.get(`/suggestions/vehicle-nos?q=${encodeURIComponent(q)}`);
      return data.data || [];
    } catch { return []; }
  }, []);

  const fetchGstForParty = async (name: string, role: "consignor" | "consignee") => {
    try {
      const { data } = await api.get(`/shipments/parties?q=${encodeURIComponent(name)}&role=${role}`);
      const match = (data.data || []).find((p: any) => p.name === name);
      if (match?.gst) return match.gst;
    } catch {}
    // Fallback: lookup in clients DB (gstin field)
    try {
      const { data } = await api.get(`/clients?search=${encodeURIComponent(name)}`);
      const client = (data.data || []).find((c: any) => c.name.toLowerCase() === name.toLowerCase());
      if (client?.gstin) return client.gstin;
    } catch {}
    return "";
  };

  const openAddPartyDialog = (role: "consignor" | "consignee") => {
    const name = role === "consignor" ? formData.consignorName : formData.consigneeName;
    const gst = role === "consignor" ? formData.consignorGst : formData.consigneeGst;
    setAddPartyRole(role);
    setAddPartyForm({ name, gst, phone: "" });
    setAddPartyOpen(true);
  };

  const handleSaveParty = async () => {
    if (!addPartyForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setAddPartyLoading(true);
    try {
      await api.post("/clients", {
        name: addPartyForm.name.trim(),
        phone: addPartyForm.phone.trim() || undefined,
        gstin: addPartyForm.gst.trim() || undefined,
        address: "",
      });
      if (addPartyForm.gst.trim()) {
        api.post("/contacts", {
          type: addPartyRole,
          name: addPartyForm.name.trim(),
          gst: addPartyForm.gst.trim(),
          phoneNumber: addPartyForm.phone.trim() || undefined,
        }).catch(() => {});
      }
      toast.success(`${addPartyRole === "consignor" ? "Consignor" : "Consignee"} added to clients!`);
      if (addPartyRole === "consignor") {
        setFormData((prev) => ({
          ...prev,
          consignorName: addPartyForm.name.trim(),
          consignorGst: addPartyForm.gst.trim(),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          consigneeName: addPartyForm.name.trim(),
          consigneeGst: addPartyForm.gst.trim(),
        }));
      }
      setAddPartyOpen(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || "";
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("e11000")) {
        toast.error("Client with this name already exists");
      } else {
        toast.error(msg || "Failed to add party");
      }
    } finally {
      setAddPartyLoading(false);
    }
  };

  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen || setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [savingPrint, setSavingPrint] = useState(false);
  const [savingDownload, setSavingDownload] = useState(false);
  const [driverEntries, setDriverEntries] = useState<any[]>([]);
  const [customVehicle, setCustomVehicle] = useState(false);

  const [addPartyOpen, setAddPartyOpen] = useState(false);
  const [addPartyRole, setAddPartyRole] = useState<"consignor" | "consignee">("consignor");
  const [addPartyForm, setAddPartyForm] = useState({ name: "", gst: "", phone: "" });
  const [addPartyLoading, setAddPartyLoading] = useState(false);

  const vehicleList = React.useMemo(() => {
    const seen = new Set<string>();
    return driverEntries.filter(d => {
      if (!d.vehicleNumber || seen.has(d.vehicleNumber)) return false;
      seen.add(d.vehicleNumber);
      return true;
    });
  }, [driverEntries]);
  const [formData, setFormData] = useState({
    consignmentNumber: formatConsignmentNumber(1),
    toBranch: '',
    consignorName: '',
    consignorGst: '',
    consigneeName: '',
    consigneeGst: '',
    bookedAt: new Date().toISOString().slice(0, 10),
    ewayParta: '',
    invoiceNumber: '',
    invoiceValue: '',
    description: '',
    quantity: '',
    packageType: '',
    privateNumber: '',
    actualWeight: '',
    chargedWeight: '',
    rateType: '',
    rate: '',
    paymentMode: '',
    hamali: '',
    stationaryCharge: '',
    miscellaneousCharge: '',
    vehicleNumber: '',
    outgoingStatus: 'Pending',
    totalFreight: 0,
    totalPayable: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const numericValue = (value: string | number) => {
    if (typeof value === 'number') return value;
    const sanitized = String(value).replace(/[^0-9.-]+/g, '');
    const parsed = Number(sanitized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const totalFreight = useMemo(() => {
    if (formData.rateType === "Per Pkg") return numericValue(formData.quantity) * numericValue(formData.rate);
    if (formData.rateType === "Fixed") return numericValue(formData.rate);
    return numericValue(formData.chargedWeight) * numericValue(formData.rate);
  }, [formData.chargedWeight, formData.quantity, formData.rateType, formData.rate]);

  const totalPayable = useMemo(
    () =>
      totalFreight +
      numericValue(formData.hamali) +
      numericValue(formData.stationaryCharge) +
      numericValue(formData.miscellaneousCharge),
    [totalFreight, formData.hamali, formData.stationaryCharge, formData.miscellaneousCharge]
  );

  const loadNextConsignmentNumber = async () => {
    try {
      const { data } = await api.get('/shipments/next-number');
      if (data.success) {
        setFormData((prev) => ({ ...prev, consignmentNumber: data.data.consignmentNumber }));
      }
    } catch (error) {
      console.error('Failed to fetch next consignment number', error);
    }
  };

  useEffect(() => {
    if (open) {
      api.get("/drivers/entry").then((res) => {
        if (res.data.success) setDriverEntries(res.data.data);
      }).catch(() => {});
      setCustomVehicle(false);
      if (!isEdit) {
        resetForm();
        loadNextConsignmentNumber();
      } else if (shipmentData) {
        setFormData({
          consignmentNumber: shipmentData.consignmentNumber || '',
          toBranch: shipmentData.toBranch || '',
          consignorName: shipmentData.consignor?.name || '',
          consignorGst: shipmentData.consignor?.gst || '',
          consigneeName: shipmentData.consignee?.name || '',
          consigneeGst: shipmentData.consignee?.gst || '',
          bookedAt: shipmentData.bookedAt ? new Date(shipmentData.bookedAt).toISOString().slice(0, 10) : '',
          ewayParta: shipmentData.ewayParta || '',
          invoiceNumber: shipmentData.invoiceNumber || '',
          invoiceValue: String(shipmentData.invoiceValue || ''),
          description: shipmentData.description || '',
          quantity: String(shipmentData.quantity || ''),
          packageType: shipmentData.packageType || '',
          privateNumber: shipmentData.privateNumber || '',
          actualWeight: String(shipmentData.actualWeight || ''),
          chargedWeight: String(shipmentData.chargedWeight || ''),
          rateType: shipmentData.rateType || '',
          rate: String(shipmentData.rate || ''),
          paymentMode: shipmentData.paymentMode || '',
          hamali: String(shipmentData.hamali || ''),
          stationaryCharge: String(shipmentData.stationaryCharge || ''),
          miscellaneousCharge: String(shipmentData.miscellaneousCharge || ''),
          vehicleNumber: shipmentData.vehicleNumber || '',
          outgoingStatus: shipmentData.outgoingStatus || 'Pending',
          totalFreight: shipmentData.totalFreight || 0,
          totalPayable: shipmentData.totalPayable || 0
        });
      }
      setErrors({});
    }
  }, [open, isEdit, shipmentData]);

  // Auto-detect custom vehicle when editing — if vehicleNumber not in driver list
  useEffect(() => {
    if (driverEntries.length > 0 && formData.vehicleNumber && !customVehicle) {
      const match = driverEntries.some(d => d.vehicleNumber === formData.vehicleNumber);
      if (!match) setCustomVehicle(true);
    }
  }, [driverEntries, formData.vehicleNumber]);

  // Sync calculated totals to formData whenever inputs change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalFreight: totalFreight,
      totalPayable: totalPayable
    }));
  }, [totalFreight, totalPayable]);

  const resetForm = () => {
    setFormData({
      consignmentNumber: formatConsignmentNumber(1),
      toBranch: '',
      consignorName: '',
      consignorGst: '',
      consigneeName: '',
      consigneeGst: '',
      bookedAt: new Date().toISOString().slice(0, 10),
      ewayParta: '',
      invoiceNumber: '',
      invoiceValue: '',
      description: '',
      quantity: '',
      packageType: '',
      privateNumber: '',
      actualWeight: '',
      chargedWeight: '',
      rateType: '',
      rate: '',
      paymentMode: '',
      hamali: '',
      stationaryCharge: '',
      miscellaneousCharge: '',
      vehicleNumber: '',
      outgoingStatus: 'Pending',
      totalFreight: 0,
      totalPayable: 0
    });
    setErrors({});
  };

  const validate = () => {
    setErrors({});
    return true;
  };

  const buildShipmentPayload = () => ({
    consignmentNumber: formData.consignmentNumber,
    toBranch: formData.toBranch,
    consignor: {
      name: formData.consignorName,
      gst: formData.consignorGst,
      phoneNumber: '',
      state: '',
      building: '',
      place: '',
      city: ''
    },
    consignee: {
      name: formData.consigneeName,
      gst: formData.consigneeGst,
      phoneNumber: '',
      state: '',
      building: '',
      place: '',
      city: ''
    },
    bookedAt: formData.bookedAt,
    ewayParta: formData.ewayParta,
    invoiceNumber: formData.invoiceNumber,
    invoiceValue: numericValue(formData.invoiceValue),
    description: formData.description,
    quantity: numericValue(formData.quantity),
    packageType: formData.packageType,
    privateNumber: formData.privateNumber,
    actualWeight: numericValue(formData.actualWeight),
    chargedWeight: numericValue(formData.chargedWeight),
    rateType: formData.rateType,
    rate: numericValue(formData.rate),
    paymentMode: formData.paymentMode,
    hamali: numericValue(formData.hamali),
    stationaryCharge: numericValue(formData.stationaryCharge),
    miscellaneousCharge: numericValue(formData.miscellaneousCharge),
    totalFreight: Number(formData.totalFreight || 0),
    totalPayable: Number(formData.totalPayable || 0),
    status: 'Booked',
    vehicleNumber: formData.vehicleNumber,
    outgoingStatus: formData.outgoingStatus
  });

  const buildReceiptHtml = (copyLabel: string) => {
    const fmtDate = (ds: string) => {
      if (!ds) return "";
      const p = ds.split("-");
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds;
    };
    const pkg = `${formData.quantity} ${formData.packageType}`;
    const baseAmt = totalFreight;
    const hamali = numericValue(formData.hamali);
    const stCh = numericValue(formData.stationaryCharge);
    const misc = numericValue(formData.miscellaneousCharge);
    const total = totalPayable;

    return `
    <div class="receipt">
      <table>
        <tr>
          <td colspan="6">
            <div class="company">Sant Kanwar Ram Transport Corporation(BHL.)</div>
            <div class="sub">
              Transport Nagar, Bhilwara - 311001 (Raj.)<br>
              Mob: 96809-92567 / 86196-06627<br>
              <span class="bold">GST: 08AAHPN5613K1ZH</span>
            </div>
          </td>
          <td colspan="2" style="padding:0;">
            <table style="width:100%;border-collapse:collapse;height:100%;">
              <tr>
                <td class="bold">Date: ${fmtDate(formData.bookedAt)}</td>
                <td class="bold">GC No: ${formData.consignmentNumber}</td>
              </tr>
              <tr>
                <td class="bold">From: BHILWARA (BLW)</td>
                <td class="bold">To: ${formData.toBranch.toUpperCase()}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td colspan="4">
            <span class="bold">Consignor:</span> ${formData.consignorName || '—'}<br>
            GST No.: ${formData.consignorGst || '—'}
          </td>
          <td colspan="4">
            <span class="bold">Consignee:</span> ${formData.consigneeName || '—'}<br>
            GST No.: ${formData.consigneeGst || '—'}
          </td>
        </tr>
        <tr>
          <td class="center bold" width="10%">Packages</td>
          <td class="center bold" colspan="3">Description</td>
          <td class="center bold">Weight Actual</td>
          <td class="center bold">Weight Charged</td>
          <td class="center bold">Charges</td>
          <td class="center bold">Amount</td>
        </tr>
        <tr class="charges">
          <td class="center">${pkg}</td>
          <td colspan="3">${formData.description}</td>
          <td class="center">${formData.actualWeight} Kg</td>
          <td class="center">${formData.chargedWeight} Kg</td>
          <td>
            Base<br>
            Hamali<br>
            St. Ch.<br>
            Misc.
          </td>
          <td>
            Rs.${baseAmt}<br>
            Rs.${hamali}<br>
            Rs.${stCh}<br>
            Rs.${misc}
          </td>
        </tr>
        <tr>
          <td colspan="2"><span class="bold">Pvt. Nos:</span> ${formData.privateNumber}</td>
          <td colspan="2"><span class="bold">EWB:</span> ${formData.ewayParta || '—'}</td>
          <td colspan="2"><span class="bold">Value:</span> Rs.${numericValue(formData.invoiceValue)}</td>
          <td class="center bold">TOTAL</td>
          <td class="bold">Rs.${total}</td>
        </tr>
        <tr>
          <td colspan="5" class="terms">
            <span class="bold">OWNER'S RISK</span><br>
            1. Booked at owner's risk<br>
            2. Goods to be insured by the party & to be sent at owner's risk<br>
            3. We are not responsible for breakage, leakage and damage<br>
            4. Subject to Bhilwara jurisdiction only
          </td>
          <td colspan="2" class="copy-box">${copyLabel}</td>
          <td class="sign">For Sant Kanwar Ram Transport Corp. (BHL.),<br><br>Sign</td>
        </tr>
      </table>
    </div>`;
  };

  const buildPrintHtml = () => {
    const copies = ["ORIGINAL COPY", "RECORD COPY", "DRIVER COPY"];
    const allReceipts = copies.map(c => buildReceiptHtml(c)).join("");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Receipt - ${formData.consignmentNumber}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif;}
    body{background:#f3f3f3;padding:20px;}
    .receipt{width:1000px;margin:0 auto 25px auto;background:#fff;border:2px solid #000;}
    table{width:100%;border-collapse:collapse;}
    td{border:1px solid #000;padding:6px;vertical-align:top;font-size:14px;}
    .company{text-align:center;font-size:28px;font-weight:bold;font-family:"Times New Roman",serif;margin-bottom:5px;}
    .sub{text-align:center;font-size:12px;line-height:1.5;}
    .bold{font-weight:bold;}
    .center{text-align:center;}
    .copy-box{text-align:center;font-size:24px;font-weight:bold;vertical-align:middle;height:90px;}
    .terms{font-size:12px;line-height:1.6;}
    .sign{height:90px;text-align:center;vertical-align:bottom;padding-bottom:10px;}
    .charges td{height:32px;}
    @media print{body{background:#fff;padding:0;}.receipt{margin-bottom:15px;}}
  </style>
</head>
<body>${allReceipts}</body>
</html>`;
  };

  const submitShipment = async (mode: 'save' | 'print' | 'download' = 'save') => {
    if (!validate()) return;

    const payload = buildShipmentPayload();
    console.log('Submitting shipment payload:', payload);

    setLoading(true);
    try {
      if (isEdit && shipmentData?._id) {
        await api.put(`/shipments/${shipmentData._id}`, payload);
        toast.success('Shipment updated successfully!');
      } else {
        await api.post('/shipments', buildShipmentPayload());
        toast.success('Shipment created successfully!');
      }
      setOpen(false);
      onShipmentCreated();
      if (!isEdit) resetForm();
      if (mode === 'print') {
        setTimeout(() => {
          const pw = window.open("", "_blank");
          if (pw) {
            pw.document.write(buildPrintHtml());
            pw.document.close();
          }
        }, 250);
      } else if (mode === 'download') {
        setTimeout(() => {
          const pw = window.open("", "_blank");
          if (pw) {
            const html = buildPrintHtml().replace("</body>", `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
<script>window.onload=function(){html2pdf().set({margin:5,filename:'receipt-${formData.consignmentNumber}.pdf'}).from(document.body).save();};<\/script></body>`);
            pw.document.write(html);
            pw.document.close();
          }
        }, 250);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
      setSavingPrint(false);
      setSavingDownload(false);
    }
  };

  const renderError = (field: string) => {
    return errors[field] ? <p className="text-sm text-destructive mt-1">{errors[field]}</p> : null;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> New Shipment
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[90vw] max-w-[1400px] lg:min-w-[1000px] h-[85vh] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 border-b border-border/50 px-8 py-6">
          <div>
            <DialogTitle className="text-3xl font-bold text-foreground">
              {isEdit ? 'Edit Shipment' : 'Create New Shipment'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {!isEdit ? (
                <>Next possible consignment number: <span className="font-semibold text-primary text-base">{formData.consignmentNumber}</span></>
              ) : (
                <>Updating consignment: <span className="font-semibold text-primary text-base">{formData.consignmentNumber}</span></>
              )}
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-6" onSubmit={(e) => { e.preventDefault(); submitShipment('save'); }}>
            {/* Row 1: To Branch, Vehicle Number, Consignor, Consignee */}
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">To Branch</Label>
              <AutocompleteInput
                value={formData.toBranch}
                onChange={(v) => setFormData({ ...formData, toBranch: v })}
                onSelect={(v) => setFormData({ ...formData, toBranch: v })}
                fetchSuggestions={fetchBranches}
                placeholder="To Branch"
              />
            </div>

            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Vehicle Number</Label>
              {customVehicle ? (
                <div className="flex gap-2">
                  <AutocompleteInput
                    value={formData.vehicleNumber}
                    onChange={(v) => setFormData({ ...formData, vehicleNumber: v })}
                    onSelect={(v) => setFormData({ ...formData, vehicleNumber: v })}
                    fetchSuggestions={fetchVehicleNos}
                    placeholder="Enter vehicle number"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" className="h-11 shrink-0" onClick={() => { setCustomVehicle(false); setFormData(prev => ({ ...prev, vehicleNumber: '' })); }}>
                    List
                  </Button>
                </div>
              ) : (
                <Select
                  value={formData.vehicleNumber}
                  onValueChange={(value) => {
                    if (value === "__others__") {
                      setCustomVehicle(true);
                      setFormData(prev => ({ ...prev, vehicleNumber: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, vehicleNumber: value }));
                    }
                  }}
                >
                  <SelectTrigger className="h-11 w-full rounded-lg">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleList.map((d) => (
                      <SelectItem key={d._id} value={d.vehicleNumber}>
                        {d.vehicleNumber} — {d.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__others__" className="text-slate-400">Others (custom entry)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Consignor Name</Label>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm"
                  onClick={() => openAddPartyDialog("consignor")}
                  title="Add new consignor"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <AutocompleteInput
                value={formData.consignorName}
                onChange={(v) => setFormData({ ...formData, consignorName: v })}
                onSelect={async (name) => {
                  const gst = await fetchGstForParty(name, "consignor");
                  setFormData((prev) => ({ ...prev, consignorName: name, consignorGst: gst }));
                }}
                fetchSuggestions={fetchParties}
                placeholder="Consignor Name"
              />
            </div>

            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Consignor GST</Label>
              <Input
                value={formData.consignorGst}
                onChange={(e) => setFormData({ ...formData, consignorGst: e.target.value })}
                placeholder="GST Number"
                className="h-11 w-full rounded-lg"
              />
            </div>

            <div className="col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Consignee Name</Label>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm"
                  onClick={() => openAddPartyDialog("consignee")}
                  title="Add new consignee"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <AutocompleteInput
                value={formData.consigneeName}
                onChange={(v) => setFormData({ ...formData, consigneeName: v })}
                onSelect={async (name) => {
                  const gst = await fetchGstForParty(name, "consignee");
                  setFormData((prev) => ({ ...prev, consigneeName: name, consigneeGst: gst }));
                }}
                fetchSuggestions={fetchParties}
                placeholder="Consignee Name"
              />
            </div>

            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Consignee GST</Label>
              <Input
                value={formData.consigneeGst}
                onChange={(e) => setFormData({ ...formData, consigneeGst: e.target.value })}
                placeholder="GST Number"
                className="h-11 w-full rounded-lg"
              />
            </div>

            {/* Row 2: Booked At, Eway Parta, Invoice Number, Invoice Value */}
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Booked At</Label>
              <Input
                type="date"
                value={formData.bookedAt}
                onChange={(e) => setFormData({ ...formData, bookedAt: e.target.value })}
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Eway Parta</Label>
              <Input
                value={formData.ewayParta}
                onChange={(e) => setFormData({ ...formData, ewayParta: e.target.value })}
                placeholder="Optional"
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Invoice Number</Label>
              <Input
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="Optional"
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Invoice Value</Label>
              <Input
                type="number"
                value={formData.invoiceValue}
                onChange={(e) => setFormData({ ...formData, invoiceValue: e.target.value })}
                placeholder="Invoice Value"
                className="h-11 w-full rounded-lg"
              />
            </div>

            {/* Row 3: Description, Quantity, Package Type, Private Number */}
            <div className="col-span-1 md:col-span-2 space-y-3">
              <Label className="text-sm font-semibold">Description</Label>
              <AutocompleteInput
                value={formData.description}
                onChange={(v) => setFormData({ ...formData, description: v })}
                onSelect={(v) => setFormData({ ...formData, description: v })}
                fetchSuggestions={fetchDescriptions}
                placeholder="Enter shipment description"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Quantity</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Quantity"
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Package Type</Label>
              <Select
                value={formData.packageType}
                onValueChange={(value) => setFormData({ ...formData, packageType: value })}
              >
                <SelectTrigger className="h-11 w-full rounded-lg">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Box">Box</SelectItem>
                  <SelectItem value="Bale">Bale</SelectItem>
                  <SelectItem value="Bag">Bag</SelectItem>
                  <SelectItem value="Case">Case</SelectItem>
                  <SelectItem value="Bundle">Bundle</SelectItem>
                  <SelectItem value="Loose">Loose</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Private Number</Label>
              <Input
                value={formData.privateNumber}
                onChange={(e) => setFormData({ ...formData, privateNumber: e.target.value })}
                placeholder="Private Number"
                className="h-11 w-full rounded-lg"
              />
            </div>

            {/* Row 4: Actual Weight, Charged Weight, Rate Type, Rate */}
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Actual Weight</Label>
              <Input
                type="number"
                value={formData.actualWeight}
                onChange={(e) => setFormData({ ...formData, actualWeight: e.target.value })}
                placeholder="Actual Weight"
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Charged Weight</Label>
              <Input
                type="number"
                value={formData.chargedWeight}
                onChange={(e) => setFormData({ ...formData, chargedWeight: e.target.value })}
                placeholder="Charged Weight"
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Rate Type</Label>
              <Select
                value={formData.rateType}
                onValueChange={(value) => setFormData({ ...formData, rateType: value, rate: value === "Fixed" ? "0" : formData.rate })}
              >
                <SelectTrigger className="h-11 w-full rounded-lg">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Per Kg">Per Kg</SelectItem>
                  <SelectItem value="Per Pkg">Per Pkg</SelectItem>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Rate</Label>
              <Input
                type="number"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                placeholder="Rate"
                className="h-11 w-full rounded-lg"
              />
            </div>

            {/* Row 5: Payment Mode, Hamali, Stationary Charge, Miscellaneous Charge */}
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Payment Mode</Label>
              <Select
                value={formData.paymentMode}
                onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
              >
                <SelectTrigger className="h-11 w-full rounded-lg">
                  <SelectValue placeholder="Select Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ToPay">To Pay</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="TBB">TBB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Hamali</Label>
              <Input
                type="number"
                value={formData.hamali}
                onChange={(e) => setFormData({ ...formData, hamali: e.target.value })}
                placeholder="Optional"
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Stationary Charge</Label>
              <Input
                type="number"
                value={formData.stationaryCharge}
                onChange={(e) => setFormData({ ...formData, stationaryCharge: e.target.value })}
                placeholder="Optional"
                className="h-11 w-full rounded-lg"
              />
            </div>
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Miscellaneous Charge</Label>
              <Input
                type="number"
                value={formData.miscellaneousCharge}
                onChange={(e) => setFormData({ ...formData, miscellaneousCharge: e.target.value })}
                placeholder="Optional"
                className="h-11 w-full rounded-lg"
              />
            </div>

            {/* Outgoing Status */}
            <div className="col-span-1 space-y-3">
              <Label className="text-sm font-semibold">Outgoing Status</Label>
              <Select
                value={formData.outgoingStatus}
                onValueChange={(value) => setFormData({ ...formData, outgoingStatus: value })}
              >
                <SelectTrigger className="h-11 w-full rounded-lg">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Loaded">Loaded</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Arrived at Branch">Arrived at Branch</SelectItem>
                  <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 6: Total Freight and Total Payable */}
            <div className="col-span-1 md:col-span-2 space-y-3">
              <Label className="text-sm font-semibold">Total Freight</Label>
              <div className="h-11 flex items-center px-4 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20">
                ₹{totalFreight.toLocaleString()}
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 space-y-3">
              <Label className="text-sm font-semibold">Total Payable</Label>
              <div className="h-11 flex items-center px-4 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20">
                ₹{totalPayable.toLocaleString()}
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 border-t border-border/50 px-8 py-5 bg-background">
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 px-6 rounded-lg font-medium text-muted-foreground hover:bg-accent">
            Cancel
          </Button>
          <Button onClick={() => submitShipment('save')} disabled={loading} className="h-11 px-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm transition-all active:scale-95">
            {loading ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={() => { setSavingPrint(true); submitShipment('print'); }} disabled={loading || savingPrint} className="h-11 px-8 rounded-lg bg-secondary hover:bg-secondary/90 text-foreground font-semibold shadow-sm transition-all active:scale-95">
            <Printer className="w-4 h-4 mr-2" /> Save and Print
          </Button>
          <Button onClick={() => { setSavingDownload(true); submitShipment('download'); }} disabled={loading || savingDownload} className="h-11 px-8 rounded-lg bg-background border border-border hover:bg-secondary/50 text-foreground font-semibold shadow-sm transition-all active:scale-95">
            <Download className="w-4 h-4 mr-2" /> Save and Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Add New Party Dialog */}
    <Dialog open={addPartyOpen} onOpenChange={setAddPartyOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New {addPartyRole === "consignor" ? "Consignor" : "Consignee"}
          </DialogTitle>
          <DialogDescription>
            This will be saved to the client directory and available in future shipments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={addPartyForm.name}
              onChange={(e) => setAddPartyForm({ ...addPartyForm, name: e.target.value })}
              placeholder="Party / Company Name"
            />
          </div>
          <div className="space-y-2">
            <Label>GST Number</Label>
            <Input
              value={addPartyForm.gst}
              onChange={(e) => setAddPartyForm({ ...addPartyForm, gst: e.target.value.toUpperCase() })}
              placeholder="GSTIN (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={addPartyForm.phone}
              onChange={(e) => setAddPartyForm({ ...addPartyForm, phone: e.target.value })}
              placeholder="Phone (optional)"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setAddPartyOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveParty} disabled={addPartyLoading}>
            {addPartyLoading ? "Saving..." : "Save Party"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
