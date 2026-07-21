"use client";

import { useState } from "react";
import { ArrowRight, Building2, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/toast-provider";
import { apiFetch, toErrorMessage, type AuthResponse } from "@/lib/api";
import { useAdminStore } from "@/lib/store";

export default function AdminLoginPage() {
  const { setToken, setRole, setBranchId } = useAdminStore();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function submit() {
    setIsSubmitting(true);
    try {
      const result = await apiFetch<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(form) });
      if (result.user.role === "CUSTOMER") throw new Error("Please use an admin account to sign in.");
      window.localStorage.setItem("freshfold_admin_token", result.token);
      window.localStorage.setItem("freshfold_admin_role", result.user.role);
      if (result.user.branchId) window.localStorage.setItem("freshfold_admin_branch_id", result.user.branchId);
      else window.localStorage.removeItem("freshfold_admin_branch_id");
      setToken(result.token);
      setRole(result.user.role);
      setBranchId(result.user.branchId ?? undefined);
      showToast({ type: "success", title: "Signed in", message: "Opening the operations console now." });
      window.location.href = "/";
    } catch (error) {
      showToast({ type: "error", title: "Could not sign you in", message: toErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f4f7fb] text-[#0b4ea2] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col justify-between bg-[#0b4ea2] p-6 text-white lg:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white p-1.5">
            <img src="/washtownlogo.png" alt="Washtownnig" className="max-h-full max-w-full object-contain" />
          </div>
          <div>
            <p className="text-xl font-bold">Washtownnig Admin</p>
            <p className="text-sm text-slate-300">Operations and branch control</p>
          </div>
        </div>
        <div className="my-10 max-w-xl lg:my-16">
          <p className="text-sm font-bold uppercase text-red-100">Admin access</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">Control orders, branches, couriers and revenue from one console.</h1>
          <div className="mt-8 grid gap-3 text-sm text-slate-200">
            {["Superadmin sees every branch", "Branch admins see only assigned branch data", "Operational users manage pricing and status"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check className="h-4 w-4 text-red-200" /> {item}</div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <ShieldCheck className="h-4 w-4 text-red-200" />
          Role-scoped console
        </div>
      </section>

      <section className="flex items-center justify-center p-5">
        <Card className="w-full max-w-xl border-0 p-4 shadow-xl shadow-slate-200 sm:p-6">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-[#df1f2d]">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold">Sign in to admin</h2>
          <p className="mt-1 text-sm text-slate-500">This is the only admin entry point. The dashboard starts after authentication.</p>

          <div className="mt-6 grid gap-4">
            <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <Field label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
          </div>

          <Button className="mt-6 h-12 w-full bg-[#0b4ea2] hover:bg-[#073b78]" disabled={isSubmitting} onClick={submit}>
            {isSubmitting ? "Signing in..." : "Enter console"} <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </section>
    </main>
  );
}

function Field({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <span className="relative mt-2 block">
        <input className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 pr-11 text-sm outline-none focus:border-[#df1f2d]" value={value} type={isPassword && showPassword ? "text" : type} onChange={(event) => onChange(event.target.value)} />
        {isPassword && (
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" onClick={() => setShowPassword((current) => !current)}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </span>
    </label>
  );
}
