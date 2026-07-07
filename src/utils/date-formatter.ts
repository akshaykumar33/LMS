/**
 * Safely format date to YYYY-MM-DD format in UTC to avoid hydration mismatches between Server and Client locales.
 */
export function formatDate(dateInput: Date | string | number | undefined | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to standard readable string, e.g. "Jul 7, 2026"
 */
export function formatReadableDate(dateInput: Date | string | number | undefined | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const year = d.getUTCFullYear();
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  
  return `${month} ${day}, ${year}`;
}
