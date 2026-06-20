"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Bold,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Image,
  Italic,
  LayoutDashboard,
  Mail,
  PackageCheck,
  Plus,
  Route,
  Search,
  Settings,
  Truck,
  Underline,
  UserPlus,
  WashingMachine
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";
import { useAdminStore } from "@/lib/store";

const branchRevenue = [
  { branch: "Surulere", revenue: 1920000, orders: 512, pickup: 5.8, transit: 21, status: "Healthy" },
  { branch: "Yaba", revenue: 1550000, orders: 438, pickup: 6.6, transit: 24, status: "Healthy" },
  { branch: "Lekki", revenue: 1350000, orders: 334, pickup: 8.1, transit: 27, status: "Backlog" }
];

const trend = [
  { day: "Mon", orders: 142, revenue: 480000 },
  { day: "Tue", orders: 166, revenue: 580000 },
  { day: "Wed", orders: 151, revenue: 520000 },
  { day: "Thu", orders: 184, revenue: 690000 },
  { day: "Fri", orders: 221, revenue: 810000 },
  { day: "Sat", orders: 260, revenue: 970000 }
];

const lanes = [
  { title: "To be priced", tone: "bg-cyan-50 text-cyan-700", action: "Create bill", items: ["#FF-20871 David Ukap", "#FF-20875 Bola K.", "#FF-20879 Ife A."] },
  { title: "Awaiting payment", tone: "bg-amber-50 text-amber-700", action: "Payment sent", items: ["#FF-20868 Ngozi P.", "#FF-20866 Ade M."] },
  { title: "In cleaning", tone: "bg-blue-50 text-blue-700", action: "Update stage", items: ["#FF-20861 Chika E.", "#FF-20859 Sam O.", "#FF-20854 Amaka R."] },
  { title: "Ready", tone: "bg-emerald-50 text-emerald-700", action: "Dispatch", items: ["#FF-20850 Uche N.", "#FF-20847 Dapo S."] }
];

const navItems = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["orders", PackageCheck, "Orders"],
  ["branches", Building2, "Branches"],
  ["notifications", Bell, "Notifications"],
  ["logistics", Route, "Logistics"],
  ["billing", CreditCard, "Billing"],
  ["settings", Settings, "Settings"]
] as const;

