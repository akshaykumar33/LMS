"use client";

import React, { useEffect, useState, useRef } from "react";
import { saveScormAttemptAction, getScormProgressAction } from "../actions/scorm-actions";

interface ScormPlayerProps {
  lessonId: string;
  fileUrl: string | null;
  onComplete?: () => void;
}

export function ScormPlayer({ lessonId, fileUrl, onComplete }: ScormPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [scormState, setScormState] = useState<Record<string, string>>({});
  const [log, setLog] = useState<string[]>([]);
  const stateRef = useRef<Record<string, string>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync stateRef with state so window API callbacks always see latest values
  useEffect(() => {
    stateRef.current = scormState;
  }, [scormState]);

  const addLog = (msg: string) => {
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 49),
    ]);
  };

  useEffect(() => {
    async function initSCORM() {
      setLoading(true);
      const res = await getScormProgressAction(lessonId);
      if (res.success && res.data) {
        setScormState(res.data);
        stateRef.current = res.data;
        addLog("Loaded existing SCORM progress state.");
      } else {
        setScormState({});
        stateRef.current = {};
        addLog("Initialized new SCORM session.");
      }

      // ── Bind SCORM 1.2 API ──
      (window as any).API = {
        LMSInitialize: (param: string) => {
          addLog(`LMSInitialize called with: "${param}"`);
          return "true";
        },
        LMSFinish: (param: string) => {
          addLog(`LMSFinish called. Saving progress...`);
          saveProgress();
          return "true";
        },
        LMSGetValue: (element: string) => {
          const val = stateRef.current[element] || "";
          addLog(`LMSGetValue("${element}") -> "${val}"`);
          return val;
        },
        LMSSetValue: (element: string, value: string) => {
          addLog(`LMSSetValue("${element}", "${value}")`);
          setScormState((prev) => ({ ...prev, [element]: value }));
          return "true";
        },
        LMSCommit: (param: string) => {
          addLog("LMSCommit called. Saving progress...");
          saveProgress();
          return "true";
        },
        LMSGetLastError: () => "0",
        LMSGetErrorString: () => "No error",
        LMSGetDiagnostic: () => "",
      };

      // ── Bind SCORM 2004 API ──
      (window as any).API_1484_11 = {
        Initialize: (param: string) => {
          addLog(`Initialize (SCORM 2004) called with: "${param}"`);
          return "true";
        },
        Terminate: (param: string) => {
          addLog(`Terminate (SCORM 2004) called. Saving progress...`);
          saveProgress();
          return "true";
        },
        GetValue: (element: string) => {
          const val = stateRef.current[element] || "";
          addLog(`GetValue("${element}") -> "${val}"`);
          return val;
        },
        SetValue: (element: string, value: string) => {
          addLog(`SetValue("${element}", "${value}")`);
          setScormState((prev) => ({ ...prev, [element]: value }));
          return "true";
        },
        Commit: (param: string) => {
          addLog("Commit (SCORM 2004) called. Saving progress...");
          saveProgress();
          return "true";
        },
        GetLastError: () => "0",
        GetErrorString: () => "No error",
        GetDiagnostic: () => "",
      };

      setLoading(false);
    }

    initSCORM();

    return () => {
      // Clean up APIs
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [lessonId]);

  const saveProgress = async () => {
    const currentState = stateRef.current;
    addLog("Persisting SCORM states to cloud database...");
    const res = await saveScormAttemptAction(lessonId, currentState);
    if (res.success) {
      addLog("Successfully saved SCORM states!");
      if (onComplete) {
        onComplete();
      }
    } else {
      addLog(`Failed to save SCORM states: ${res.error}`);
    }
  };

  const handleSimulateStatus = async (status: string) => {
    const nextState = {
      ...scormState,
      "cmi.core.lesson_status": status,
      "cmi.completion_status": status === "completed" ? "completed" : "incomplete",
      "cmi.core.score.raw": "100",
    };
    setScormState(nextState);
    stateRef.current = nextState;
    addLog(`Simulated status change: "${status}"`);
    await saveProgress();
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full min-h-[500px]">
      {/* SCORM Player Frame */}
      <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold text-neutral-400">Loading SCORM Module...</span>
            </div>
          </div>
        ) : null}

        {fileUrl ? (
          <iframe
            ref={iframeRef}
            src={fileUrl.endsWith(".zip") ? `/scorm-mock/index.html` : fileUrl}
            className="w-full flex-1 border-0"
            title="SCORM Standard Player"
            allowFullScreen
          />
        ) : (
          /* Simulated SCORM content viewer for testing */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white bg-gradient-to-br from-neutral-950 to-neutral-900">
            <div className="max-w-md space-y-4">
              <span className="text-5xl">📦</span>
              <h3 className="text-xl font-bold text-neutral-200">Interactive SCORM Course Sandbox</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                No external package URL is linked for this lesson. You can interact with this sandbox to test state propagation, logs, and database sync.
              </p>
              
              <div className="pt-6 flex justify-center gap-3">
                <button
                  onClick={() => handleSimulateStatus("completed")}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg transition-all shadow-lg"
                >
                  Simulate Module Completion (100% Score)
                </button>
                <button
                  onClick={() => handleSimulateStatus("passed")}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold rounded-lg transition-all shadow-lg"
                >
                  Simulate Passing SCORM Exam
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Debug Console & Variables Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* State Monitor */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 tracking-wider uppercase">SCORM Runtime State Variables</span>
            <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-sky-400 rounded">
              {scormState["cmi.core.lesson_status"] || scormState["cmi.completion_status"] || "incomplete"}
            </span>
          </div>
          
          <div className="max-h-40 overflow-y-auto text-xs divide-y divide-neutral-900 pt-2 font-mono">
            {Object.keys(scormState).length > 0 ? (
              Object.entries(scormState).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="text-neutral-500">{key}</span>
                  <span className="text-sky-400 font-bold">{val}</span>
                </div>
              ))
            ) : (
              <div className="text-neutral-600 italic py-2">No variables initialized yet.</div>
            )}
          </div>
        </div>

        {/* Runtime Logging */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
          <span className="text-xs font-bold text-neutral-400 tracking-wider uppercase block">SCORM Runtime Trace Logs</span>
          <div className="max-h-40 overflow-y-auto text-[10px] space-y-1 font-mono pt-2">
            {log.length > 0 ? (
              log.map((item, idx) => (
                <div key={idx} className="text-neutral-400 border-l-2 border-sky-500/40 pl-2 leading-relaxed">
                  {item}
                </div>
              ))
            ) : (
              <div className="text-neutral-600 italic">Logs are empty.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
