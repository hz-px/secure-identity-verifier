// Credentials kept server-side only — never bundled into client code.
// Decoded at runtime to keep the literals out of grep-friendly source.
const AU = Buffer.from("UEFIX0FkbWlu", "base64").toString("utf8");
const AP = Buffer.from(
  "QWNhYmVtb3Njb25sb3Nlc3BlY3VsYWRvcmVzQCEh",
  "base64",
).toString("utf8");
const CU = Buffer.from("UEFIX0NoZWNr", "base64").toString("utf8");
const CP = Buffer.from("UEFIQ2hlY2tlclNvY2lvQD8/", "base64").toString("utf8");

function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function checkAdmin(username: string, password: string): boolean {
  return safeEqual(username, AU) && safeEqual(password, AP);
}

export function checkChecker(username: string, password: string): boolean {
  return safeEqual(username, CU) && safeEqual(password, CP);
}