export default function AdminHome() {
  const { role, setRole, token, setToken } = useAdminStore();
  const [view, setView] = useState("dashboard");
  const [range, setRange] = useState({ from: "2026-06-01", to: "2026-06-20" });

  const cards = useMemo(() => [
    ["Revenue", "NGN 4.82M", "+12%", "Collected across paid orders"],
    ["Orders", "1,284", "+6%", "New and active jobs"],
    ["Avg ticket", "NGN 3,750", "+3%", "Cleaning plus delivery"],
    ["Failed handovers", "0.7%", "-0.4%", "Courier exceptions"]
  ], []);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("freshfold_admin_token");
    const savedRole = window.localStorage.getItem("freshfold_admin_role") as "SUPER_ADMIN" | "BRANCH_ADMIN" | null;
    if (savedToken) {
      setToken(savedToken);
      if (savedRole) setRole(savedRole);
    } else {
      window.location.href = "/login";
    }
  }, [setRole, setToken]);

  function exportPdf() {
    const doc = new jsPDF();
    doc.text("FreshFold Operations Report", 16, 18);
    doc.text(`Range: ${range.from} to ${range.to}`, 16, 28);
    cards.forEach((card, index) => doc.text(`${card[0]}: ${card[1]} (${card[2]})`, 16, 42 + index * 10));
    doc.save("freshfold-operations.pdf");
  }

  async function exportCsv() {
    if (token) {
      const response = await fetch(`${API_BASE_URL}/api/admin/export.csv`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "freshfold-orders.csv";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const csv = ["branch,orders,revenue", ...branchRevenue.map((b) => `${b.branch},${b.orders},${b.revenue}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "freshfold-demo.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f6f8f8] text-[#102532] lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white lg:block">
        <div className="flex h-screen flex-col p-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#102532] p-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <WashingMachine className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">FreshFold</p>
              <p className="text-xs text-slate-300">Operations console</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Workspace</p>
            <button onClick={() => {
              const nextRole = role === "SUPER_ADMIN" ? "BRANCH_ADMIN" : "SUPER_ADMIN";
              window.localStorage.setItem("freshfold_admin_role", nextRole);
              setRole(nextRole);
            }} className="mt-2 flex w-full items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-left text-sm font-bold">
              {role === "SUPER_ADMIN" ? "Corporate HQ" : "Surulere Branch"}
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <nav className="mt-5 space-y-1">
            {navItems.map(([id, Icon, label]) => (
              <button key={id} onClick={() => setView(id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${view === id ? "bg-[#102532] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-xl bg-cyan-50 p-4">
            <p className="text-sm font-bold text-cyan-900">Courier network</p>
            <p className="mt-1 text-sm text-cyan-800">Uber, Bolt and Kwik are routed from backend adapters.</p>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[#13a7a5]">{role === "SUPER_ADMIN" ? "All branches" : "Branch workspace"}</p>
              <h1 className="text-xl font-bold sm:text-2xl">{role === "SUPER_ADMIN" ? "Corporate Overview" : "Surulere Operations"}</h1>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <div className="flex h-10 min-w-[130px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:flex-none">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search orders</span>
                <span className="sm:hidden">Search</span>
              </div>
              <DateInput value={range.from} onChange={(value) => setRange({ ...range, from: value })} />
              <DateInput value={range.to} onChange={(value) => setRange({ ...range, to: value })} />
              <Button className="bg-[#102532] px-3 hover:bg-[#1b3544]" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
              <Button className="bg-[#102532] px-3 hover:bg-[#1b3544]" onClick={exportPdf}><FileText className="h-4 w-4" /> PDF</Button>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map(([id, Icon, label]) => (
              <button key={id} onClick={() => setView(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${view === id ? "bg-[#102532] text-white" : "bg-slate-100 text-slate-600"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          {view === "dashboard" && role === "SUPER_ADMIN" && <SuperDashboard cards={cards} />}
          {view === "dashboard" && role !== "SUPER_ADMIN" && <BranchDashboard />}
          {view === "orders" && <BranchPipeline />}
          {view === "billing" && <BillingOps />}
          {view === "branches" && <BranchManagement />}
          {view === "notifications" && <NotificationsComposer />}
          {view === "logistics" && <Logistics />}
          {view === "settings" && <SettingsPanel role={role} />}
        </div>
      </section>
    </main>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-10 min-w-[142px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm sm:flex-none">
      <Calendar className="h-4 w-4 text-slate-400" />
      <input className="min-w-0 bg-transparent outline-none" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SuperDashboard({ cards }: { cards: string[][] }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, delta, helper]) => <KpiCard key={label} label={label} value={value} delta={delta} helper={helper} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="border-0 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div><h3 className="font-bold">Revenue by branch</h3><p className="text-sm text-slate-500">Paid cleaning and delivery totals</p></div>
            <BarChart3 className="h-5 w-5 text-[#13a7a5]" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchRevenue}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="branch" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#13a7a5" radius={[8, 8, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="border-0 p-5 shadow-sm">
          <h3 className="font-bold">Order trend</h3>
          <p className="text-sm text-slate-500">Daily operational volume</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" /><YAxis /><Tooltip /><Line type="monotone" dataKey="orders" stroke="#102532" strokeWidth={3} dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <BranchTable />
        <ExceptionPanel />
      </div>
    </div>
  );
}

function BranchDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Open orders" value="46" delta="+8" helper="Across today's pipeline" />
        <KpiCard label="To be priced" value="9" delta="Now" helper="Needs branch inspection" />
        <KpiCard label="Ready" value="12" delta="+4" helper="Dispatch or store pickup" />
        <KpiCard label="Avg turnaround" value="5h 20m" delta="-18m" helper="Branch processing time" />
      </div>
      <BranchPipeline />
    </div>
  );
}

function KpiCard({ label, value, delta, helper }: { label: string; value: string; delta: string; helper: string }) {
  return (
    <Card className="border-0 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{delta}</span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </Card>
  );
}

function BranchPipeline() {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {lanes.map((lane) => (
        <Card key={lane.title} className="min-h-[540px] border-0 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">{lane.title}</h3>
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${lane.tone}`}>{lane.items.length}</span>
          </div>
          <div className="space-y-3">
            {lane.items.map((item, index) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><strong className="block">{item}</strong><p className="mt-1 text-sm text-slate-500">{index % 2 ? "Pickup" : "Deliver"} via Uber</p></div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">6 pcs</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Arrived 3:12 PM</span>
                  <span>Surulere</span>
                </div>
                <Button className="mt-4 h-9 w-full bg-[#102532] hover:bg-[#1b3544]">{lane.action}</Button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function BranchTable() {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className="border-b border-slate-100 p-5"><h3 className="font-bold">Branch performance</h3><p className="text-sm text-slate-500">Orders, revenue and logistics by location</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Branch</th><th>Orders</th><th>Revenue</th><th>Avg pickup</th><th>Transit</th><th>Status</th></tr></thead>
          <tbody>{branchRevenue.map((row) => <tr key={row.branch} className="border-t border-slate-100"><td className="p-4 font-bold">{row.branch}</td><td>{row.orders}</td><td>NGN {(row.revenue / 1000000).toFixed(2)}M</td><td>{row.pickup} min</td><td>{row.transit} min</td><td><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === "Healthy" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.status}</span></td></tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function ExceptionPanel() {
  return (
    <Card className="border-0 p-5 shadow-sm">
      <h3 className="font-bold">Exceptions</h3>
      <div className="mt-4 space-y-3">
        <Exception icon={<AlertTriangle />} title="Lekki backlog" detail="3 pending pickups can be reassigned." tone="amber" />
        <Exception icon={<Truck />} title="Courier delay" detail="Yaba route averaging 24 min transit." tone="cyan" />
        <Exception icon={<CheckCircle2 />} title="Healthy branch" detail="Surulere has the fastest processing today." tone="emerald" />
      </div>
    </Card>
  );
}

function Exception({ icon, title, detail, tone }: { icon: React.ReactNode; title: string; detail: string; tone: "amber" | "cyan" | "emerald" }) {
  const styles = { amber: "bg-amber-50 text-amber-700", cyan: "bg-cyan-50 text-cyan-700", emerald: "bg-emerald-50 text-emerald-700" };
  return <div className="flex gap-3 rounded-lg border border-slate-100 p-3"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles[tone]}`}>{icon}</div><div><p className="text-sm font-bold">{title}</p><p className="text-sm text-slate-500">{detail}</p></div></div>;
}

function BillingOps() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card className="border-0 p-5 shadow-sm">
        <h3 className="text-xl font-bold">Courier billing</h3>
        <p className="mt-1 text-sm text-slate-500">Choose how Uber, Bolt and Kwik delivery charges are reconciled.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border-2 border-[#13a7a5] bg-cyan-50 p-5"><p className="font-bold">Unified corporate billing</p><p className="mt-2 text-sm text-slate-600">One central account pays provider bills. Internal ledgers split cost by branch.</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="font-bold">Per-branch billing</p><p className="mt-2 text-sm text-slate-600">Each branch pays provider invoices through its own billing ID.</p></div>
        </div>
        <BranchTable />
      </Card>
      <Card className="border-0 p-5 shadow-sm">
        <h3 className="text-xl font-bold">Reassign orders</h3>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Lekki is reporting a washing-machine fault. Pending pickups can be moved before dispatch.</p>
        <select className="mt-5 h-12 w-full rounded-lg border border-slate-200 px-3"><option>From Lekki Branch (3 pending)</option></select>
        <select className="mt-3 h-12 w-full rounded-lg border border-[#13a7a5] px-3"><option>To Yaba Branch</option></select>
        <Button className="mt-4 h-12 w-full">Reassign 3 orders</Button>
      </Card>
    </div>
  );
}

function BranchManagement() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <FormPanel icon={<Plus />} title="Create branch" fields={["Branch name", "Address", "City", "State", "Latitude", "Longitude"]} action="Create branch" />
      <FormPanel icon={<UserPlus />} title="Create branch admin" fields={["Full name", "Email", "Phone", "Temporary password"]} action="Create admin" branchSelect />
    </div>
  );
}

function NotificationsComposer() {
  const [title, setTitle] = useState("Your FreshFold bill is ready");
  const [excerpt, setExcerpt] = useState("Review your wash and delivery bill, then pay with Paystack so washing can begin.");
  const [audience, setAudience] = useState("Customers with awaiting payment orders");
  const [channels, setChannels] = useState({ inApp: true, email: true, push: false });
  const [imageName, setImageName] = useState("");
  const [body, setBody] = useState("Hello David, your clothes have been inspected by FreshFold Surulere. Please review the bill breakdown and complete payment with Paystack.");

  function wrap(tag: "strong" | "em" | "u") {
    const selection = window.getSelection()?.toString();
    if (!selection) return;
    setBody((current) => current.replace(selection, `<${tag}>${selection}</${tag}>`));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card className="border-0 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Send notification</h2>
            <p className="mt-1 text-sm text-slate-500">Branch admins can send in-app, email, and push notifications to customers.</p>
          </div>
          <Button className="w-full sm:w-auto"><Bell className="h-4 w-4" /> Send broadcast</Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Title" value={title} onChange={setTitle} />
          <label className="text-sm font-semibold text-slate-700">Audience<select className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={audience} onChange={(event) => setAudience(event.target.value)}><option>Customers with awaiting payment orders</option><option>All customers in this branch</option><option>Customers with active pickups</option><option>Customers with ready orders</option></select></label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-700">Short preview/excerpt<input className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#13a7a5]" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} /></label>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-2">
            <ToolbarButton label="Bold" onClick={() => wrap("strong")} icon={<Bold className="h-4 w-4" />} />
            <ToolbarButton label="Italic" onClick={() => wrap("em")} icon={<Italic className="h-4 w-4" />} />
            <ToolbarButton label="Underline" onClick={() => wrap("u")} icon={<Underline className="h-4 w-4" />} />
            <label className="ml-auto flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <Image className="h-4 w-4" /> Image
              <input className="hidden" type="file" accept="image/*" onChange={(event) => setImageName(event.target.files?.[0]?.name ?? "")} />
            </label>
          </div>
          <textarea className="min-h-56 w-full resize-y rounded-b-xl p-4 text-sm outline-none" value={body} onChange={(event) => setBody(event.target.value)} />
        </div>

        {imageName && <p className="mt-3 rounded-lg bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">Image selected for email: {imageName}</p>}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Channel checked={channels.inApp} label="In-app" icon={<Bell />} onClick={() => setChannels({ ...channels, inApp: !channels.inApp })} />
          <Channel checked={channels.email} label="Email" icon={<Mail />} onClick={() => setChannels({ ...channels, email: !channels.email })} />
          <Channel checked={channels.push} label="Push" icon={<Bell />} onClick={() => setChannels({ ...channels, push: !channels.push })} />
        </div>
      </Card>

      <Card className="border-0 p-5 shadow-sm">
        <p className="text-sm font-bold uppercase text-[#13a7a5]">Preview</p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-lg font-bold">{title}</p>
          <p className="mt-2 text-sm text-slate-500">{excerpt}</p>
          <div className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: body }} />
          {imageName && <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Email image attachment: {imageName}</div>}
        </div>
        <div className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Backend endpoint: `POST /api/notifications/broadcast`. Email/push provider sending should be wired server-side.</div>
      </Card>
    </div>
  );
}

function ToolbarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button title={label} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">{icon}</button>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<input className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#13a7a5]" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Channel({ checked, label, icon, onClick }: { checked: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm font-semibold ${checked ? "border-[#13a7a5] bg-cyan-50 text-[#102532]" : "border-slate-200 bg-white text-slate-500"}`}><span className="text-[#13a7a5]">{icon}</span>{label}</button>;
}

function FormPanel({ icon, title, fields, action, branchSelect }: { icon: React.ReactNode; title: string; fields: string[]; action: string; branchSelect?: boolean }) {
  return (
    <Card className="border-0 p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-xl font-bold"><span className="text-[#13a7a5]">{icon}</span>{title}</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {fields.map((label) => <input key={label} className="h-12 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#13a7a5]" placeholder={label} />)}
        {branchSelect && <select className="h-12 rounded-lg border border-slate-200 px-3 text-sm sm:col-span-2"><option>FreshFold Surulere</option><option>FreshFold Yaba</option><option>FreshFold Lekki</option></select>}
        <Button className="h-12 sm:col-span-2">{action}</Button>
      </div>
    </Card>
  );
}

function Logistics() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card className="border-0 p-5 shadow-sm">
        <h3 className="text-xl font-bold">Provider routing</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {["Uber Direct", "Bolt", "Kwik"].map((provider, index) => <div key={provider} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Truck className="h-5 w-5 text-[#13a7a5]" /><p className="mt-4 font-bold">{provider}</p><p className="text-sm text-slate-500">{index === 0 ? "Ready for credentials" : "Adapter awaiting partner docs"}</p></div>)}
        </div>
      </Card>
      <ExceptionPanel />
    </div>
  );
}

function SettingsPanel({ role }: { role: string }) {
  return <Card className="border-0 p-5 shadow-sm"><h3 className="text-xl font-bold">Settings</h3><p className="mt-2 text-slate-500">{role === "SUPER_ADMIN" ? "Global business settings, branch provisioning, courier billing and admin permissions." : "Branch profile, staff users, service pricing and notification preferences."}</p></Card>;
}
