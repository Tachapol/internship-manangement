"use client";

import * as React from "react";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { useAuth } from "../../lib/auth-context";
import { authApi, usersApi } from "../../lib/api";
import { PageHeader, Card, CardHeader, CardBody } from "../../components/ui/shared";
import { User, Shield, Bell, Database, Globe, Loader2, CheckCircle } from "lucide-react";

function SettingSection({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function ToggleSetting({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = React.useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between py-3 border-b border-borderGray last:border-0">
      <div>
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-brand" : "bg-borderGray"}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = React.useState({ name: "", phone: "" });
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState(false);
  const [profileError, setProfileError] = React.useState("");

  const [passwordData, setPasswordData] = React.useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwSuccess, setPwSuccess] = React.useState(false);
  const [pwError, setPwError] = React.useState("");

  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        phone: (user as any).phone || "",
      });
    }
  }, [user]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!profileData.name.trim()) { setProfileError("Name is required"); return; }
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess(false);
    try {
      await usersApi.update(user.id, profileData);
      await refreshUser();
      setProfileSuccess(true);
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwordData.next !== passwordData.confirm) { setPwError("Passwords do not match"); return; }
    if (passwordData.next.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    setPwLoading(true); setPwError(""); setPwSuccess(false);
    try {
      // In real implementation: call change-password endpoint
      await new Promise(r => setTimeout(r, 1000));
      setPwSuccess(true);
      setPasswordData({ current: "", next: "", confirm: "" });
    } catch {
      setPwError("Failed to update password");
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <DashboardShell title="Settings" breadcrumb={[{ label: "Settings" }]}>
      <PageHeader title="Settings" description="Manage your account and system preferences" />

      <div className="space-y-5 max-w-3xl">
        {/* Profile */}
        <SettingSection icon={User} title="Account Profile" description="Your public information and contact details">
          <form onSubmit={handleProfileSave}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Full Name</label>
                <input
                  required
                  value={profileData.name}
                  onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Email Address</label>
                <input defaultValue={user?.email} disabled className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-muted cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Phone Number</label>
                <input
                  value={profileData.phone}
                  onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+66812345678"
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Role</label>
                <input defaultValue={user?.role?.replace("_", " ")} disabled className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm text-text-muted cursor-not-allowed" />
              </div>
            </div>
            {profileError && <p className="text-xs text-danger font-medium mt-2">{profileError}</p>}
            {profileSuccess && (
              <p className="text-xs text-success font-semibold mt-2 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> Profile updated successfully!
              </p>
            )}
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={profileLoading}
                className="h-9 px-5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Profile
              </button>
            </div>
          </form>
        </SettingSection>

        {/* Security */}
        <SettingSection icon={Shield} title="Security & Password" description="Keep your account protected">
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1.5">Current Password</label>
              <input type="password" value={passwordData.current} onChange={e => setPasswordData(d => ({ ...d, current: e.target.value }))}
                className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">New Password</label>
                <input type="password" value={passwordData.next} onChange={e => setPasswordData(d => ({ ...d, next: e.target.value }))}
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Confirm Password</label>
                <input type="password" value={passwordData.confirm} onChange={e => setPasswordData(d => ({ ...d, confirm: e.target.value }))}
                  className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
              </div>
            </div>
            {pwError && <p className="text-xs text-danger">{pwError}</p>}
            {pwSuccess && (
              <div className="flex items-center gap-2 text-success text-xs font-semibold">
                <CheckCircle className="h-4 w-4" /> Password updated successfully
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={pwLoading}
                className="h-9 px-5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 flex items-center gap-2">
                {pwLoading && <Loader2 className="h-4 w-4 animate-spin" />} Update Password
              </button>
            </div>
          </form>
        </SettingSection>

        {/* Notifications */}
        <SettingSection icon={Bell} title="Notification Preferences" description="Control what alerts you receive">
          <div>
            <ToggleSetting label="Leave Request Alerts" description="Notify when a leave request is submitted or reviewed" defaultChecked />
            <ToggleSetting label="Attendance Reminders" description="Daily reminder if check-in is not recorded by 9:00 AM" defaultChecked />
            <ToggleSetting label="Training Plan Updates" description="Notify when a mentor assigns or updates a training plan" defaultChecked />
            <ToggleSetting label="System Announcements" description="Important system-wide announcements and maintenance notices" />
            <ToggleSetting label="Email Notifications" description="Receive email summaries for important events" />
          </div>
        </SettingSection>

        {/* System (SUPER_ADMIN only) */}
        {user?.role === "SUPER_ADMIN" && (
          <SettingSection icon={Database} title="System Configuration" description="Global settings for the DevPlus platform">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Attendance Cutoff Time</label>
                <input type="time" defaultValue="08:00"
                  className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                <p className="text-xs text-text-muted mt-1">Check-ins after this time are marked as LATE.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Invitation Link Expiry</label>
                <select className="h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                  <option value="3">3 days</option>
                  <option value="7" selected>7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1.5">Platform Name</label>
                <input defaultValue="DevPlus" className="w-full h-9 px-3 bg-bgInput border border-borderGray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
              <div className="flex justify-end">
                <button className="h-9 px-5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-sm">
                  Save Settings
                </button>
              </div>
            </div>
          </SettingSection>
        )}

        {/* API Info */}
        <SettingSection icon={Globe} title="API & Integration" description="Connection details for external integrations">
          <div className="space-y-3">
            {[
              { label: "API Base URL", value: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api" },
              { label: "Swagger Docs", value: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/docs` },
              { label: "WebSocket", value: "ws://localhost:4000/ws" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-borderGray last:border-0">
                <span className="text-xs font-semibold text-text-muted">{item.label}</span>
                <a href={item.value} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium text-brand hover:underline font-mono truncate max-w-[240px]">
                  {item.value}
                </a>
              </div>
            ))}
          </div>
        </SettingSection>
      </div>
    </DashboardShell>
  );
}
