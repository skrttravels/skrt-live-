import api from "./api";
import { toast } from "sonner";

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned;
  return cleaned;
}

export async function htmlToPDFBase64(
  html: string,
  filename: string = "document.pdf",
  orientation: "portrait" | "landscape" = "portrait"
): Promise<string> {
  const hasDoctype = /^\s*<!DOCTYPE/i.test(html) || /<html[\s>]/i.test(html);

  if (hasDoctype) {
    const pdfScript = `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>`;
    const runPdf = `<script>
(function(){
  function go(){
    if(typeof html2pdf==='undefined'){setTimeout(go,200);return;}
    html2pdf()
      .set({margin:10,filename:'${filename}',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,letterRendering:true},jsPDF:{unit:'mm',format:'a4',orientation:'${orientation}'}})
      .from(document.querySelector('.pdf-scale') || document.body)
      .outputPdf('dataurlstring')
      .then(function(d){window.__pdfResult=d;})
      .catch(function(e){window.__pdfError=e.message||String(e);});
  }
  go();
})();
<\/script>`;

    const modifiedHtml = html.replace(/<\/body>\s*<\/html>/i, pdfScript + runPdf + '</body></html>');

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;left:-9999px;top:0;width:800px;border:none;";
    document.body.appendChild(iframe);

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Cannot access iframe document");

      iframeDoc.open();
      iframeDoc.write(modifiedHtml);
      iframeDoc.close();

      const blob = await new Promise<Blob>((resolve, reject) => {
        let attempts = 0;
        const poll = () => {
          const win = iframe.contentWindow as any;
          if (win?.__pdfResult) {
            const dataUrl: string = win.__pdfResult;
            fetch(dataUrl).then(r => r.blob()).then(resolve).catch(reject);
          } else if (win?.__pdfError) {
            reject(new Error(win.__pdfError));
          } else if (attempts++ < 100) {
            setTimeout(poll, 200);
          } else {
            reject(new Error("PDF generation timed out"));
          }
        };
        poll();
      });

      return await blobToBase64(blob);
    } finally {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }
  }

  const html2pdfMod = await import("html2pdf.js");
  const html2pdf = html2pdfMod.default || html2pdfMod;

  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:800px;";
  document.body.appendChild(container);

  try {
    const worker = html2pdf()
      .set({
        margin: 5,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, letterRendering: true, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation },
      })
      .from(container);

    await worker.toContainer();
    await worker.toCanvas();
    await worker.toPdf();

    const blob = await worker.outputPdf("blob");
    return await blobToBase64(blob);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function sendViaWhatsApp(
  phone: string,
  pdfBase64: string,
  filename: string
): Promise<void> {
  await api.post("/whatsapp/send-pdf", {
    phone: formatPhone(phone),
    pdfBase64,
    filename,
  });
}

export async function generateAndSendPDF(
  phone: string,
  html: string,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait"
): Promise<void> {
  const TOAST_ID = "whatsapp-progress";
  toast.loading("Generating PDF...", { id: TOAST_ID });
  try {
    const pdfBase64 = await htmlToPDFBase64(html, filename, orientation);
    toast.loading("Sending via WhatsApp...", { id: TOAST_ID });
    await sendViaWhatsApp(phone, pdfBase64, filename);
    toast.success("PDF sent successfully!", { id: TOAST_ID });
  } catch (error: any) {
    const msg = error?.response?.data?.message || error.message || "Failed to send via WhatsApp";
    toast.error(msg, { id: TOAST_ID });
    throw error;
  }
}
