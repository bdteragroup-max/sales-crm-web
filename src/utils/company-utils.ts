export function extractCompanyCode(qtNumber: string): string {
  const companyMap: Record<string, string> = {
    T: "TP",
    G: "TG",
    E: "TE",
  };
  const parts = qtNumber.split("-");
  const char = parts[2]?.[0]?.toUpperCase() ?? "";
  return companyMap[char] ?? "TP"; // fallback TP
}
