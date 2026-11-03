"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import api from "@/lib/api";

interface WhatsAppQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppQRDialog({ open, onOpenChange }: WhatsAppQRDialogProps) {
  const [status, setStatus] = useState<"loading" | "connected" | "qr" | "error">("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/whatsapp/status");
      if (data.success) {
        setStatusMessage(data.data.message || null);
        if (data.data.connected) {
          setStatus("connected");
          setQrCode(null);
        } else if (data.data.qrCode) {
          setStatus("qr");
          setQrCode(data.data.qrCode);
        } else {
          setStatus("loading");
        }
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, fetchStatus]);

  const qrUrl = qrCode
    ? "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(qrCode)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp Connection
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 gap-4">
          {status === "connected" && (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
              <p className="text-emerald-400 font-semibold text-lg">WhatsApp Connected</p>
              <p className="text-slate-500 text-xs text-center">You can now send PDFs via WhatsApp from any document.</p>
            </>
          )}

          {status === "qr" && qrCode && (
            <>
              <p className="text-slate-300 text-sm font-medium">Scan this QR code with WhatsApp</p>
              <div className="bg-white p-3 rounded-xl">
                <img
                  src={qrUrl}
                  alt="WhatsApp QR Code"
                  className="w-[250px] h-[250px]"
                />
              </div>
              <p className="text-slate-500 text-xs text-center">Open WhatsApp -&gt; Linked Devices -&gt; Link a Device</p>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-[#2388ff] animate-spin" />
              <p className="text-slate-400 text-sm">{statusMessage || 'Starting WhatsApp client...'}</p>
              {!statusMessage && <p className="text-slate-600 text-xs">This may take a few seconds</p>}
              {statusMessage && <p className="text-amber-400 text-xs animate-pulse">{statusMessage}</p>}
            </>
          )}

          {status === "error" && (
            <>
              <RefreshCw className="w-12 h-12 text-rose-400" />
              <p className="text-rose-400 text-sm font-medium">Failed to connect</p>
              <button
                onClick={fetchStatus}
                className="text-xs text-[#2388ff] hover:underline"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
