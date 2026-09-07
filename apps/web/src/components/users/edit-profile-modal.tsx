"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { usersApi } from "../../lib/api";
import { X, User, Phone, Mail, Shield, Loader2, CheckCircle2, AlertCircle, Settings } from "lucide-react";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const { user, refreshUser } = useAuth();

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  // Sync state whenever modal opens or user changes
  React.useEffect(() => {
    if (!open || !user) return;

    setName(user.name || "");
    setPhone((user as any).phone || "");
    setError("");
    setSuccess(false);

    // Fetch full user details to ensure phone is up to date
    setLoading(true);
    usersApi
      .get(user.id)
      .then((fullUser) => {
        if (fullUser.name) setName(fullUser.name);
        if (fullUser.phone) setPhone(fullUser.phone);
      })
      .catch((err) => {
        console.warn("Could not fetch detailed profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, user]);

  if (!open || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await usersApi.update(user.id, {
        name: name.trim(),
        phone: phone.trim() ? phone.trim() : undefined,
      });

      // Refresh global auth context so avatar/name update across the whole application immediately
      await refreshUser();
      setSuccess(true);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = user.role?.replace("_", " ") || "USER";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-borderGray animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderGray flex items-center justify-between bg-bgPage/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Edit Profile</h2>
              <p className="text-xs text-text-muted">Update your personal information</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bgInput rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Card Preview */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-3 p-3 bg-brand/5 border border-brand/15 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              {name ? name.charAt(0).toUpperCase() : user.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{name || user.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-brand/15 text-brand">
                  <Shield className="h-3 w-3" />
                  {roleLabel}
                </span>
                {user.company?.name && (
                  <span className="text-xs text-text-muted truncate">
                    • {user.company.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-2 text-danger text-xs font-medium animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-xl flex items-center gap-2 text-success text-xs font-semibold animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-text-muted" />
              Full Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              disabled={loading || saving}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full h-10 px-3 bg-bgInput border border-borderGray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-60"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-text-muted" />
              Phone Number
            </label>
            <input
              type="tel"
              disabled={loading || saving}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+66 81 234 5678"
              className="w-full h-10 px-3 bg-bgInput border border-borderGray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all disabled:opacity-60"
            />
          </div>

          {/* Email Address (Read-only) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-text-muted" />
                Email Address
              </label>
              <span className="text-[10px] text-text-muted">Primary account email</span>
            </div>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full h-10 px-3 bg-bgInput/50 border border-borderGray rounded-xl text-sm text-text-muted cursor-not-allowed select-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-borderGray">
            <Link
              href="/settings"
              onClick={onClose}
              className="text-xs font-medium text-text-muted hover:text-brand flex items-center gap-1 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Full Settings</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="h-9 px-4 border border-borderGray rounded-xl text-xs font-semibold text-text-primary hover:bg-bgInput transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="h-9 px-5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
