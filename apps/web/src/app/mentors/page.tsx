"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { usersApi } from "../../lib/api";
import type { User } from "../../lib/types";
import { PageHeader, EmptyState, ErrorState, Card } from "../../components/ui/shared";
import { Users, Search, Loader2, UserCheck, ChevronRight, UserMinus, X } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { AssignStudentsModal } from "../../components/users/AssignStudentsModal";

export default function MentorsPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();

  const [mentors, setMentors] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });

  const [selectedMentor, setSelectedMentor] = React.useState<User | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    setError("");
    usersApi
      .list({ role: "MENTOR", search: search || undefined, page, limit: 12 })
      .then((res) => {
        setMentors(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, page]);

  React.useEffect(() => {
    if (currentUser?.role === "SUPER_ADMIN") {
      load();
    }
  }, [load, currentUser]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-brand animate-spin" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
    return (
      <DashboardShell title="Access Denied" breadcrumb={[{ label: "Mentors" }]}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mb-4 text-danger">
            <X className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Admin Access Required</h2>
          <p className="text-sm text-text-muted mt-1 max-w-sm">
            Only authorized system administrators can manage mentors.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const canManage = true;

  return (
    <DashboardShell title="Mentor Management" breadcrumb={[{ label: "Mentors" }]}>
      <PageHeader
        title="Mentors"
        description="Monitor supervisors, view student counts, and manage student assignments."
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search mentors..."
            className="w-full h-9 pl-9 pr-4 bg-white border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 shadow-sm"
          />
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : mentors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No mentors found"
          description={search ? "Try refining your search terms." : "No mentors are registered in the system yet."}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map((m) => {
              const studentList = m.students || [];
              const studentCount = studentList.length;

              return (
                <Card key={m.id} className="p-5 flex flex-col justify-between h-full bg-white border border-borderGray rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-text-primary text-base truncate">{m.name}</h4>
                        <p className="text-xs text-text-muted truncate">{m.email}</p>
                      </div>
                      <div className="h-9 w-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-bold uppercase shrink-0">
                        {m.name.charAt(0)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                        <span>Company</span>
                        <span className="text-text-primary truncate max-w-[150px]">
                          {m.company?.name || "Unassigned"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
                        <span>Supervising</span>
                        <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-full text-[11px] font-bold">
                          {studentCount} {studentCount === 1 ? "student" : "students"}
                        </span>
                      </div>
                    </div>

                    {/* Students list preview */}
                    <div className="pt-3 border-t border-borderGray space-y-2">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Supervised Interns</p>
                      {studentCount === 0 ? (
                        <p className="text-xs text-text-muted italic">No interns assigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                          {studentList.map((s: { id: string; name: string }) => (
                            <span key={s.id} className="text-[11px] font-medium text-text-secondary bg-bgPage px-2 py-0.5 border border-borderGray rounded-lg">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="pt-4 mt-4 border-t border-borderGray flex shrink-0">
                      <button
                        onClick={() => setSelectedMentor(m)}
                        className="w-full h-8 border border-brand text-brand hover:bg-brand/5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Assign Students
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 px-4 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput bg-white"
              >
                ← Prev
              </button>
              <span className="h-8 px-4 text-xs flex items-center text-text-primary font-medium">
                {page} / {meta.totalPages}
              </span>
              <button
                disabled={page === meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-4 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput bg-white"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {selectedMentor && (
        <AssignStudentsModal
          mentor={selectedMentor}
          onClose={() => setSelectedMentor(null)}
          onDone={load}
        />
      )}
    </DashboardShell>
  );
}
