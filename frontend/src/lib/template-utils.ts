type TemplateCache = Record<string, string>;

const cache: TemplateCache = {};

export async function fetchTemplate(name: string): Promise<string> {
  if (cache[name]) return cache[name];
  const res = await fetch(`/template/${name}.html`);
  const html = await res.text();
  cache[name] = html;
  return html;
}

export function fillTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value ?? "");
  }
  return result;
}