"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { teamsApi, companiesApi, usersApi } from "../../lib/api";
import type { Team, User, Company } from "../../lib/types";
import { PageHeader, Card, CardHeader, EmptyState, ErrorState } from "../../components/ui/shared";
import { Network, Plus, Search, Edit2, Trash2, Users, Building2, X, Loader2, UserMinus, UserPlus } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

function CreateTeamModal({ onClose, onDone, userCompanyId, isSuperAdmin }: { onClose: () => void; onDone: () => void; userCompanyId: string | null; isSuperAdmin: boolean }) {
  const [name, setName] = React.useState("");
  const [companyId, setCompanyId] = React.useState("");
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (isSuperAdmin) {
      setLoadingCompanies(true);
      companiesApi
        .list({ limit: 100 })
        .then((res) => {
          setCompanies(res.data);
          if (res.data.length > 0) {
            setCompanyId(res.data[0].id);
          }
        })
        .catch((err) => console.error("Failed to load companies:", err))
        .finally(() => setLoadingCompanies(false));
    } else if (userCompanyId) {
      setCompanyId(userCompanyId);
    }
  }, [isSuperAdmin, userCompanyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Team name is required."); return; }
    if (!companyId) { setError("Please select a company."); return; }

    setLoading(true);
    setError("");

    try {
      await teamsApi.create({ name, companyId });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create team.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Create New Team</h3>
          <p className="text-xs text-text-muted mt-0.5">Define a new working group within a company.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Team Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend Team"
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          {isSuperAdmin && (
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">Select Company *</label>
              {loadingCompanies ? (
                <div className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm flex items-center text-text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading companies...
                </div>
              ) : (
                <select
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {companies.length === 0 ? (
                    <option value="">No companies found</option>
                  ) : (
                    companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
                  )}
                </select>
              )}
            </div>
          )}

          {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (isSuperAdmin && !companyId)}
              className="flex-1 h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTeamModal({ team, onClose, onDone }: { team: Team; onClose: () => void; onDone: () => void }) {
  const [name, setName] = React.useState(team.name);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Team name is required."); return; }

    setLoading(true);
    setError("");

    try {
      await teamsApi.update(team.id, { name });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update team.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray">
        <div>
          <h3 className="font-bold text-text-primary text-base">Rename Team</h3>
          <p className="text-xs text-text-muted mt-0.5">Modify the name of {team.name}.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1">Team Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-borderGray rounded-lg text-sm font-medium hover:bg-bgInput transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamDetailsModal({ teamId, onClose, onRefresh }: { teamId: string; onClose: () => void; onRefresh: () => void }) {
  const [team, setTeam] = React.useState<Team | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  
  // Member assignment state
  const [availableUsers, setAvailableUsers] = React.useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);

  const loadDetails = React.useCallback(() => {
    setLoading(true);
    teamsApi
      .get(teamId)
      .then((res) => {
        setTeam(res);
        // Load eligible users in the same company who can join this team
        return usersApi.list({ companyId: res.companyId, limit: 100 });
      })
      .then((res) => {
        // Filter out users who are already in this team
        const members = team?.users?.map((u) => u.id) || [];
        const assignable = res.data.filter((u) => u.role !== "SUPER_ADMIN" && !members.includes(u.id));
        setAvailableUsers(assignable);
        if (assignable.length > 0) {
          setSelectedUserId(assignable[0].id);
        } else {
          setSelectedUserId("");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [teamId, team?.users]);

  React.useEffect(() => {
    loadDetails();
  }, [teamId]);

  async function handleUnassignUser(userId: string) {
    if (!confirm("Remove this user from the team?")) return;
    try {
      await usersApi.update(userId, { teamId: null });
      loadDetails();
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove user.");
    }
  }

  async function handleAssignUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setAssigning(true);
    try {
      await usersApi.update(selectedUserId, { teamId });
      loadDetails();
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add member.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-borderGray pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-text-primary text-base">{loading ? "Loading Details..." : team?.name}</h3>
            {!loading && team?.company && (
              <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" /> {team.company.name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <ErrorState message={error} />}

        {loading && !team && (
          <div className="flex items-center justify-center py-10 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        )}

        {!loading && team && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Members Section */}
            <div>
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-text-muted" /> Team Members ({team.users?.length ?? 0})
              </h4>
              
              {team.users?.length === 0 ? (
                <p className="text-xs text-text-muted py-3 text-center border border-dashed border-borderGray rounded-xl bg-bgPage">
                  No members assigned to this team yet.
                </p>
              ) : (
                <div className="border border-borderGray rounded-xl divide-y divide-borderGray overflow-hidden">
                  {team.users?.map((member) => (
                    <div key={member.id} className="p-3 flex items-center justify-between bg-bgPage/30 hover:bg-bgPage/50">
                      <div>
                        <span className="text-sm font-semibold text-text-primary block">{member.name}</span>
                        <span className="text-xs text-text-muted">{member.email} • {member.role}</span>
                      </div>
                      <button
                        onClick={() => handleUnassignUser(member.id)}
                        title="Remove member"
                        className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Member Form */}
            <div className="bg-bgPage/40 p-4 border border-borderGray rounded-xl mt-2">
              <h4 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1">
                <UserPlus className="h-3.5 w-3.5 text-brand" /> Add Member to Team
              </h4>
              {availableUsers.length === 0 ? (
                <p className="text-xs text-text-muted">No other members available in the company to add.</p>
              ) : (
                <form onSubmit={handleAssignUser} className="flex gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 h-9 px-3 bg-white border border-borderGray rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={assigning}
                    className="h-9 px-4 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg flex items-center gap-1 shrink-0 disabled:opacity-60 transition-all"
                  >
                    {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [meta, setMeta] = React.useState({ total: 0, totalPages: 1 });
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedEditTeam, setSelectedEditTeam] = React.useState<Team | null>(null);
  const [selectedDetailsTeamId, setSelectedDetailsTeamId] = React.useState<string | null>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "BD_TEAM";

  const load = React.useCallback(() => {
    setLoading(true);
    teamsApi
      .list({
        companyId: isSuperAdmin ? undefined : user?.companyId || undefined,
        page,
        limit: 12,
      })
      .then((res) => {
        setTeams(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, page, isSuperAdmin]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this team? All member associations will be removed.")) return;
    try {
      await teamsApi.delete(id);
      load();
    } catch (err: any) {
      alert(err.message || "Failed to delete team.");
    }
  }

  const filtered = teams.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.company?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell title="Teams" breadcrumb={[{ label: "Teams" }]}>
      <PageHeader
        title="Teams"
        description="Organise company interns into working groups"
        action={
          canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Create Team
            </button>
          )
        }
      />

      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams..."
            className="w-full h-9 pl-9 pr-3 bg-white border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          />
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-borderGray rounded-xl p-5 space-y-3 animate-pulse">
              <div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-bgInput" /><div className="flex-1 space-y-2"><div className="h-4 bg-bgInput rounded" /><div className="h-3 bg-bgInput rounded w-2/3" /></div></div>
              <div className="h-3 bg-bgInput rounded" /><div className="h-3 bg-bgInput rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Network}
          title="No teams found"
          description="Create your first team to assign users and modular training plans."
          action={canManage ? <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover"><Plus className="h-4 w-4" /> Create Team</button> : undefined}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow duration-150">
                <div className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                          <Network className="h-5 w-5 text-brand" />
                        </div>
                        <div>
                          <button
                            onClick={() => setSelectedDetailsTeamId(t.id)}
                            className="font-bold text-text-primary text-sm hover:text-brand hover:underline text-left block leading-tight"
                          >
                            {t.name}
                          </button>
                          {t.company && (
                            <span className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3.5 w-3.5" /> {t.company.name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {canManage && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setSelectedEditTeam(t)}
                            className="p-1.5 text-text-muted hover:text-brand hover:bg-brand/5 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-borderGray flex items-center justify-between">
                    <span className="text-xs text-text-secondary flex items-center gap-1.5 font-medium">
                      <Users className="h-4 w-4 text-text-muted" /> {t._count?.users ?? 0} members
                    </span>
                    <button
                      onClick={() => setSelectedDetailsTeamId(t.id)}
                      className="text-xs text-brand hover:underline font-semibold"
                    >
                      Manage members &rarr;
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-4 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput bg-white">← Prev</button>
              <span className="h-8 px-4 text-xs flex items-center text-text-primary font-medium">{page} / {meta.totalPages}</span>
              <button disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-4 text-xs rounded-lg border border-borderGray disabled:opacity-40 hover:bg-bgInput bg-white">Next →</button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTeamModal
          userCompanyId={user?.companyId || null}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowCreateModal(false)}
          onDone={load}
        />
      )}

      {selectedEditTeam && (
        <EditTeamModal
          team={selectedEditTeam}
          onClose={() => setSelectedEditTeam(null)}
          onDone={load}
        />
      )}

      {selectedDetailsTeamId && (
        <TeamDetailsModal
          teamId={selectedDetailsTeamId}
          onClose={() => setSelectedDetailsTeamId(null)}
          onRefresh={load}
        />
      )}
    </DashboardShell>
  );
}
