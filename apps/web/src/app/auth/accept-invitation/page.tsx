"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { invitationsApi } from "../../../lib/api";
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Mail, User, Lock } from "lucide-react";

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { login } = useAuth();

  // Verification states
  const [verifying, setVerifying] = React.useState(true);
  const [inviteInfo, setInviteInfo] = React.useState<{
    email: string;
    role: string;
    companyName: string;
  } | null>(null);
  const [verifyError, setVerifyError] = React.useState("");

  // Form states
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Verification on mount
  React.useEffect(() => {
    if (!token) {
      setVerifyError("Invitation token is missing. Please check your email link.");
      setVerifying(false);
      return;
    }

    invitationsApi
      .verify(token)
      .then((res) => {
        setInviteInfo(res);
        // Prefill name with email prefix
        const emailPrefix = res.email.split("@")[0];
        setName(emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
      })
      .catch((err) => {
        setVerifyError(err?.message || "Invalid or expired invitation token.");
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !inviteInfo) return;

    if (!name.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      // 1. Accept the invitation (sets password/name, updates status to ACTIVE)
      await invitationsApi.accept({
        token,
        password,
        name: name.trim(),
      });

      // 2. Perform auto-login
      await login(inviteInfo.email, password);
    } catch (err: any) {
      setFormError(err?.message || "Failed to accept invitation. Please try again.");
      setSubmitting(false);
    }
  }

  // Render Left Branding Panel (consistent with LoginPage)
  const renderBranding = () => (
    <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-brand via-orange-500 to-amber-400 relative overflow-hidden flex-col items-center justify-center p-12">
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/30"
            style={{
              width: `${(i + 1) * 120}px`,
              height: `${(i + 1) * 120}px`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
      <div className="relative text-white text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto shadow-xl">
          <span className="font-bold text-white text-2xl">D+</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-3">DevPlus</h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Enterprise Internship Management System — track, mentor, and develop talent at scale.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { label: "Companies", value: "50+" },
            { label: "Interns", value: "1,200+" },
            { label: "Mentors", value: "150+" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-white/70 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Loader
  if (verifying) {
    return (
      <div className="min-h-screen bg-bgPage flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 text-brand animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-text-primary">Verifying Invitation</h3>
          <p className="text-text-muted text-sm">Please wait while we validate your secure token...</p>
        </div>
      </div>
    );
  }

  // Render Verification Error (Invalid / Expired token)
  if (verifyError) {
    return (
      <div className="min-h-screen bg-bgPage flex">
        {renderBranding()}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">D+</span>
              </div>
              <span className="font-bold text-text-primary text-xl">DevPlus</span>
            </div>

            <div className="bg-white border border-borderGray rounded-2xl p-8 shadow-sm space-y-5">
              <div className="w-14 h-14 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-text-primary">Invitation Link Invalid</h2>
                <p className="text-text-muted text-sm leading-relaxed">
                  {verifyError}
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => router.push("/auth/login")}
                  className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center"
                >
                  Return to Login
                </button>
              </div>
            </div>
            <p className="text-xs text-text-muted">
              If you believe this is an error, please contact your company supervisor or administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Sign-up/Accept Form
  return (
    <div className="min-h-screen bg-bgPage flex">
      {renderBranding()}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">D+</span>
            </div>
            <span className="font-bold text-text-primary text-xl">DevPlus</span>
          </div>

          <div className="space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success text-xs font-semibold rounded-full mb-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure Invitation Verified
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Complete Your Onboarding</h2>
            <p className="text-text-muted text-sm leading-relaxed">
              You are joining <strong className="text-text-primary">{inviteInfo?.companyName}</strong> as a{" "}
              <strong className="text-brand font-medium">
                {inviteInfo?.role.replace("_", " ").toLowerCase()}
              </strong>. Setup your account to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-danger/8 border border-danger/20 text-danger text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Read-Only Email Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-primary">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={inviteInfo?.email || ""}
                  className="w-full h-11 px-4 pl-11 bg-bgInput border border-borderGray rounded-lg text-sm text-text-muted select-none cursor-not-allowed"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
              </div>
            </div>

            {/* Editable Full Name Field */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-semibold text-text-primary">
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full h-11 px-4 pl-11 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-text-primary">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full h-11 px-4 pl-11 pr-11 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-text-primary">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full h-11 px-4 pl-11 pr-11 bg-bgInput border border-borderGray rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted h-4 w-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm mt-4"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account…
                </>
              ) : (
                "Join Organisation"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-bgPage flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 text-brand animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-text-primary">Loading</h3>
            <p className="text-text-muted text-sm">Please wait while the page loads...</p>
          </div>
        </div>
      }
    >
      <AcceptInvitationForm />
    </React.Suspense>
  );
}
