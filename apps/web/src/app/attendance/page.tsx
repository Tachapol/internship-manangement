"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { attendanceApi } from "../../lib/api";
import type { Attendance, AttendanceStatus } from "../../lib/types";
import { PageHeader, StatusBadge, ErrorState, EmptyState, Card, CardHeader, CardBody, KpiCard } from "../../components/ui/shared";
import { useAuth } from "../../lib/auth-context";
import { CalendarCheck, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatDate } from "../../lib/utils";

const STATUS_ICON: Record<AttendanceStatus, React.ElementType> = {
  PRESENT: CheckCircle,
  LATE: AlertCircle,
  ABSENT: XCircle,
  ON_LEAVE: Clock,
};

function AttendancePageContent() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId") || undefined;

  const [todayStatus, setTodayStatus] = React.useState<{
    hasCheckedIn: boolean; hasCheckedOut: boolean;
    checkIn: string | null; checkOut: string | null;
    status: AttendanceStatus | null;
  } | null>(null);
  const [records, setRecords] = React.useState<Attendance[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Month/Year filter
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [report, setReport] = React.useState<{ present: number; late: number; absent: number; onLeave: number; attendanceRate: number } | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    setError("");
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];
    
    const showReport = isStudent || !!studentId;

    Promise.all([
      isStudent ? attendanceApi.today() : Promise.resolve(null),
      attendanceApi.list({ startDate, endDate, page, limit: 15, studentId }),
      showReport ? attendanceApi.report({ year, month, studentId }) : Promise.resolve(null),
    ])
      .then(([today, list, rep]) => {
        if (today) setTodayStatus(today);
        setRecords(list.data);
        setMeta({ total: list.meta.total, totalPages: list.meta.totalPages });
        setReport(rep);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isStudent, year, month, page, studentId]);

  React.useEffect(() => { load(); }, [load]);

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      await attendanceApi.checkIn();
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      await attendanceApi.checkOut();
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Check-out failed");
    } finally {
      setActionLoading(false);
    }
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <DashboardShell title="Attendance" breadcrumb={[{ label: "Attendance" }]}>
      <PageHeader title="Attendance" description={isStudent ? "Your check-in/out and attendance history" : "Student attendance overview"} />

      {/* Student Check-In/Out Panel */}
      {isStudent && todayStatus && (
        <Card className="mb-5 border-brand/20 bg-gradient-to-r from-brand/5 to-transparent">
          <CardBody className="flex flex-col sm:flex-row items-center gap-5">
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary mb-0.5">Today's Attendance</p>
              <p className="text-xs text-text-muted">{mounted ? new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}</p>
              {todayStatus.hasCheckedIn && (
                <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                  <span>Check-in: <span className="font-semibold text-text-primary">{mounted && todayStatus.checkIn ? new Date(todayStatus.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</span></span>
                  {todayStatus.hasCheckedOut && <span>Check-out: <span className="font-semibold text-text-primary">{mounted && todayStatus.checkOut ? new Date(todayStatus.checkOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</span></span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {todayStatus.status && <StatusBadge status={todayStatus.status} />}
              {!todayStatus.hasCheckedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all disabled:opacity-60 shadow-sm"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                  Check In
                </button>
              ) : !todayStatus.hasCheckedOut ? (
                <button
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 h-9 px-4 bg-success text-white text-sm font-semibold rounded-lg hover:bg-success/90 transition-all disabled:opacity-60 shadow-sm"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Check Out
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle className="h-4 w-4" /> Completed
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Monthly Summary KPIs */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KpiCard label="Present" value={report.present} icon={CheckCircle} iconBg="bg-success/10" iconColor="text-success" />
          <KpiCard label="Late" value={report.late} icon={AlertCircle} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <KpiCard label="Absent" value={report.absent} icon={XCircle} iconBg="bg-danger/10" iconColor="text-danger" />
          <KpiCard label="Attendance Rate" value={`${report.attendanceRate?.toFixed(1) ?? 0}%`} icon={CalendarCheck} />
        </div>
      )}

      {/* Month Filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="h-9 px-3 bg-white border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => { setMonth(i + 1); setPage(1); }}
              className={`h-8 px-3 text-xs font-semibold rounded-lg border transition-all ${month === i + 1 ? "bg-brand text-white border-brand" : "bg-white border-borderGray text-text-muted hover:border-brand hover:text-brand"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && (
        <Card>
          <CardHeader>
            <h3 className="font-bold text-text-primary text-sm">
              Attendance Records — {MONTHS[month - 1]} {year}
            </h3>
            <span className="text-xs text-text-muted">{meta.total} records</span>
          </CardHeader>
          <div className="divide-y divide-borderGray">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center justify-between animate-pulse">
                    <div className="space-y-2"><div className="h-4 w-24 bg-bgInput rounded" /><div className="h-3 w-32 bg-bgInput rounded" /></div>
                    <div className="h-6 w-16 bg-bgInput rounded-full" />
                  </div>
                ))
              : records.length === 0
              ? <EmptyState icon={CalendarCheck} title="No records" description="No attendance data for this period." />
              : records.map(r => {
                  const Icon = STATUS_ICON[r.status];
                  return (
                    <div key={r.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-bgPage/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 shrink-0 ${r.status === "PRESENT" ? "text-success" : r.status === "LATE" ? "text-amber-500" : r.status === "ABSENT" ? "text-danger" : "text-buddy"}`} />
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{formatDate(r.date)}</p>
                          <p className="text-xs text-text-muted">
                            {r.user ? `${r.user.name} · ` : ""}
                            {r.checkIn ? `In: ${new Date(r.checkIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "No check-in"}
                            {r.checkOut ? ` · Out: ${new Date(r.checkOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  );
                })
            }
          </div>

          {meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-borderGray flex items-center justify-between">
              <p className="text-xs text-text-muted">Total {meta.total} records</p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Prev</button>
                <span className="h-8 px-3 text-xs flex items-center text-text-primary font-medium">{page} / {meta.totalPages}</span>
                <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput">Next</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </DashboardShell>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <DashboardShell title="Attendance" breadcrumb={[{ label: "Attendance" }]}>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      </DashboardShell>
    }>
      <AttendancePageContent />
    </Suspense>
  );
}
