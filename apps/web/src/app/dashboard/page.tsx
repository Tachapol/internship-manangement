"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { useAuth } from "../../lib/auth-context";
import { dashboardApi, attendanceApi, leaveRequestsApi, notificationsApi } from "../../lib/api";
import type {
  DashboardStats, SuperAdminStats, BdTeamStats, MentorStats, StudentStats, AttendanceStatus
} from "../../lib/types";
import {
  CardSkeleton, ErrorState, KpiCard, StatusBadge,
  Card, CardHeader, CardBody,
} from "../../components/ui/shared";
import {
  Building2, Users, GraduationCap, CalendarCheck, FileSpreadsheet,
  BookOpen, Bell, CheckCircle2, Clock, Award, RefreshCw,
  Plus, ChevronRight, Check, X, Activity, Sparkles, TrendingUp,
  MapPin, Calendar, AlertCircle, ArrowUpRight, CheckSquare
} from "lucide-react";
import { formatDate } from "../../lib/utils";


const formatTime = (timeStr: string | Date | null) => {
  if (!timeStr) return "--:--";
  try {
    return new Date(timeStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (e) {
    return String(timeStr);
  }
};

// ─── Shared UI Components ─────────────────────────────────────
function ProgressBar({ value, color = "bg-brand" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-bgInput rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function DonutChart({ value, size = 140 }: { value: number; size?: number }) {
  return (
    <div className="relative flex items-center justify-center animate-in fade-in duration-500" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path className="text-bgInput" stroke="currentColor" strokeWidth="3" fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <path className="text-brand" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none"
          strokeDasharray={`${value}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-text-primary">{value}%</p>
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Attendance</p>
      </div>
    </div>
  );
}

function AttendanceTrendChart({ history }: { history: StudentStats["attendanceHistory"] }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-8 w-8 text-text-muted mb-2 stroke-[1.5]" />
        <p className="text-xs text-text-muted font-medium">No recent logs to map trends</p>
      </div>
    );
  }

  // Reverse list to show oldest -> newest (left to right)
  const sorted = [...history].slice(0, 7).reverse();
  const width = 500;
  const height = 140;
  const padding = 20;

  const points = sorted.map((h, i) => {
    const x = padding + (i * (width - 2 * padding)) / (sorted.length - 1 || 1);
    let score = 20; // Default: absent/fallback
    if (h.status === "PRESENT") score = 100;
    else if (h.status === "LATE") score = 60;
    else if (h.status === "ON_LEAVE") score = 80;
    else if (h.status === "ABSENT") score = 20;
    const y = height - padding - (score * (height - 2 * padding)) / 100;
    return { x, y, ...h };
  });

  const pathD = points.reduce((acc, p, i) => {
    return acc + `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
  }, "");

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : "";

  return (
    <div className="w-full">
      <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grids */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-gray)" strokeDasharray="3,3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border-gray)" strokeDasharray="3,3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-gray)" />

        {/* Gradient fill */}
        {areaD && <path d={areaD} fill="url(#chartAreaGrad)" />}

        {/* Trend Line */}
        {pathD && <path d={pathD} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="var(--brand)" strokeWidth="2.5" className="transition-all duration-150 group-hover:scale-125" />
            <title>{`${formatDate(p.date)}: ${p.status} (${formatTime(p.checkIn)})`}</title>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] font-bold text-text-muted mt-2 px-1 uppercase tracking-wider">
        <span>{formatDate(sorted[0]?.date).split(" ")[0] + " " + formatDate(sorted[0]?.date).split(" ")[1]}</span>
        <span className="flex items-center gap-1 text-brand font-extrabold"><TrendingUp className="h-3 w-3" /> Attendance Trend</span>
        <span>{formatDate(sorted[sorted.length - 1]?.date).split(" ")[0] + " " + formatDate(sorted[sorted.length - 1]?.date).split(" ")[1]}</span>
      </div>
    </div>
  );
}

// ─── Super Admin Dashboard ────────────────────────────────────
function SuperAdminDashboard({ data, onRefresh }: { data: SuperAdminStats; onRefresh: () => void }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Companies" value={data.totalCompanies} sub="Partner organization ecosystem"
          icon={Building2} iconBg="bg-brand/10" iconColor="text-brand" />
        <KpiCard label="Active Interns"
          value={<>{data.activeStudents}<span className="text-sm font-semibold text-text-muted"> / {data.totalStudents}</span></>}
          sub="Internship status active" icon={Users} iconBg="bg-buddy/10" iconColor="text-buddy" />
        <KpiCard label="System Mentors" value={data.totalMentors} sub="Ecosystem supervisors"
          icon={GraduationCap} iconBg="bg-success/10" iconColor="text-success" />
        <KpiCard label="Total Training Plans" value={data.totalTrainingPlans} sub="Aggregated syllabus weeks"
          icon={BookOpen} iconBg="bg-blue-50" iconColor="text-blue-600" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand" />
              <h3 className="font-bold text-text-primary text-sm">System Health & Attendance</h3>
            </div>
            <span className="text-xs font-bold text-brand bg-brand-light px-2.5 py-1 rounded-full">{data.attendanceRate}% Average Check-In</span>
          </CardHeader>
          <CardBody className="flex flex-col sm:flex-row items-center justify-around gap-6 py-8">
            <DonutChart value={data.attendanceRate} size={150} />
            <div className="space-y-3 max-w-xs text-center sm:text-left">
              <h4 className="font-semibold text-sm text-text-primary">Ecosystem attendance overview</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Represents aggregated check-in performance across all companies and active interns. Maintaining an attendance rate above 80% represents healthy ecosystem activity.
              </p>
              <a href="/attendance" className="inline-flex items-center gap-1 text-xs text-brand font-bold hover:underline">
                View detailed logs <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </CardBody>
        </Card>

        {/* Quick actions & stats */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                <h3 className="font-bold text-text-primary text-sm">Quick Operations</h3>
              </div>
            </CardHeader>
            <CardBody className="p-4 space-y-2">
              <a href="/users?invite=true" className="flex items-center justify-between p-3 rounded-lg border border-borderGray hover:border-brand/40 hover:bg-brand/5 transition-all text-xs font-bold text-text-primary">
                <span className="flex items-center gap-2.5"><Users className="h-4 w-4 text-brand" /> Invite new supervisor/intern</span>
                <Plus className="h-4 w-4 text-text-muted" />
              </a>
              <a href="/companies" className="flex items-center justify-between p-3 rounded-lg border border-borderGray hover:border-brand/40 hover:bg-brand/5 transition-all text-xs font-bold text-text-primary">
                <span className="flex items-center gap-2.5"><Building2 className="h-4 w-4 text-brand" /> Add hosting company</span>
                <Plus className="h-4 w-4 text-text-muted" />
              </a>
              <a href="/audit-logs" className="flex items-center justify-between p-3 rounded-lg border border-borderGray hover:border-brand/40 hover:bg-brand/5 transition-all text-xs font-bold text-text-primary">
                <span className="flex items-center gap-2.5"><FileSpreadsheet className="h-4 w-4 text-brand" /> Inspect security audit logs</span>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </a>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-bold text-text-primary text-sm">Pending Actions</h3>
              <span className="w-5 h-5 rounded-full bg-danger/10 text-danger text-[10px] font-bold flex items-center justify-center">{data.pendingLeaves}</span>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              {data.pendingLeaves === 0 ? (
                <p className="text-xs text-text-muted text-center py-2">No pending leave requests in system</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-red-50/40 border border-danger/10 rounded-lg">
                    <FileSpreadsheet className="h-4 w-4 text-danger shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">Leave applications pending</p>
                      <p className="text-[10px] text-text-muted">Awaiting supervisor decisions</p>
                    </div>
                    <a href="/leave-requests" className="text-[10px] text-brand font-bold hover:underline">Review</a>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── BD Team Dashboard ────────────────────────────────────────
function BdTeamDashboard({ data }: { data: BdTeamStats }) {
  const approvalTotal = data.leaveStats.APPROVED + data.leaveStats.REJECTED;
  const approvalRate = approvalTotal > 0
    ? ((data.leaveStats.APPROVED / approvalTotal) * 100).toFixed(0)
    : "0";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Partnerships" value={data.companyOverview.filter(c => c.status === "ACTIVE").length} icon={Building2} iconBg="bg-brand/10" iconColor="text-brand" />
        <KpiCard label="Total Students" value={data.totalStudents} icon={Users} iconBg="bg-buddy/10" iconColor="text-buddy" />
        <KpiCard label="Total Mentors" value={data.totalMentors} icon={GraduationCap} iconBg="bg-success/10" iconColor="text-success" />
        <KpiCard label="Total Training Plans" value={data.totalTrainingPlans} icon={BookOpen} iconBg="bg-blue-50" iconColor="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader><h3 className="font-bold text-text-primary text-sm">Company Overview</h3></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-bgPage border-b border-borderGray">
                <tr>
                  {["Company", "Status", "Interns", "Mentors"].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderGray">
                {data.companyOverview.map(c => (
                  <tr key={c.companyId} className="hover:bg-bgPage/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-text-primary">{c.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-sm font-semibold text-text-secondary">{c.studentCount} students</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{c.mentorCount} mentors</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><h3 className="font-bold text-text-primary text-sm">Attendance Distribution</h3></CardHeader>
            <CardBody className="space-y-4">
              {([["PRESENT", "bg-success", data.attendanceStats.PRESENT], ["LATE", "bg-amber-400", data.attendanceStats.LATE], ["ABSENT", "bg-danger", data.attendanceStats.ABSENT], ["ON LEAVE", "bg-buddy", data.attendanceStats.ON_LEAVE]] as const).map(([label, color, val]) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5">
                    <span className="text-text-secondary">{label}</span>
                    <span className="text-text-primary">{val}%</span>
                  </div>
                  <ProgressBar value={val} color={color} />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-bold text-text-primary text-sm">Leave Approvals</h3>
              <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">{approvalRate}% Approved</span>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-success/5 border border-success/10 rounded-lg">
                  <p className="text-xs font-bold text-success">{data.leaveStats.APPROVED}</p>
                  <p className="text-[10px] text-text-muted font-semibold">APPROVED</p>
                </div>
                <div className="p-2 bg-danger/5 border border-danger/10 rounded-lg">
                  <p className="text-xs font-bold text-danger">{data.leaveStats.REJECTED}</p>
                  <p className="text-[10px] text-text-muted font-semibold">REJECTED</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><h3 className="font-bold text-text-primary text-sm">Mentor Performance</h3></CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.mentorPerformance.map(m => (
              <div key={m.mentorId} className="p-4 border border-borderGray rounded-xl bg-white shadow-sm hover:shadow transition-all space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{m.name}</p>
                    <p className="text-xs text-text-muted">{m.email}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-text-muted font-medium">Student Check-In Rate</span>
                    <span className="font-bold text-success">{m.checkInRate}%</span>
                  </div>
                  <ProgressBar value={m.checkInRate} color="bg-success" />
                </div>
                <p className="text-xs text-text-muted font-semibold">{m.studentCount} assigned interns</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Mentor Dashboard ─────────────────────────────────────────
function MentorDashboard({ data, onRefresh }: { data: MentorStats; onRefresh: () => void }) {
  const [processingLeaveId, setProcessingLeaveId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingLeaveId(id);
    setMsg(null);
    try {
      await leaveRequestsApi.approve(id, "Approved via Mentor Dashboard");
      setMsg({ text: "Leave request approved successfully!", type: "success" });
      onRefresh();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to approve leave.", type: "error" });
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingLeaveId(id);
    setMsg(null);
    try {
      await leaveRequestsApi.reject(id, "Rejected via Mentor Dashboard");
      setMsg({ text: "Leave request rejected.", type: "success" });
      onRefresh();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to reject leave.", type: "error" });
    } finally {
      setProcessingLeaveId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Assigned Interns" value={data.assignedStudents.length} icon={Users} iconBg="bg-buddy/10" iconColor="text-buddy" />
        <KpiCard label="Today's Attendance"
          value={`${data.attendanceSummary.checkedIn} / ${data.attendanceSummary.totalExpected}`}
          sub="Expected student presence today"
          icon={CalendarCheck} iconBg="bg-success/10" iconColor="text-success" />
        <KpiCard label="Training Completion" value={`${data.trainingPlanProgress.rate}%`}
          sub={`${data.trainingPlanProgress.completed} / ${data.trainingPlanProgress.total} weeks finished`}
          icon={BookOpen} iconBg="bg-brand/10" iconColor="text-brand" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand" />
              <h3 className="font-bold text-text-primary text-sm">Today's Intern Check-In Records</h3>
            </div>
            <span className="text-xs text-text-muted font-semibold bg-bgInput px-2.5 py-1 rounded-full">Cutoff: 08:00 AM</span>
          </CardHeader>
          <div className="divide-y divide-borderGray">
            {data.attendanceSummary.details.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No interns assigned or expected today</p>
            ) : (
              data.attendanceSummary.details.map(s => (
                <div key={s.studentId} className="px-5 py-3.5 flex items-center justify-between hover:bg-bgPage/50 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-text-primary">{s.studentName}</p>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> In: {s.checkInTime ? formatTime(s.checkInTime) : "--:--"}</span>
                      {s.checkOutTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Out: {formatTime(s.checkOutTime)}</span>}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-5">
          {/* Quick Approvals Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-brand" />
                <h3 className="font-bold text-text-primary text-sm">Quick Leave Approvals</h3>
              </div>
              <span className="text-xs font-bold text-brand bg-brand-light px-2.5 py-1 rounded-full">{data.pendingLeaveRequests.length} pending</span>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              {msg && (
                <div className={`p-2.5 rounded-lg border text-xs font-semibold ${msg.type === "success" ? "bg-green-50 border-success/20 text-success" : "bg-red-50 border-danger/20 text-danger"}`}>
                  {msg.text}
                </div>
              )}
              {data.pendingLeaveRequests.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">All leave applications reviewed!</p>
              ) : (
                data.pendingLeaveRequests.map(r => (
                  <div key={r.id} className="p-3 border border-borderGray bg-bgPage rounded-xl space-y-3 transition-all hover:border-brand/20">
                    <div>
                      <p className="text-xs font-extrabold text-text-primary">{r.studentName}</p>
                      <p className="text-[10px] text-text-muted font-bold mt-0.5 uppercase tracking-wide text-buddy">{r.type} LEAVE</p>
                      <p className="text-[10px] text-text-muted font-medium mt-0.5">{formatDate(r.startDate)} to {formatDate(r.endDate)}</p>
                      {r.reason && <p className="text-xs text-text-secondary italic mt-1.5 border-l-2 border-borderGray pl-2 font-medium">"{r.reason}"</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={processingLeaveId !== null}
                        className="py-1.5 rounded-lg bg-success text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-success-hover transition-colors disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={processingLeaveId !== null}
                        className="py-1.5 rounded-lg border border-danger/20 text-danger bg-red-50/40 text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h3 className="font-bold text-text-primary text-sm">Intern Syllabus Progress</h3></CardHeader>
            <CardBody className="p-4 space-y-3.5">
              {data.assignedStudents.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-2">No assigned interns</p>
              ) : (
                data.assignedStudents.map(s => (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-text-secondary truncate max-w-[150px]">{s.name}</span>
                      <span className="text-brand font-black">{s.trainingProgress}%</span>
                    </div>
                    <ProgressBar value={s.trainingProgress} />
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Student Dashboard ────────────────────────────────────────
function StudentDashboard({ data, onRefresh }: { data: StudentStats; onRefresh: () => void }) {
  const [todayAttendance, setTodayAttendance] = React.useState<{
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    checkIn: string | null;
    checkOut: string | null;
    status: AttendanceStatus | null;
  } | null>(null);
  const [loadingAttendance, setLoadingAttendance] = React.useState(true);
  const [checking, setChecking] = React.useState(false);
  const [attendanceMsg, setAttendanceMsg] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchTodayStatus = React.useCallback(() => {
    setLoadingAttendance(true);
    attendanceApi.today()
      .then((status) => {
        setTodayAttendance(status);
      })
      .catch(() => { })
      .finally(() => setLoadingAttendance(false));
  }, []);

  React.useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  const handleCheckIn = async () => {
    setChecking(true);
    setAttendanceMsg(null);
    try {
      await attendanceApi.checkIn({ checkInLocation: "Developer Workspace" });
      setAttendanceMsg({ text: "Clocked in successfully!", type: "success" });
      fetchTodayStatus();
      onRefresh();
    } catch (err: any) {
      setAttendanceMsg({ text: err?.message || "Failed to clock in.", type: "error" });
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    setAttendanceMsg(null);
    try {
      await attendanceApi.checkOut({ checkOutLocation: "Developer Workspace" });
      setAttendanceMsg({ text: "Clocked out successfully!", type: "success" });
      fetchTodayStatus();
      onRefresh();
    } catch (err: any) {
      setAttendanceMsg({ text: err?.message || "Failed to clock out.", type: "error" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Days Present" value={<span className="text-success">{data.attendanceSummary.PRESENT}</span>} icon={CheckCircle2} iconBg="bg-success/10" iconColor="text-success" />
        <KpiCard label="Days Late" value={<span className="text-amber-500">{data.attendanceSummary.LATE}</span>} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500" />
        <KpiCard label="Leaves Taken" value={<span className="text-buddy">{data.attendanceSummary.ON_LEAVE}</span>} icon={CalendarCheck} iconBg="bg-buddy/10" iconColor="text-buddy" />
        <KpiCard label="Syllabus Progress" value={`${data.trainingPlanProgress.completed} / ${data.trainingPlanProgress.total}`} sub={`${data.trainingPlanProgress.rate}% Completed`} icon={BookOpen} iconBg="bg-brand/10" iconColor="text-brand" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Quick Attendance Widget */}
          <Card className="relative overflow-hidden border-brand/20 shadow-[0_4px_20px_rgba(255,140,55,0.08)] bg-gradient-to-br from-white to-brand-light/20">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand to-brand-hover" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand animate-pulse" />
                <h3 className="font-extrabold text-text-primary text-sm">Quick Attendance Panel</h3>
              </div>
              <span className="text-xs font-bold text-brand bg-brand-light px-2.5 py-1 rounded-full uppercase tracking-wider">{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
            </CardHeader>
            <CardBody className="p-6">
              {attendanceMsg && (
                <div className={`p-3 rounded-lg border text-xs font-bold mb-4 flex items-center gap-2 ${attendanceMsg.type === "success" ? "bg-green-50 border-success/20 text-success" : "bg-red-50 border-danger/20 text-danger"}`}>
                  <AlertCircle className="h-4 w-4 shrink-0" /> {attendanceMsg.text}
                </div>
              )}

              {loadingAttendance ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <RefreshCw className="h-5 w-5 text-brand animate-spin mb-1" />
                  <p className="text-xs text-text-muted font-bold uppercase">Resolving clock status...</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Today's Status:</span>
                      {todayAttendance ? <StatusBadge status={todayAttendance.status || "ABSENT"} /> : <StatusBadge status="ABSENT" />}
                    </div>
                    <div className="text-xs text-text-secondary space-y-1 font-medium">
                      <p className="flex items-center gap-1.5 justify-center md:justify-start"><Clock className="h-3.5 w-3.5 text-text-muted" /> In-Time: <span className="font-bold text-text-primary">{todayAttendance?.checkIn ? formatTime(todayAttendance.checkIn) : "--:--"}</span></p>
                      <p className="flex items-center gap-1.5 justify-center md:justify-start"><Clock className="h-3.5 w-3.5 text-text-muted" /> Out-Time: <span className="font-bold text-text-primary">{todayAttendance?.checkOut ? formatTime(todayAttendance.checkOut) : "--:--"}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCheckIn}
                      disabled={checking || todayAttendance?.hasCheckedIn}
                      className="px-6 py-2.5 rounded-xl bg-success text-white text-xs font-bold flex items-center gap-1.5 hover:bg-success-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md"
                    >
                      <Check className="h-4 w-4" /> Check In
                    </button>
                    <button
                      onClick={handleCheckOut}
                      disabled={checking || !todayAttendance?.hasCheckedIn || todayAttendance?.hasCheckedOut}
                      className="px-6 py-2.5 rounded-xl bg-brand text-white text-xs font-bold flex items-center gap-1.5 hover:bg-brand-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md"
                    >
                      <CheckSquare className="h-4 w-4" /> Check Out
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Attendance Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" />
                <h3 className="font-bold text-text-primary text-sm">Attendance History Trend</h3>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <AttendanceTrendChart history={data.attendanceHistory} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          {/* Syllabus checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand" />
                <h3 className="font-bold text-text-primary text-sm">Training Syllabus</h3>
              </div>
              <span className="text-xs font-bold text-brand bg-brand-light px-2.5 py-1 rounded-full">{data.trainingPlanProgress.rate}% Completed</span>
            </CardHeader>
            <CardBody className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
              {data.trainingPlanProgress.plans.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No training plans assigned</p>
              ) : (
                data.trainingPlanProgress.plans.map(p => (
                  <div key={p.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-bgPage transition-colors">
                    <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${p.status === "COMPLETED" ? "text-success" : "text-borderGray"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${p.status === "COMPLETED" ? "text-text-muted line-through" : "text-text-primary"}`}>
                        Week {p.week}: {p.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-text-muted uppercase tracking-wide">
                        <span>{p.status}</span>
                        {p.dueDate && <span>· Due: {formatDate(p.dueDate)}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Notifications Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand" />
                <h3 className="font-bold text-text-primary text-sm">Notifications</h3>
              </div>
            </CardHeader>
            <CardBody className="p-4 space-y-2.5">
              {data.recentNotifications.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No unread notifications</p>
              ) : (
                data.recentNotifications.map(n => (
                  <div key={n.id} className="flex gap-2.5 p-2.5 bg-bgPage rounded-xl border border-borderGray hover:border-brand/20 transition-all">
                    <Bell className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                    <p className="text-xs text-text-primary font-semibold flex-1 leading-snug">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5 animate-pulse" />}
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  const loadStats = React.useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    dashboardApi
      .stats()
      .then((data) => {
        setStats(data);
      })
      .catch((err: any) => {
        setError(err?.message || "Failed to load dashboard stats.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Show nothing while auth is resolving
  if (authLoading || (!authLoading && !user)) return null;

  const greetingRole = user?.role?.replace("_", " ") ?? "User";
  const hour = new Date().getHours();
  const greeting = mounted ? (hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening") : "day";
  const dateStr = mounted
    ? new Date().toLocaleDateString("en-GB", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })
    : "";

  return (
    <DashboardShell title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-text-primary">
            Good {greeting}, {user?.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-xs text-text-muted font-semibold mt-0.5 uppercase tracking-wider">
            {greetingRole} view · {dateStr}
          </p>
        </div>
        <button
          onClick={loadStats}
          title="Refresh Stats"
          className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors mt-0.5"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2].map(i => <CardSkeleton key={i} />)}
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <ErrorState title="Failed to load dashboard" message={error} onRetry={loadStats} />
      )}

      {/* Dashboard content */}
      {!loading && stats && (
        <>
          {stats.role === "SUPER_ADMIN" && <SuperAdminDashboard data={stats as SuperAdminStats} onRefresh={loadStats} />}
          {stats.role === "BD_TEAM" && <BdTeamDashboard data={stats as BdTeamStats} />}
          {stats.role === "MENTOR" && <MentorDashboard data={stats as MentorStats} onRefresh={loadStats} />}
          {stats.role === "STUDENT" && <StudentDashboard data={stats as StudentStats} onRefresh={loadStats} />}
        </>
      )}
    </DashboardShell>
  );
}
