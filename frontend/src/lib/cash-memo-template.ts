export interface CashMemoData {
  drNo?: string;
  grNo?: string;
  date?: string;
  receivedOn?: string;
  from?: string;
  consignee?: string;
  through?: string;
  freight?: string;
  freightP?: string;
  labour?: string;
  labourP?: string;
  stationery?: string;
  stationeryP?: string;
  commission?: string;
  commissionP?: string;
  aoc?: string;
  aocP?: string;
  total?: string;
  totalP?: string;
}

let cachedTemplate: string | null = null;

export async function fetchCashMemoTemplate(): Promise<string> {
  if (cachedTemplate) return cachedTemplate;
  const res = await fetch("/template/cash_memo.html");
  const html = await res.text();
  cachedTemplate = html;
  return html;
}

export function fillCashMemoTemplate(template: string, data: CashMemoData): string {
  const defaults: CashMemoData = {
    drNo: "",
    grNo: "",
    date: "",
    receivedOn: "",
    from: "",
    consignee: "",
    through: "",
    freight: "",
    freightP: "",
    labour: "",
    labourP: "",
    stationery: "5",
    stationeryP: "00",
    commission: "",
    commissionP: "",
    aoc: "5",
    aocP: "00",
    total: "",
    totalP: "00",
  };

  const d = { ...defaults, ...data };

  return template
    .replace(/\{\{DR_NO\}\}/g, d.drNo || "")
    .replace(/\{\{GR_NO\}\}/g, d.grNo || "")
    .replace(/\{\{DATE\}\}/g, d.date || "")
    .replace(/\{\{RECEIVED_ON\}\}/g, d.receivedOn || "")
    .replace(/\{\{FROM\}\}/g, d.from || "")
    .replace(/\{\{CONSIGNEE\}\}/g, d.consignee || "")
    .replace(/\{\{THROUGH\}\}/g, d.through || "")
    .replace(/\{\{FREIGHT\}\}/g, d.freight || "")
    .replace(/\{\{FREIGHT_P\}\}/g, d.freightP || "")
    .replace(/\{\{LABOUR\}\}/g, d.labour || "")
    .replace(/\{\{LABOUR_P\}\}/g, d.labourP || "")
    .replace(/\{\{STATIONERY\}\}/g, d.stationery || "")
    .replace(/\{\{STATIONERY_P\}\}/g, d.stationeryP || "")
    .replace(/\{\{COMMISSION\}\}/g, d.commission || "")
    .replace(/\{\{COMMISSION_P\}\}/g, d.commissionP || "")
    .replace(/\{\{AOC\}\}/g, d.aoc || "")
    .replace(/\{\{AOC_P\}\}/g, d.aocP || "")
    .replace(/\{\{TOTAL\}\}/g, d.total || "")
    .replace(/\{\{TOTAL_P\}\}/g, d.totalP || "");
}
