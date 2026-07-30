"use client";

import * as React from "react";
import { Loader2, Search, X, Check } from "lucide-react";
import { usersApi } from "../../lib/api";
import type { User } from "../../lib/types";

interface AssignStudentsModalProps {
  mentor: User;
  onClose: () => void;
  onDone: () => void;
}

export function AssignStudentsModal({ mentor, onClose, onDone }: AssignStudentsModalProps) {
  const [students, setStudents] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState("");

  // Map to store current selection status: studentId -> boolean
  const [selectedMap, setSelectedMap] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    async function loadStudents() {
      try {
        setLoading(true);
        // Load all students
        const res = await usersApi.list({ role: "STUDENT", limit: 200 });
        setStudents(res.data || []);

        // Initial selection map based on current assignments
        const initialMap: Record<string, boolean> = {};
        res.data.forEach((s: User) => {
          initialMap[s.id] = s.mentorId === mentor.id;
        });
        setSelectedMap(initialMap);
      } catch (err: any) {
        setError(err.message || "Failed to load students.");
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [mentor.id]);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const updates: Promise<any>[] = [];

      students.forEach((s) => {
        const wasAssigned = s.mentorId === mentor.id;
        const isNowSelected = !!selectedMap[s.id];

        if (isNowSelected && !wasAssigned) {
          // Newly assigned
          updates.push(usersApi.update(s.id, { mentorId: mentor.id }));
        } else if (!isNowSelected && wasAssigned) {
          // Unassigned
          updates.push(usersApi.update(s.id, { mentorId: null }));
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      onDone();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save student assignments.");
    } finally {
      setSaving(false);
    }
  }

  function toggleStudent(studentId: string) {
    setSelectedMap((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }

  const selectedCount = Object.values(selectedMap).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-borderGray flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-borderGray pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-text-primary text-base">Assign Students</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Select students to assign to <span className="font-bold text-text-primary">{mentor.name}</span>.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bgInput text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or email..."
            className="w-full h-9 pl-9 pr-4 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {error && <p className="text-xs text-danger font-medium shrink-0">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[200px]">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No students found.</p>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = !!selectedMap[s.id];
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStudent(s.id)}
                    className={`w-full flex items-center justify-between p-3 border rounded-xl text-left transition-colors ${
                      isSelected
                        ? "bg-brand/5 border-brand/30 hover:bg-brand/8"
                        : "bg-white border-borderGray hover:bg-bgPage/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{s.name}</p>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">{s.email}</p>
                      {s.company && (
                        <p className="text-[10px] text-brand font-bold mt-1 uppercase font-sans">
                          {s.company.name}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-brand border-brand text-white"
                          : "border-borderGray bg-bgInput"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-borderGray shrink-0">
          <p className="text-xs text-text-muted font-medium">
            Selected: <span className="font-semibold text-text-primary">{selectedCount}</span>
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 border border-borderGray rounded-lg text-sm font-semibold hover:bg-bgInput transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="h-9 px-4 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
