"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { eventsApi, companiesApi, type EventDetail } from "../../lib/api";
import type { Company } from "../../lib/types";
import { useAuth } from "../../lib/auth-context";
import { PageHeader, Card, CardBody, CardHeader, EmptyState, ErrorState } from "../../components/ui/shared";
import { Calendar, MapPin, Users, Plus, X, Loader2, Info, Building2, CheckCircle2, ChevronRight } from "lucide-react";
import { formatDate } from "../../lib/utils";

// ─── Event Form Modal ───────────────────────────────────────
function EventFormModal({
  onClose,
  onDone,
  isSuperAdmin,
  userCompanyId,
  eventToEdit,
}: {
  onClose: () => void;
  onDone: () => void;
  isSuperAdmin: boolean;
  userCompanyId: string | null;
  eventToEdit?: EventDetail | null;
}) {
  const formatDateForInput = (dateStr: string) => {
    const date = new Date(dateStr);
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [name, setName] = React.useState(eventToEdit?.name || "");
  const [dateTime, setDateTime] = React.useState(eventToEdit ? formatDateForInput(eventToEdit.dateTime) : "");
  const [location, setLocation] = React.useState(eventToEdit?.location || "");
  const [description, setDescription] = React.useState(eventToEdit?.description || "");
  const [audienceType, setAudienceType] = React.useState<"ALL" | "COMPANY">(eventToEdit?.audienceType || "ALL");
  const [companyId, setCompanyId] = React.useState(eventToEdit?.companyId || "");
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (audienceType === "COMPANY") {
      if (isSuperAdmin) {
        setLoadingCompanies(true);
        companiesApi
          .list({ limit: 100 })
          .then((res) => {
            setCompanies(res.data);
            if (!companyId && res.data.length > 0) {
              setCompanyId(res.data[0].id);
            }
          })
          .catch(console.error)
          .finally(() => setLoadingCompanies(false));
      } else if (userCompanyId) {
        setCompanyId(userCompanyId);
      }
    }
  }, [audienceType, isSuperAdmin, userCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Event name is required.");
    if (!dateTime) return setError("Event date and time is required.");
    if (!location.trim()) return setError("Event location is required.");
    if (!description.trim()) return setError("Event description is required.");

    setLoading(true);
    setError("");

    try {
      if (eventToEdit) {
        await eventsApi.update(eventToEdit.id, {
          name,
          dateTime: new Date(dateTime).toISOString(),
          location,
          description,
          audienceType,
          companyId: audienceType === "COMPANY" ? companyId : undefined,
        });
      } else {
        await eventsApi.create({
          name,
          dateTime: new Date(dateTime).toISOString(),
          location,
          description,
          audienceType,
          companyId: audienceType === "COMPANY" ? companyId : undefined,
        });
      }
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-borderGray pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-text-primary text-base">{eventToEdit ? "Edit Event" : "Create New Event"}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {eventToEdit ? "Modify event details below." : "Schedule a training session or cohort event."}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto pr-1 flex-1">
          <div>
            <label className="text-xs font-bold text-text-primary block mb-1 uppercase tracking-wider">Event Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midterm Evaluation Seminar"
              className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1 uppercase tracking-wider">Date & Time *</label>
              <input
                required
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1 uppercase tracking-wider">Location *</label>
              <input
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Conference Room A"
                className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-primary block mb-1 uppercase tracking-wider">Target Audience *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudienceType("ALL")}
                className={`flex-1 h-9 rounded-lg text-xs font-bold border transition-all ${
                  audienceType === "ALL"
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-text-secondary border-borderGray hover:bg-bgInput"
                }`}
              >
                All Students
              </button>
              <button
                type="button"
                onClick={() => setAudienceType("COMPANY")}
                className={`flex-1 h-9 rounded-lg text-xs font-bold border transition-all ${
                  audienceType === "COMPANY"
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-text-secondary border-borderGray hover:bg-bgInput"
                }`}
              >
                Specific Business Group
              </button>
            </div>
          </div>

          {audienceType === "COMPANY" && (
            <div>
              <label className="text-xs font-bold text-text-primary block mb-1 uppercase tracking-wider">Select Cohort / Company *</label>
              {loadingCompanies ? (
                <div className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-xs flex items-center text-text-muted font-semibold">
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading businesses...
                </div>
              ) : isSuperAdmin ? (
                <select
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {companies.length === 0 ? (
                    <option value="">No companies found</option>
                  ) : (
                    companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <div className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-xs flex items-center text-text-primary font-semibold">
                  {companies.find((c) => c.id === companyId)?.name || "Your Assigned Company"}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-text-primary block mb-1 uppercase tracking-wider">Description *</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe event details, prerequisites, or objectives..."
              className="w-full p-3 bg-bgInput border border-borderGray rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
            />
          </div>

          {error && <p className="text-xs text-danger font-bold">{error}</p>}

          <div className="flex gap-3 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 border border-borderGray rounded-lg text-xs font-bold hover:bg-bgInput transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (audienceType === "COMPANY" && !companyId)}
              className="flex-1 h-9 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Event Detail Drawer/Modal ────────────────────────────────
function EventDetailsDrawer({
  eventId,
  onClose,
  isStaff,
  canCreate,
  onEdit,
}: {
  eventId: string;
  onClose: () => void;
  isStaff: boolean;
  canCreate: boolean;
  onEdit: (event: EventDetail) => void;
}) {
  const [event, setEvent] = React.useState<EventDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    setError("");
    eventsApi
      .get(eventId)
      .then((res) => setEvent(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-borderGray flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderGray pb-3.5 shrink-0">
          <div>
            <span className="text-xs bg-brand/10 text-brand font-black px-2.5 py-1 rounded border border-brand/20 uppercase tracking-wider">
              {event?.audienceType === "ALL" ? "All Students" : "Cohort Targeted"}
            </span>
            <h3 className="font-extrabold text-text-primary text-lg mt-2">{loading ? "Loading Details..." : event?.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <ErrorState message={error} />}

        {loading && !event && (
          <div className="flex items-center justify-center py-20 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        )}

        {/* Content Body */}
        {!loading && event && (
          <div className="space-y-5 overflow-y-auto pr-1 flex-1 py-2 text-sm font-semibold text-text-secondary">
            
            {/* Meta Information Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 bg-bgPage border border-borderGray rounded-xl flex items-start gap-2.5">
                <Calendar className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-text-muted font-bold uppercase tracking-wider">Date & Time</p>
                  <p className="font-extrabold text-text-primary mt-1">{formatDate(event.dateTime)}</p>
                </div>
              </div>
              <div className="p-3.5 bg-bgPage border border-borderGray rounded-xl flex items-start gap-2.5">
                <MapPin className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-text-muted font-bold uppercase tracking-wider">Location</p>
                  <p className="font-extrabold text-text-primary mt-1">{event.location}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs text-text-muted font-black uppercase tracking-wider">About the Event</h4>
              <p className="leading-relaxed bg-bgInput/35 p-4 rounded-xl border border-borderGray italic text-text-primary font-medium">
                "{event.description}"
              </p>
            </div>

            {/* Target Audience Detail */}
            {event.audienceType === "COMPANY" && event.company && (
              <div className="flex items-center gap-2.5 p-4 border border-brand/20 bg-brand-light/35 rounded-xl">
                <Building2 className="h-5 w-5 text-brand" />
                <div>
                  <p className="text-xs text-brand font-black uppercase tracking-wide">Target Group</p>
                  <p className="font-bold text-text-primary mt-0.5">{event.company.name}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-borderGray pt-3.5 shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 bg-bgInput hover:bg-borderGray/40 text-text-secondary text-sm font-bold rounded-lg transition-colors border border-borderGray"
          >
            Close
          </button>
          {canCreate && event && (
            <button
              type="button"
              onClick={() => onEdit(event)}
              className="flex-1 h-10 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-lg transition-colors"
            >
              Edit Event
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = React.useState<EventDetail[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [eventToEdit, setEventToEdit] = React.useState<EventDetail | null>(null);

  const isStaff = React.useMemo(() => {
    return user?.role === "SUPER_ADMIN" || user?.role === "BD_TEAM" || user?.role === "MENTOR";
  }, [user]);

  const canCreate = React.useMemo(() => {
    return user?.role === "SUPER_ADMIN" || user?.role === "BD_TEAM" || user?.role === "MENTOR";
  }, [user]);

  const canEdit = React.useMemo(() => {
    return user?.role === "SUPER_ADMIN" || user?.role === "BD_TEAM" || user?.role === "MENTOR";
  }, [user]);

  const loadEvents = React.useCallback(() => {
    setLoading(true);
    setError("");
    eventsApi
      .list()
      .then((data) => setEvents(data))
      .catch((err) => setError(err.message || "Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  // Calendar Month-View States
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = React.useState(new Date().getMonth());

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Monthly Calculations
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate Cells (Always 42 cells representing 6 weeks)
  const calendarCells = React.useMemo(() => {
    const cells: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Prev Month Padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = totalDaysInPrevMonth - i;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYearVal = currentMonth === 0 ? currentYear - 1 : currentYear;
      cells.push({
        day: prevDay,
        isCurrentMonth: false,
        date: new Date(prevYearVal, prevMonthIdx, prevDay),
      });
    }

    // Current Month Days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      cells.push({
        day,
        isCurrentMonth: true,
        date: new Date(currentYear, currentMonth, day),
      });
    }

    // Next Month Padding
    const remainingCells = 42 - cells.length;
    for (let day = 1; day <= remainingCells; day++) {
      const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYearVal = currentMonth === 11 ? currentYear + 1 : currentYear;
      cells.push({
        day,
        isCurrentMonth: false,
        date: new Date(nextYearVal, nextMonthIdx, day),
      });
    }

    return cells;
  }, [currentYear, currentMonth, totalDaysInMonth, totalDaysInPrevMonth, firstDayIndex]);

  const getEventsForDay = (cellDate: Date) => {
    return events.filter((e) => {
      const eDate = new Date(e.dateTime);
      return (
        eDate.getDate() === cellDate.getDate() &&
        eDate.getMonth() === cellDate.getMonth() &&
        eDate.getFullYear() === cellDate.getFullYear()
      );
    });
  };

  return (
    <DashboardShell title="Events" breadcrumb={[{ label: "Events" }]}>
      <PageHeader
        title="Events & Seminars"
        description="View targeted training sessions, meetings, and internship events."
        action={
          canCreate ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Create new Event
            </button>
          ) : undefined
        }
      />

      {error && <ErrorState message={error} onRetry={loadEvents} />}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {/* Calendar Controller Bar */}
          <div className="bg-white border border-borderGray rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-1">
              <h3 className="text-base font-extrabold text-text-primary">
                {monthNames[currentMonth]} {currentYear}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="h-8 px-3 rounded-lg border border-borderGray text-xs font-bold hover:bg-bgInput transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(new Date().getMonth());
                  setCurrentYear(new Date().getFullYear());
                }}
                className="h-8 px-3 rounded-lg border border-borderGray text-xs font-extrabold text-brand hover:bg-brand/5 transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="h-8 px-3 rounded-lg border border-borderGray text-xs font-bold hover:bg-bgInput transition-colors"
              >
                Next
              </button>
            </div>
          </div>

          {/* Calendar Grid Container */}
          <Card className="overflow-hidden">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-borderGray bg-bgPage text-center shrink-0">
              {daysOfWeek.map((day) => (
                <div key={day} className="py-3 text-[10px] font-black text-text-muted uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 divide-x divide-y divide-borderGray bg-bgInput/20">
              {calendarCells.map((cell, idx) => {
                const dayEvents = getEventsForDay(cell.date);
                const isToday =
                  cell.date.getDate() === new Date().getDate() &&
                  cell.date.getMonth() === new Date().getMonth() &&
                  cell.date.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={idx}
                    className={`min-h-[110px] bg-white p-2.5 flex flex-col justify-between transition-colors border-t border-l border-borderGray hover:bg-bgPage/35 ${
                      cell.isCurrentMonth ? "text-text-primary" : "text-text-muted opacity-45 bg-bgInput/10"
                    }`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between shrink-0">
                      <span
                        className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-brand text-white shadow-sm ring-2 ring-brand/35 animate-pulse"
                            : "text-text-secondary"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] font-black text-brand bg-brand-light px-1.5 py-0.5 rounded">
                          {dayEvents.length} Event{dayEvents.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Events List inside Day Cell */}
                    <div className="mt-2.5 space-y-1 flex-1 overflow-y-auto max-h-[70px] scrollbar-thin">
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventId(event.id);
                          }}
                          title={event.name}
                          className="w-full text-left p-1 px-1.5 rounded bg-brand/5 hover:bg-brand/10 border border-brand/10 text-[10px] font-bold text-brand truncate block transition-all hover:scale-[0.98]"
                        >
                          {event.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <EventFormModal
          onClose={() => setShowCreateModal(false)}
          onDone={loadEvents}
          isSuperAdmin={user?.role === "SUPER_ADMIN"}
          userCompanyId={user?.companyId || null}
        />
      )}

      {/* Edit Modal */}
      {eventToEdit && (
        <EventFormModal
          eventToEdit={eventToEdit}
          onClose={() => setEventToEdit(null)}
          onDone={loadEvents}
          isSuperAdmin={user?.role === "SUPER_ADMIN"}
          userCompanyId={user?.companyId || null}
        />
      )}

      {/* Details Drawer */}
      {selectedEventId && (
        <EventDetailsDrawer
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          isStaff={isStaff}
          canCreate={canEdit}
          onEdit={(event) => {
            setSelectedEventId(null);
            setEventToEdit(event);
          }}
        />
      )}
    </DashboardShell>
  );
}
