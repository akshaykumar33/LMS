"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Download, 
  Loader2, 
  Users
} from "lucide-react";
import { importStudentsAction } from "../actions/student-import-actions";

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: { id: string; name: string }[];
  primaryColor?: string;
  onImportSuccess?: () => void;
}

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  rollNumber: string;
  admissionNumber: string;
  password: string;
  highestEducation: string;
  collegeInstitution: string;
  gpaCgpa: string;
  docNames: string;
  docLinks: string;
}

export function StudentImportModal({
  isOpen,
  onClose,
  batches,
  primaryColor = "#2563eb",
  onImportSuccess
}: StudentImportModalProps) {
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Result
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    errors: { row: number; email?: string; field: string; message: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        
        // Map to structured parsed rows
        const formattedRows: ParsedRow[] = jsonData.map((row) => ({
          firstName: String(row["First Name"] || row["firstName"] || row["FirstName"] || ""),
          lastName: String(row["Last Name"] || row["lastName"] || row["LastName"] || ""),
          email: String(row["Email"] || row["email"] || ""),
          rollNumber: String(row["Roll Number"] || row["rollNumber"] || row["RollNumber"] || ""),
          admissionNumber: String(row["Admission Number"] || row["admissionNumber"] || row["AdmissionNumber"] || ""),
          password: row["Password"] ? String(row["Password"]) : (row["password"] ? String(row["password"]) : ""),
          highestEducation: String(row["Highest Education"] || row["highestEducation"] || row["HighestEducation"] || ""),
          collegeInstitution: String(row["College / Institution"] || row["collegeInstitution"] || row["CollegeInstitution"] || ""),
          gpaCgpa: String(row["GPA / CGPA"] || row["gpaCgpa"] || row["GpaCgpa"] || ""),
          docNames: String(row["Document Names"] || row["docNames"] || row["DocNames"] || ""),
          docLinks: String(row["Document Links"] || row["docLinks"] || row["DocLinks"] || "")
        }));

        setParsedData(formattedRows);
        setFile(selectedFile);
        setStep(2);
        setValidationError(null);
      } catch (err) {
        console.error("Excel parse error:", err);
        setValidationError("Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv file.");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "First Name": "John",
        "Last Name": "Doe",
        "Email": "john.doe@example.com",
        "Roll Number": "1001",
        "Admission Number": "ADM2026001",
        "Password": "SecurePassword123",
        "Highest Education": "Bachelor of Technology",
        "College / Institution": "IIT Bombay",
        "GPA / CGPA": "8.5",
        "Document Names": "Marksheet, ID Proof",
        "Document Links": "https://example.com/john-marksheet.pdf, https://example.com/john-id.pdf"
      },
      {
        "First Name": "Jane",
        "Last Name": "Smith",
        "Email": "jane.smith@example.com",
        "Roll Number": "1002",
        "Admission Number": "ADM2026002",
        "Password": "JanePassword789",
        "Highest Education": "Master of Science",
        "College / Institution": "Stanford University",
        "GPA / CGPA": "3.8",
        "Document Names": "Transcript",
        "Document Links": "https://example.com/jane-transcript.pdf"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students Template");
    XLSX.writeFile(workbook, "student_onboarding_template.xlsx");
  };

  const handleImportSubmit = async () => {
    if (!selectedBatchId) {
      setValidationError("Please select a target batch first.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await importStudentsAction(selectedBatchId, parsedData);
      if (!res.success && 'error' in res) {
        setImportResult({
          success: false,
          importedCount: 0,
          errors: [{ row: 0, field: "server", message: String(res.error) }]
        });
      } else {
        setImportResult(res as { success: boolean; importedCount: number; errors: { row: number; email?: string; field: string; message: string }[] });
      }
      setStep(3);
      if (res.success && onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      setImportResult({
        success: false,
        importedCount: 0,
        errors: [{ row: 0, field: "error", message: errMsg }]
      });
      setStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background border border-border/80 shadow-2xl rounded-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border/50 bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Bulk Student Onboarding & Approval</h3>
              <p className="text-xs text-muted-foreground">Add verified students with academic history and documents directly under &quot;Approved&quot;</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {validationError && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <div className="flex-1">{validationError}</div>
              <button 
                onClick={() => setValidationError(null)} 
                className="hover:text-foreground text-rose-500/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">
                  1. Select Target Batch *
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full h-11 px-4 border border-input rounded-xl bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                >
                  <option value="">-- Choose a Batch --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
                    2. Upload Spreadsheet (.xlsx, .csv)
                  </label>
                  <button 
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Template
                  </button>
                </div>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                    dragActive 
                      ? "border-primary bg-primary/5 scale-[0.99]" 
                      : "border-border/80 hover:border-primary/50 hover:bg-secondary/10"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="p-4 rounded-full bg-secondary/50 text-muted-foreground mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Drag and drop your spreadsheet here
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports Microsoft Excel (.xlsx) and Comma-Separated Values (.csv)
                  </p>
                  <span 
                    className="px-4 py-2 text-xs font-bold rounded-xl shadow-sm text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Browse Files
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Validation */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {parsedData.length} records parsed successfully
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setStep(1);
                    setParsedData([]);
                    setFile(null);
                  }}
                  className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                  Change File
                </button>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block mb-2">
                  Preview parsed data (Columns mapped: Name, Email, Roll, Adm, Education, Docs)
                </label>
                <div className="border border-border/80 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/30 text-xs font-bold text-muted-foreground border-b border-border/50">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Roll & Adm</th>
                        <th className="px-4 py-3">Password</th>
                        <th className="px-4 py-3">Highest Edu & Inst</th>
                        <th className="px-4 py-3">GPA</th>
                        <th className="px-4 py-3">Docs</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-border/30">
                      {parsedData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-secondary/10">
                          <td className="px-4 py-2.5 font-semibold text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-medium">{row.firstName} {row.lastName}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.email}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-mono">R: {row.rollNumber}</div>
                            <div className="font-mono text-muted-foreground">A: {row.admissionNumber}</div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.password || <span className="text-destructive font-bold">Missing</span>}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold">{row.highestEducation}</div>
                            <div className="text-muted-foreground">{row.collegeInstitution}</div>
                          </td>
                          <td className="px-4 py-2.5 font-semibold">{row.gpaCgpa}</td>
                          <td className="px-4 py-2.5 max-w-[150px] truncate text-muted-foreground" title={row.docNames}>
                            {row.docNames}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedBatchId && (
                <div className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-border/40">
                  Target Batch: <span className="font-semibold text-foreground">
                    {batches.find(b => b.id === selectedBatchId)?.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Results */}
          {step === 3 && importResult && (
            <div className="space-y-6">
              {importResult.success ? (
                <div className="text-center p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h4 className="font-bold text-foreground text-lg mb-1">Import & Bulk Approval Successful!</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Successfully onboarded and approved <span className="font-bold text-emerald-500">{importResult.importedCount}</span> students.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    They are now enrolled, active, and listed under the &quot;APPROVED&quot; status filters on your Admissions console.
                  </p>
                </div>
              ) : (
                <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                    <div>
                      <h4 className="font-bold text-foreground">Import Failed</h4>
                      <p className="text-xs text-muted-foreground">Please resolve the validation errors below and try again.</p>
                    </div>
                  </div>
                  
                  <div className="border border-destructive/20 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-destructive/10 text-xs font-bold text-destructive border-b border-destructive/20">
                          <th className="px-4 py-2">Row</th>
                          <th className="px-4 py-2">Field</th>
                          <th className="px-4 py-2">Error Details</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-destructive/10">
                        {importResult.errors.map((err, idx) => (
                          <tr key={idx} className="bg-destructive/5">
                            <td className="px-4 py-2 font-bold text-muted-foreground">{err.row > 0 ? err.row : "Global"}</td>
                            <td className="px-4 py-2 font-semibold capitalize text-foreground/80">{err.field}</td>
                            <td className="px-4 py-2 text-destructive">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border/50 bg-secondary/10 flex justify-between items-center">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-background hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
          )}
          
          <div className="ml-auto flex gap-2">
            {step === 3 ? (
              <button
                onClick={() => {
                  if (importResult?.success) {
                    onClose();
                  } else {
                    setStep(2);
                  }
                }}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all duration-200"
                style={{ backgroundColor: primaryColor }}
              >
                {importResult?.success ? "Finish" : "Fix Validation Errors"}
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                {step === 2 && (
                  <button
                    disabled={isProcessing}
                    onClick={handleImportSubmit}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Start Import & Approve
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
