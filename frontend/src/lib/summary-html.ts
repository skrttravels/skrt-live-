export function getSlipTotal(r: any): number {
  const fareDelivery = parseFloat(r.fareDelivery) || 0;
  const crossingFare = parseFloat(r.crossingFare) || 0;
  const deliveryCommission = parseFloat(r.deliveryCommission) || 0;
  const crossing = parseFloat(r.crossing) || 0;
  const labor = parseFloat(r.labor) || 0;
  return fareDelivery + crossingFare + deliveryCommission - crossing - labor;
}

export function buildSummaryPrintHtml(entries: any[], date: string): string {
  const formatDate = (ds: string) => {
    if (!ds) return "";
    const p = ds.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds;
  };
  const filledRows = entries.filter((r: any) =>
    r.truckNo || r.driverName || r.from || r.to ||
    r.transportName || r.challanNo || r.totalCount ||
    r.fareDelivery || r.crossing || r.crossingFare ||
    r.labor || r.deliveryCommission || r.credit || r.debit || r.note || r.note2
  );
  const slipsHtml = filledRows.map((r: any, idx: number) => {
    const total = getSlipTotal(r);
    return `
    <div class="slip-paper">
      <div class="slip-contacts">
        <span>Mob. 96809-92567</span><br/>
        <span>Mob. 86196-06627</span>
      </div>
      <div class="slip-tagline">All disputes subject to Bhilwara jurisdiction</div>
      <div class="slip-headers">
        <h2 class="company-title-en">SANT KANWAR RAM TRANSPORT CORP. (BHL.)</h2>
        <p class="company-address">Bhilwara - 311001 (Raj.)</p>
      </div>
      <div class="slip-subtitle-container">
        <div class="subtitle-line"></div>
        <span class="slip-subtitle">SUMMARY</span>
        <div class="subtitle-line"></div>
      </div>
      <div class="slip-metadata">
        <div class="meta-item serial">
          <span class="label">No.</span>
          <span class="colon">:</span>
          <span class="value stamped-num">${r.sno || idx + 1}</span>
        </div>
        <div class="meta-item date">
          <span class="label">Date</span>
          <span class="dotted-spacer-inline"></span>
          <span class="value written-text">${formatDate(date)}</span>
        </div>
      </div>
      <div class="slip-fields-grid">
        <div class="field-row double">
          <div class="field-col">
            <span class="field-label">Truck No.</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text">${r.truckNo || ""}</span>
          </div>
          <div class="field-col">
            <span class="field-label">Driver Name</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text">${r.driverName || ""}</span>
          </div>
        </div>
        <div class="field-row double">
          <div class="field-col">
            <span class="field-label">From</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text">${r.from || ""}</span>
          </div>
          <div class="field-col">
            <span class="field-label">To</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text">${r.to || ""}</span>
          </div>
        </div>
        <div class="field-row double">
          <div class="field-col">
            <span class="field-label">Transport Name</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text">${r.transportName || ""}</span>
          </div>
          <div class="field-col">
            <span class="field-label">Challan No.</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text">${r.challanNo || ""}</span>
          </div>
        </div>
        <div class="field-row single">
          <div class="field-col">
            <span class="field-label">Total Count</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text">${r.totalCount || ""}</span>
          </div>
        </div>
        <div class="field-row double">
          <div class="field-col">
            <span class="field-label">Fare Delivery</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text currency">${r.fareDelivery || ""}</span>
          </div>
          <div class="field-col">
            <span class="field-label">Crossing</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text currency">${r.crossing || ""}</span>
          </div>
        </div>
        <div class="field-row double">
          <div class="field-col">
            <span class="field-label">Crossing Fare</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text currency">${r.crossingFare || ""}</span>
          </div>
          <div class="field-col">
            <span class="field-label">Labor</span>
            <span class="dotted-underlines-spacer"></span>
            <span class="field-value written-text currency">${r.labor || ""}</span>
          </div>
        </div>
        <div style="padding:4px 0;width:100%;">
          <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
            <span style="white-space:nowrap;">Delivery Commission</span>
            <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
              <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">₹ ${r.deliveryCommission || ""}</span>
            </div>
          </div>
        </div>
        <div style="padding:4px 0;width:100%;">
          <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
            <span style="white-space:nowrap;">Note</span>
            <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
              <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">${r.note || "—"}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0 2px 0;">
          <div style="flex:1;height:1px;background:rgba(0,0,0,0.15);"></div>
          <span style="font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;opacity:0.5;">Adjustments</span>
          <div style="flex:1;height:1px;background:rgba(0,0,0,0.15);"></div>
        </div>
        <div style="padding:4px 0;width:100%;">
          <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
            <span style="white-space:nowrap;">Credit</span>
            <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
              <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">${r.credit ? "₹ " + r.credit : "—"}</span>
            </div>
          </div>
        </div>
        <div style="padding:4px 0;width:100%;">
          <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
            <span style="white-space:nowrap;">Debit</span>
            <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
              <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">${r.debit ? "₹ " + r.debit : "—"}</span>
            </div>
          </div>
        </div>
        <div style="padding:4px 0;width:100%;">
          <div style="display:flex;align-items:center;width:100%;gap:10px;font-size:14.5px;font-weight:700;">
            <span style="white-space:nowrap;">Note</span>
            <div style="flex:1;border-bottom:1px dotted #000;position:relative;height:24px;">
              <span style="position:absolute;left:10px;top:-2px;padding:0 4px;">${r.note2 || "—"}</span>
            </div>
          </div>
        </div>
        <div style="padding:8px 0;width:100%;border-top:1.5px solid var(--slip-ink-print);margin-top:10px;">
          <div style="display:flex;align-items:center;width:100%;justify-content:space-between;font-size:16px;font-weight:900;">
            <span style="text-transform:uppercase;letter-spacing:1px;">Grand Total</span>
            <span>${total > 0 ? "₹ " + total.toFixed(2) : "—"}</span>
          </div>
        </div>
      </div>
      <div class="slip-footer">
        <div class="signature-driver">Driver Signature</div>
        <div class="signature-company">For Sant Kanwar Ram Transport Corp. (BHL.)</div>
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Summary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind:wght@400;500;700&family=Kalam:wght@700&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --slip-paper-bg: #ffaec1;
      --slip-paper-gradient: linear-gradient(135deg, #ffb8c8 0%, #ffa3b7 100%);
      --slip-ink-print: #111e54;
      --slip-ink-write-blue: #0b22a2;
      --slip-ink-stamp: #d32f2f;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif;}
    .no-print { text-align: center; margin-bottom: 20px; }
    .no-print button { background: #111e54; color: #fff; border: none; padding: 10px 30px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; }
    .slip-paper {
      width: 600px; height: 500;
      background: var(--slip-paper-bg);
      background-image: var(--slip-paper-gradient);
      color: var(--slip-ink-print);
      border-radius: 2px;
      position: relative;
      padding: 25px 35px;
      display: flex;
      flex-direction: column;
      margin: 0 auto 30px;
    }
    .slip-contacts { font-size: 11px; font-weight: 500; margin-bottom: 1px; letter-spacing: 0.5px; text-align: right; }
    .slip-tagline { text-align: center; font-size: 11px; font-family: 'Hind', sans-serif; font-weight: 500; margin-bottom: 6px; }
    .slip-headers { text-align: center; display: flex; flex-direction: column; gap: 4px; }
    .company-title-en { font-family: 'Poppins', sans-serif; font-size: 18.5px; font-weight: 800; letter-spacing: 0.3px; }
    .company-address { font-family: 'Hind', sans-serif; font-size: 13.5px; font-weight: 500; }
    .slip-subtitle-container { display: flex; align-items: center; justify-content: center; margin: 12px 0 16px 0; }
    .subtitle-line { flex-grow: 1; height: 1.5px; background-color: var(--slip-ink-print); }
    .slip-subtitle { font-family: 'Hind', sans-serif; font-size: 17px; font-weight: 700; padding: 0 16px; letter-spacing: 1px; }
    .slip-metadata { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; font-size: 14px; }
    .meta-item { display: flex; align-items: flex-end; position: relative; }
    .meta-item.serial { font-family: 'Hind', sans-serif; font-weight: 700; }
    .meta-item.serial .colon { margin: 0 15px; font-weight: 400; }
    .meta-item.date { font-family: 'Hind', sans-serif; font-weight: 700; flex-grow: 1; max-width: 250px; justify-content: flex-end; }
    .dotted-spacer-inline { flex-grow: 1; border-bottom: 1.5px dotted var(--slip-ink-print); height: 1px; margin: 0 10px 4px 10px; opacity: 0.7; }
    .stamped-num { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: var(--slip-ink-stamp); letter-spacing: 1px; display: inline-block; transform: rotate(-3deg) scale(1.05); margin-left: 2px; text-shadow: 0.5px 0.5px 0px rgba(0,0,0,0.1); }
    .slip-fields-grid { display: flex; flex-direction: column; gap: 16px; flex-grow: 1; }
    .field-row { display: flex; gap: 24px; width: 100%; }
    .field-row.double .field-col { width: 50%; }
    .field-row.single .field-col { width: 100%; }
    .field-row.indent-more { padding-left: 15%; }
    .field-col { display: flex; position: relative; align-items: flex-end; flex-grow: 1; }
    .field-col {
        display: flex;
        align-items: center;
        flex-grow: 1;
        gap: 8px;
      }
      .field-label {
        font-family: 'Hind', sans-serif;
        font-weight: 700;
        font-size: 14.5px;
        white-space: nowrap;
        min-width: 65px;
      }
      .dotted-underlines-spacer {
        flex-grow: 1;
        border-bottom: 1.5px dotted var(--slip-ink-print);
        height: 1px;
        margin-top: 10px;
      }
      .written-text {
        position: absolute;
        left: 120px;
        bottom: 2px;
        font-family: Arial, sans-serif;
        font-size: 15px;
        font-weight: 700;
        color: #000;
        background: transparent;
        padding: 0 4px;
        max-width: 60%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    .written-text.currency:not(:empty)::before { content: "₹ "; font-size: 15px; font-family: 'Poppins', sans-serif; font-weight: 500; }
    .slip-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; margin-bottom: 10px; font-family: 'Hind', sans-serif; font-weight: 700; font-size: 14px; }
    @page { size: A4; margin: 8mm; }
    @media print {
      body { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .slip-paper { box-shadow: none; border: none; margin: 0 auto 30px; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .slip-paper:last-child { page-break-after: auto; margin-bottom: 0; }
      .stamped-num { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .written-text { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  
  ${slipsHtml}
</body>
</html>`;
}
