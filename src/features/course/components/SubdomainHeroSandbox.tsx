"use client";

import React, { useState } from "react";
import { Cpu, HelpCircle, Activity, ShieldAlert } from "lucide-react";

export function SubdomainHeroSandbox() {
  const [activeLayer, setActiveLayer] = useState<string>("gate");

  const layers: Record<string, { title: string; desc: string; stats: string }> = {
    gate: {
      title: "Polysilicon Gate",
      desc: "Controls the electrostatic inversion channel. Made of ultra-thin high-k metal silicate on sub-10nm FinFET nodes.",
      stats: "Channel Width: 7nm | Gate Voltage: 0.75V"
    },
    diffusion: {
      title: "Active N+ Diffusion",
      desc: "Doped semiconductor region acting as source and drain. Injects carrier electrons into the electrostatic channel.",
      stats: "Doping concentration: 1e20 cm⁻³"
    },
    contacts: {
      title: "Metal 1 Interconnects",
      desc: "Copper/Tungsten vias routing output signals to high-level logic gates and global VDD power networks.",
      stats: "Contact Resistance: <1.5 Ω/sq"
    },
    nwell: {
      title: "Deep N-Well Isolation",
      desc: "Substrate isolation barrier ensuring PMOS transistors remain electrically isolated from adjacent NMOS structures.",
      stats: "Well Depth: 1.2µm | Substrate Bias: 0.0V"
    }
  };

  return (
    <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between h-full space-y-6">
      {/* Background radial highlight */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded font-mono uppercase border border-primary/20">
            Interactive EDA Lab Preview
          </span>
          <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live CAD Sandbox
          </span>
        </div>
        <h3 className="text-sm font-black text-foreground">Interactive Transistor Layout</h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
          Hover or click on the layout layers to inspect design rule constraints (DRC) and physical parameters.
        </p>
      </div>

      {/* Vector Transistor CAD Simulation View */}
      <div className="bg-slate-950/80 border border-border/80 rounded-2xl p-5 flex flex-col items-center justify-center relative min-h-[160px]">
        {/* SVG Drawing layout */}
        <svg viewBox="0 0 200 120" className="w-full max-w-[200px] h-auto select-none">
          {/* N-Well Substrate layer */}
          <rect 
            x="10" y="20" width="180" height="90" rx="6" 
            className={`fill-purple-600/10 stroke-purple-500/20 stroke-1 cursor-pointer transition-all ${activeLayer === "nwell" ? "fill-purple-500/25 stroke-purple-400/80 stroke-2" : ""}`}
            onMouseEnter={() => setActiveLayer("nwell")}
          />
          
          {/* Active Diffusion (source/drain) */}
          <rect 
            x="20" y="45" width="55" height="40" rx="3" 
            className={`fill-sky-500/20 stroke-sky-500/30 stroke-1 cursor-pointer transition-all ${activeLayer === "diffusion" ? "fill-sky-500/40 stroke-sky-400/80 stroke-2" : ""}`}
            onMouseEnter={() => setActiveLayer("diffusion")}
          />
          <rect 
            x="125" y="45" width="55" height="40" rx="3" 
            className={`fill-sky-500/20 stroke-sky-500/30 stroke-1 cursor-pointer transition-all ${activeLayer === "diffusion" ? "fill-sky-500/40 stroke-sky-400/80 stroke-2" : ""}`}
            onMouseEnter={() => setActiveLayer("diffusion")}
          />

          {/* Poly Gate (crosses channel) */}
          <rect 
            x="85" y="10" width="30" height="100" rx="4" 
            className={`fill-amber-500/25 stroke-amber-500/40 stroke-1 cursor-pointer transition-all ${activeLayer === "gate" ? "fill-amber-500/45 stroke-amber-400/80 stroke-2" : ""}`}
            onMouseEnter={() => setActiveLayer("gate")}
          />

          {/* Metal Contacts (vias) */}
          <circle 
            cx="47" cy="65" r="7" 
            className={`fill-teal-500/30 stroke-teal-500/50 stroke-1 cursor-pointer transition-all ${activeLayer === "contacts" ? "fill-teal-500/55 stroke-teal-400/80 stroke-2" : ""}`}
            onMouseEnter={() => setActiveLayer("contacts")}
          />
          <circle 
            cx="152" cy="65" r="7" 
            className={`fill-teal-500/30 stroke-teal-500/50 stroke-1 cursor-pointer transition-all ${activeLayer === "contacts" ? "fill-teal-500/55 stroke-teal-400/80 stroke-2" : ""}`}
            onMouseEnter={() => setActiveLayer("contacts")}
          />
          <circle 
            cx="100" cy="25" r="5" 
            className={`fill-teal-500/30 stroke-teal-500/50 stroke-1 cursor-pointer transition-all ${activeLayer === "contacts" ? "fill-teal-500/55 stroke-teal-400/80 stroke-2" : ""}`}
            onMouseEnter={() => setActiveLayer("contacts")}
          />
        </svg>

        <span className="absolute bottom-2 right-3 text-[8px] font-mono text-muted-foreground/60 select-none">
          Transistor Cross-Section View
        </span>
      </div>

      {/* Dynamic Inspector Output */}
      <div className="bg-secondary/20 p-4 rounded-2xl border border-border/40 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          <Activity className="w-3 h-3 text-primary animate-pulse" /> Layer: <span className="text-foreground">{layers[activeLayer].title}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed font-semibold">
          {layers[activeLayer].desc}
        </p>
        <div className="text-[9px] font-mono text-foreground/80 pt-1.5 border-t border-border/20 font-bold">
          {layers[activeLayer].stats}
        </div>
      </div>
    </div>
  );
}
