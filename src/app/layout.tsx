import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getTenantContext } from "@/features/auth/services/tenant";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantContext();
  const orgName = tenant?.name || "Virginia Tech LMS";
  return {
    title: {
      template: `%s | ${orgName}`,
      default: orgName,
    },
    description: `Virginia Tech - Learning Management Platform - ${orgName}`,
  };
}

interface ThemePreset {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  surface: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  borderSubtle: string;
}

const themePresets: Record<string, ThemePreset> = {
  "dark": {
    background: "#070a13",
    foreground: "#f1f5f9",
    card: "rgba(15, 23, 42, 0.5)",
    cardForeground: "#f1f5f9",
    popover: "#0c1222",
    primary: "", // falls back to tenant primary
    primaryForeground: "#ffffff",
    secondary: "#1e293b",
    secondaryForeground: "#f1f5f9",
    muted: "#1e293b",
    mutedForeground: "#94a3b8",
    accent: "#1e293b",
    accentForeground: "#f1f5f9",
    border: "rgba(255, 255, 255, 0.07)",
    input: "rgba(255, 255, 255, 0.04)",
    ring: "",
    surface: "#0b1120",
    surfaceRaised: "rgba(15, 23, 42, 0.6)",
    surfaceOverlay: "rgba(15, 23, 42, 0.85)",
    borderSubtle: "rgba(255, 255, 255, 0.04)",
  },
  "light": {
    background: "#f8fafc",
    foreground: "#0f172a",
    card: "rgba(255, 255, 255, 0.75)",
    cardForeground: "#0f172a",
    popover: "#ffffff",
    primary: "",
    primaryForeground: "#ffffff",
    secondary: "#e2e8f0",
    secondaryForeground: "#0f172a",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    accent: "#e2e8f0",
    accentForeground: "#0f172a",
    border: "rgba(15, 23, 42, 0.09)",
    input: "rgba(15, 23, 42, 0.05)",
    ring: "",
    surface: "#ffffff",
    surfaceRaised: "rgba(255, 255, 255, 0.9)",
    surfaceOverlay: "rgba(255, 255, 255, 0.95)",
    borderSubtle: "rgba(15, 23, 42, 0.05)",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getTenantContext();
  const cookieStore = await cookies();
  
  let themeMode = cookieStore.get("theme_mode")?.value;
  if (!themeMode) {
    const themeSet = cookieStore.get("theme_set")?.value;
    if (themeSet) {
      themeMode = themeSet === "dark" ? "dark" : "light";
    } else {
      themeMode = "light";
    }
  }
  
  const preset = themePresets[themeMode] || themePresets["light"];
  let tenantPrimary = tenant?.branding?.primaryColor || "#0ea5e9";
  let tenantSecondary = tenant?.branding?.secondaryColor || "#1e293b";

  // Prevent invisible or unstyled default elements if primary color is configured as black
  if (tenantPrimary === "#000000" || tenantPrimary.toLowerCase() === "black") {
    tenantPrimary = tenantSecondary !== "#000000" ? tenantSecondary : "#0ea5e9";
  }

  const primaryColor = preset.primary || tenantPrimary;
  const ringColor = preset.ring || tenantPrimary;

  const primarySvgColor = primaryColor.replace("#", "%23");
  const secondarySvgColor = tenantSecondary.replace("#", "%23");
  const gridBoxStroke = themeMode === "light" ? "rgba%2815,23,42,0.015%29" : "rgba%28255,255,255,0.015%29";

  const brandingStyles = `:root {
  --background: ${preset.background};
  --foreground: ${preset.foreground};
  --card: ${preset.card};
  --card-foreground: ${preset.cardForeground};
  --popover: ${preset.popover};
  --popover-foreground: ${preset.cardForeground};
  --primary: ${primaryColor};
  --primary-foreground: ${preset.primaryForeground};
  --secondary: ${preset.secondary};
  --secondary-foreground: ${preset.secondaryForeground};
  --muted: ${preset.muted};
  --muted-foreground: ${preset.mutedForeground};
  --accent: ${preset.accent};
  --accent-foreground: ${preset.accentForeground};
  --border: ${preset.border};
  --input: ${preset.input};
  --ring: ${ringColor};
  --surface: ${preset.surface};
  --surface-raised: ${preset.surfaceRaised};
  --surface-overlay: ${preset.surfaceOverlay};
  --border-subtle: ${preset.borderSubtle};
  --background-image-svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cpath d='M10 10h40v40H10zm0 80h40v40H10zm80-80h40v40H80zm0 80h40v40H80z' stroke='${gridBoxStroke}' stroke-width='1' fill='none'/%3E%3Cpath d='M50 30h30m50 0h30M30 50v30m0 50v30M110 50v30m0 50v30M50 110h30m50 0h30' stroke='${primarySvgColor}08' stroke-width='1'/%3E%3Ccircle cx='30' cy='30' r='2' fill='${primarySvgColor}15'/%3E%3Ccircle cx='110' cy='30' r='2' fill='${primarySvgColor}15'/%3E%3Ccircle cx='30' cy='110' r='2' fill='${primarySvgColor}15'/%3E%3Ccircle cx='110' cy='110' r='2' fill='${primarySvgColor}15'/%3E%3Ccircle cx='80' cy='80' r='3' fill='${secondarySvgColor}1a'/%3E%3Cpath d='M80 50v10m0 40v10M50 80h10m40 0h10' stroke='${secondarySvgColor}0f' stroke-width='1'/%3E%3C/svg%3E");
}`;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full ${themeMode}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandingStyles }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
