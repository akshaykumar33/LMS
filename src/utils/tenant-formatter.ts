export function getShortTenantName(name: string, subdomain: string): string {
  const sub = subdomain.toLowerCase();
  if (sub === "intel") return "Intel CoE";
  if (sub === "amd") return "AMD CoE";
  if (sub === "tsmc") return "TSMC CoE";
  if (sub === "nvidia") return "Nvidia Corp";
  if (sub === "mellanox") return "Mellanox CoE";
  if (sub === "qualcomm") return "Qualcomm CoE";
  if (sub === "vt" || sub === "vti") return "Virginia Tech";
  if (sub === "wysbryx") return "Wysbryx";
  
  if (name.toLowerCase().includes("microelectronics institute")) {
    return name.replace(/microelectronics/gi, "CoE");
  }
  return name;
}
