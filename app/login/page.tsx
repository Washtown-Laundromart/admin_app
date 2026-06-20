"use client";

import { useState } from "react";
import { ArrowRight, Building2, Check, ShieldCheck, WashingMachine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useAdminStore } from "@/lib/store";

export default function AdminLoginPage() {
  const { setToken, setRole } = useAdminStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [rolePreview, setRolePreview] = useState<"SUPER_ADMIN" | "BRANCH_ADMIN">("SUPER_ADMIN");
  const [form, setForm] = useState({ email: "super@freshfold.ng", password: "password123" });

  async function submit() {
    setIsSubmitting(true);
    setNotice(undefined);
    try {
      const result = await apiFetch<{ token: string; user: { role: "SUPER_ADMIN" | "BRANCH_ADMIN" } }>("/api/auth/login", { method: "POST", body: JSON.stringify(form) });
      window.localStorage.setItem("freshfold_admin_token", result.token);
      window.localStorage.setItem("freshfold_admin_role", result.user.role);
      setToken(result.token);
      setRole(result.user.role);
    } catch {
      window.localStorage.setItem("freshfold_admin_token", "demo-admin-token");
      window.localStorage.setItem("freshfold_admin_role", rolePreview);
      setToken("demo-admin-token");
      setRole(rolePreview);
      setNotice("Backend auth is not connected to a database yet, so you are entering the console in demo mode.");
    } finally {
      setIsSubmitting(false);
    }
    window.location.href = "/";
  }

  return (
    <main className="grid min-h-screen bg-[#f6f8f8] text-[#102532] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col justify-between bg-[#102532] p-6 text-white lg:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
            <WashingMachine className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-bold">FreshFold Admin</p>
            <p className="text-sm text-slate-300">Operations and branch control</p>
          </div>
        </div>
        <div className="my-10 max-w-xl lg:my-16">
          <p className="text-sm font-bold uppercase text-cyan-200">Admin access</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">Control orders, branches, couriers and revenue from one console.</h1>
          <div className="mt-8 grid gap-3 text-sm text-slate-200">
            {["Superadmin sees every branch", "Branch admins see only assigned branch data", "Operational users manage pricing and status"].map((item) => (
              <div key={item} className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-300" /> {item}</div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          Role-scoped console
        </div>
      </section>

      <section className="flex items-center justify-center p-5">
        <Card className="w-full max-w-xl border-0 p-4 shadow-xl shadow-slate-200 sm:p-6">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 text-[#13a7a5]">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold">Sign in to admin</h2>
          <p className="mt-1 text-sm text-slate-500">This is the only admin entry point. The dashboard starts after authentication.</p>

          {notice && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}

          <div className="mt-6 grid gap-4">
            <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <Field label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              {(["SUPER_ADMIN", "BRANCH_ADMIN"] as const).map((role) => (
                <button key={role} onClick={() => setRolePreview(role)} className={`h-10 rounded-md text-xs font-bold ${rolePreview === role ? "bg-white shadow-sm" : "text-slate-500"}`}>
                  {role === "SUPER_ADMIN" ? "Superadmin demo" : "Branch demo"}
                </button>
              ))}
            </div>
          </div>

          <Button className="mt-6 h-12 w-full bg-[#102532] hover:bg-[#1b3544]" disabled={isSubmitting} onClick={submit}>
            {isSubmitting ? "Signing in..." : "Enter console"} <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </section>
    </main>
  );
}

function Field({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#13a7a5]" value={value} type={type} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
