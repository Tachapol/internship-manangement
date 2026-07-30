"use client";

import * as React from "react";
import { Loader2, Upload, AlertCircle, CheckCircle2, XCircle, Info, Download } from "lucide-react";
import { usersApi, companiesApi } from "../../lib/api";
import * as XLSX from "xlsx";

interface ParsedUserRow {
  email: string;
  role: string;
  companyNameOrId: string;
  mentorEmail?: string;
  resolvedCompanyId?: string;
  resolvedMentorId?: string;
  status: "valid" | "invalid";
  validationError?: string;
  importStatus: "idle" | "loading" | "success" | "error";
  importError?: string;
}

export function ImportUsersModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [companies, setCompanies] = React.useState<{ id: string; name: string }[]>([]);
  const [mentors, setMentors] = React.useState<{ id: string; email: string }[]>([]);
  const [loadingMetadata, setLoadingMetadata] = React.useState(true);
  const [parsedRows, setParsedRows] = React.useState<ParsedUserRow[]>([]);
  const [globalError, setGlobalError] = React.useState("");

  // Load companies and mentors to resolve names/emails to IDs
  React.useEffect(() => {
    async function loadMetadata() {
      try {
        const [companiesRes, mentorsRes] = await Promise.all([
          companiesApi.list({ limit: 100 }),
          usersApi.list({ role: "MENTOR", limit: 100 }).catch(() => ({ data: [] })),
        ]);
        setCompanies(companiesRes.data || []);
        setMentors(mentorsRes.data || []);
      } catch (err) {
        console.error("Failed to load metadata for user import:", err);
        setGlobalError("Failed to fetch companies/mentors metadata. Importing might have validation limits.");
      } finally {
        setLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, []);

  // Download template helper
  const handleDownloadTemplate = () => {
    const headers = [["Email", "Role", "Company", "Mentor Email"]];
    const sampleData = [
      ["student1@example.com", "STUDENT", companies[0]?.name || "Acme Corp", mentors[0]?.email || "mentor@example.com"],
      ["mentor2@example.com", "MENTOR", companies[0]?.name || "Acme Corp", ""],
      ["bd_member@example.com", "BD_TEAM", companies[0]?.name || "Acme Corp", ""]
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "devplus_user_import_template.xlsx");
  };

  // Helper to split CSV row correctly taking into account quotes
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let insideQuote = false;
    let entry = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        result.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setGlobalError("");
    setParsedRows([]);

    const reader = new FileReader();
    const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls");

    reader.onload = (event) => {
      try {
        let rawData: any[][] = [];

        if (isExcel) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        } else {
          // CSV File
          const text = event.target?.result as string;
          const lines = text.split(/\r?\n/);
          rawData = lines
            .map((line) => parseCSVLine(line))
            .filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
        }

        if (rawData.length <= 1) {
          throw new Error("The file is empty or only contains headers.");
        }

        const headers = rawData[0].map((h) => String(h).trim().toLowerCase());
        const emailIndex = headers.indexOf("email");
        const roleIndex = headers.indexOf("role");
        const companyIndex = headers.indexOf("company");
        const mentorEmailIndex = headers.indexOf("mentor email");

        if (emailIndex === -1 || roleIndex === -1 || companyIndex === -1) {
          throw new Error("Missing required columns. Ensure headers include: 'Email', 'Role', and 'Company'");
        }

        const rowsToValidate: ParsedUserRow[] = rawData.slice(1).map((row, index) => {
          const email = String(row[emailIndex] || "").trim();
          const roleRaw = String(row[roleIndex] || "").trim().toUpperCase();
          const companyRaw = String(row[companyIndex] || "").trim();
          const mentorEmail = mentorEmailIndex !== -1 ? String(row[mentorEmailIndex] || "").trim() : "";

          // Skip completely empty rows
          if (!email && !roleRaw && !companyRaw) return null;

          let status: "valid" | "invalid" = "valid";
          let validationError = "";

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!email) {
            status = "invalid";
            validationError = "Email is required";
          } else if (!emailRegex.test(email)) {
            status = "invalid";
            validationError = "Invalid email format";
          }

          // Role validation
          const validRoles = ["STUDENT", "MENTOR", "BD_TEAM"];
          if (status === "valid" && !validRoles.includes(roleRaw)) {
            status = "invalid";
            validationError = `Invalid Role (Must be STUDENT, MENTOR, or BD_TEAM)`;
          }

          // Company resolution
          let resolvedCompanyId = "";
          if (status === "valid") {
            const foundCompany = companies.find(
              (c) =>
                c.id.toLowerCase() === companyRaw.toLowerCase() ||
                c.name.toLowerCase() === companyRaw.toLowerCase()
            );
            if (foundCompany) {
              resolvedCompanyId = foundCompany.id;
            } else {
              status = "invalid";
              validationError = `Company "${companyRaw}" not found`;
            }
          }

          // Mentor resolution (optional)
          let resolvedMentorId = "";
          if (status === "valid" && mentorEmail && roleRaw === "STUDENT") {
            const foundMentor = mentors.find(
              (m) => m.email.toLowerCase() === mentorEmail.toLowerCase()
            );
            if (foundMentor) {
              resolvedMentorId = foundMentor.id;
            } else {
              // We can make this a warning, but let's make it invalid to avoid bad mappings
              status = "invalid";
              validationError = `Mentor with email "${mentorEmail}" not found`;
            }
          }

          return {
            email,
            role: roleRaw,
            companyNameOrId: companyRaw,
            mentorEmail: mentorEmail || undefined,
            resolvedCompanyId,
            resolvedMentorId: resolvedMentorId || undefined,
            status,
            validationError,
            importStatus: "idle",
          };
        }).filter(Boolean) as ParsedUserRow[];

        setParsedRows(rowsToValidate);
      } catch (err: any) {
        setGlobalError(err?.message || "Failed to parse file. Ensure it is a valid CSV or Excel file.");
      } finally {
        setParsing(false);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(selectedFile);
    } else {
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0 || parsedRows.some((r) => r.status === "invalid")) {
      setGlobalError("Please fix validation errors before importing.");
      return;
    }

    setImporting(true);
    setGlobalError("");

    const updatedRows = [...parsedRows];

    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      updatedRows[i] = { ...row, importStatus: "loading" };
      setParsedRows([...updatedRows]);

      try {
        await usersApi.invite({
          email: row.email,
          role: row.role,
          companyId: row.resolvedCompanyId!,
          mentorId: row.resolvedMentorId,
        });
        updatedRows[i] = { ...row, importStatus: "success" };
      } catch (err: any) {
        updatedRows[i] = {
          ...row,
          importStatus: "error",
          importError: err?.message || "Invitation failed",
        };
      }
      setParsedRows([...updatedRows]);
    }

    setImporting(false);
    onDone();
  };

  const hasInvalidRows = parsedRows.some((r) => r.status === "invalid");
  const processedCount = parsedRows.filter((r) => r.importStatus === "success" || r.importStatus === "error").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div className="flex items-center justify-between border-b border-borderGray pb-3">
          <div>
            <h3 className="font-bold text-text-primary text-base">Bulk Import Users</h3>
            <p className="text-xs text-text-muted mt-0.5">Invite multiple team members at once via CSV or Excel.</p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Download Template
          </button>
        </div>

        {loadingMetadata ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <span className="text-sm text-text-muted">Loading system metadata...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
            {/* File Upload Zone */}
            {!file && (
              <div className="border-2 border-dashed border-borderGray rounded-xl p-8 text-center hover:bg-bgInput/50 transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-text-primary">Click or drag file to upload</p>
                  <p className="text-xs text-text-muted">Supports CSV, XLSX, XLS files up to 10MB</p>
                </div>
              </div>
            )}

            {file && (
              <div className="flex items-center justify-between bg-bgInput p-3 rounded-lg border border-borderGray">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-brand/15 text-brand flex items-center justify-center font-bold text-xs">
                    {file.name.split(".").pop()?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary">{file.name}</p>
                    <p className="text-[10px] text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                {!importing && (
                  <button
                    onClick={() => {
                      setFile(null);
                      setParsedRows([]);
                      setGlobalError("");
                    }}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Change File
                  </button>
                )}
              </div>
            )}

            {/* Template Information */}
            {!file && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2.5 text-xs text-blue-800">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Expected Columns Layout:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li><strong>Email</strong>: The email address to receive the registration link.</li>
                    <li><strong>Role</strong>: Supported roles are <code className="bg-blue-100 px-1 rounded">STUDENT</code>, <code className="bg-blue-100 px-1 rounded">MENTOR</code>, or <code className="bg-blue-100 px-1 rounded">BD_TEAM</code>.</li>
                    <li><strong>Company</strong>: The name or UUID of the partner company.</li>
                    <li><strong>Mentor Email</strong> (Optional): Email of the mentor assigned to the student.</li>
                  </ul>
                </div>
              </div>
            )}

            {parsing && (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                <span className="text-xs font-medium text-text-muted">Parsing and validating file content...</span>
              </div>
            )}

            {globalError && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 flex gap-2 text-xs text-danger">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{globalError}</span>
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-text-secondary">
                  <span>Parsed {parsedRows.length} rows</span>
                  {importing && (
                    <span>Processing: {processedCount} / {parsedRows.length}</span>
                  )}
                </div>
                <div className="border border-borderGray rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-bgInput sticky top-0 border-b border-borderGray font-bold text-text-secondary">
                      <tr>
                        <th className="p-2 w-10">Row</th>
                        <th className="p-2">Email</th>
                        <th className="p-2 w-24">Role</th>
                        <th className="p-2">Company</th>
                        <th className="p-2">Mentor Email</th>
                        <th className="p-2 w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderGray">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-bgInput/20">
                          <td className="p-2 text-text-muted font-medium">{idx + 2}</td>
                          <td className="p-2 font-semibold text-text-primary">{row.email}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                              {row.role}
                            </span>
                          </td>
                          <td className="p-2 text-text-secondary">{row.companyNameOrId}</td>
                          <td className="p-2 text-text-secondary">{row.mentorEmail || "-"}</td>
                          <td className="p-2">
                            {row.importStatus !== "idle" ? (
                              <div className="flex items-center gap-1.5 font-semibold">
                                {row.importStatus === "loading" && (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                                    <span className="text-brand">Sending...</span>
                                  </>
                                )}
                                {row.importStatus === "success" && (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                    <span className="text-success">Invited</span>
                                  </>
                                )}
                                {row.importStatus === "error" && (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 text-danger" />
                                    <span className="text-danger truncate max-w-[100px]" title={row.importError}>
                                      {row.importError}
                                    </span>
                                  </>
                                )}
                              </div>
                            ) : row.status === "valid" ? (
                              <div className="flex items-center gap-1 text-success font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-danger font-semibold" title={row.validationError}>
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[120px]">{row.validationError}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-borderGray">
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            className="h-9 px-4 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {parsedRows.length > 0 && (
            <button
              type="button"
              disabled={importing || hasInvalidRows}
              onClick={handleImport}
              className="h-9 px-5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              {importing ? "Importing..." : "Confirm & Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
