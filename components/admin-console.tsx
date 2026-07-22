"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Mail,
  MapPin,
  PackageCheck,
  Plus,
  Route,
  Settings,
  Truck,
  Users,
  UserPlus
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/toast-provider";
import { API_BASE_URL, apiFetch, toErrorMessage, type AdminRole, type AnalyticsResponse, type ApiUser, type AuditLog, type AuditLogPage, type Branch, type Order } from "@/lib/api";
import { useAdminStore } from "@/lib/store";

type AdminPage = "dashboard" | "orders" | "pricing" | "branches" | "notifications" | "logistics" | "billing" | "audit" | "settings";

const navItems = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["orders", PackageCheck, "Orders"],
  ["branches", Building2, "Branches"],
  ["notifications", Bell, "Notifications"],
  ["logistics", Route, "Logistics"],
  ["billing", CreditCard, "Billing"],
  ["audit", FileText, "Audit logs"],
  ["settings", Settings, "Settings"]
] as const;

const orderColumns = [
  { title: "Pickup requested", statuses: ["PICKUP_REQUESTED", "PICKUP_COURIER_ASSIGNED", "PICKED_UP"] },
  { title: "To be priced", statuses: ["AT_BRANCH", "PRICING"] },
  { title: "Awaiting payment", statuses: ["AWAITING_PAYMENT"] },
  { title: "In cleaning", statuses: ["PAID", "WASHING", "DRYING", "IRONING", "BAGGED"] },
  { title: "Ready", statuses: ["READY", "OUT_FOR_DELIVERY", "DELIVERED", "READY_FOR_PICKUP", "COLLECTED"] }
];

const courierProviders = ["SHIPBUBBLE", "RELAY"] as const;

const pagePaths: Record<Exclude<AdminPage, "pricing">, string> = {
  dashboard: "/",
  orders: "/orders",
  branches: "/branches",
  notifications: "/notifications",
  logistics: "/logistics",
  billing: "/billing",
  audit: "/audit-logs",
  settings: "/settings"
};

export function AdminConsole({ page }: { page: AdminPage }) {
  const { role, setRole, token, setToken, branchId, setBranchId } = useAdminStore();
  const { showToast } = useToast();
  const [view, setView] = useState<AdminPage>(page);
  const [range, setRange] = useState({ from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) });
  const [analytics, setAnalytics] = useState<AnalyticsResponse>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<ApiUser[]>([]);
  const [branchUsers, setBranchUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pricingOrderId, setPricingOrderId] = useState<string>();
  const visibleNavItems = useMemo(() => navItems.filter(([id]) => {
    if (id === "branches") return role === "SUPER_ADMIN" || role === "BRANCH_ADMIN";
    if (id === "audit") return role === "SUPER_ADMIN" || role === "BRANCH_ADMIN";
    return true;
  }), [role]);
  const pricingOrder = useMemo(() => orders.find((order) => order.id === pricingOrderId), [orders, pricingOrderId]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("freshfold_admin_token");
    const savedRole = window.localStorage.getItem("freshfold_admin_role") as AdminRole | null;
    const savedBranchId = window.localStorage.getItem("freshfold_admin_branch_id") ?? undefined;
    if (!savedToken) {
      window.location.href = "/login";
      return;
    }
    setToken(savedToken);
    if (savedRole) setRole(savedRole);
    setBranchId(savedBranchId);
  }, [setBranchId, setRole, setToken]);

  useEffect(() => {
    setView(page);
  }, [page]);

  async function refreshData(currentToken = token, showLoading = false) {
    if (!currentToken) return;
    if (showLoading) setIsLoading(true);
    try {
      const [analyticsResult, orderResult, branchResult, branchUserResult, customerResult] = await Promise.all([
        apiFetch<AnalyticsResponse>(`/api/admin/analytics?from=${range.from}&to=${range.to}`, {}, currentToken),
        apiFetch<Order[]>("/api/orders", {}, currentToken),
        apiFetch<Branch[]>("/api/branches", {}, currentToken),
        apiFetch<ApiUser[]>("/api/admin/users", {}, currentToken).catch(() => []),
        apiFetch<ApiUser[]>("/api/admin/customers", {}, currentToken).catch(() => [])
      ]);
      setAnalytics(analyticsResult);
      setOrders(orderResult);
      setBranches(branchResult);
      setBranchUsers(branchUserResult);
      setCustomers(customerResult);
    } catch (error) {
      showToast({ type: "error", title: "Could not load admin data", message: toErrorMessage(error) });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    refreshData(token, true);
  }, [range.from, range.to, showToast, token, page]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      refreshData(token, false);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [range.from, range.to, token, page]);

  useEffect(() => {
    if (role === "BRANCH_STAFF" && (view === "branches" || view === "audit")) window.location.href = "/";
  }, [role, view]);

  const cards = useMemo(() => [
    { label: "Revenue", value: formatNaira(analytics?.cards.revenue ?? 0), helper: "Paid orders in selected range" },
    { label: "Orders", value: String(analytics?.cards.orders ?? orders.length), helper: "Orders in selected range" },
    { label: "Avg ticket", value: formatNaira(analytics?.cards.averageTicket ?? 0), helper: "Average paid order value" },
    { label: "Failed handovers", value: String(analytics?.cards.failedHandovers ?? 0), helper: "Courier exceptions" }
  ], [analytics, orders.length]);

  async function signOut() {
    if (token) {
      await apiFetch("/api/auth/logout", { method: "POST" }, token).catch(() => undefined);
    }
    window.localStorage.removeItem("freshfold_admin_token");
    window.localStorage.removeItem("freshfold_admin_role");
    window.localStorage.removeItem("freshfold_admin_branch_id");
    setToken("");
    window.location.href = "/login";
  }

  function mergeOrder(order: Order) {
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...order } : item));
  }

  function openPricing(order: Order) {
    setPricingOrderId(order.id);
    setView("pricing");
  }

  function navigate(nextView: Exclude<AdminPage, "pricing">) {
    window.location.href = pagePaths[nextView];
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.text("Washtownnig Operations Report", 16, 18);
    doc.text(`Range: ${range.from} to ${range.to}`, 16, 28);
    cards.forEach((card, index) => doc.text(`${card.label}: ${card.value}`, 16, 42 + index * 10));
    doc.save("freshfold-operations.pdf");
  }

  async function exportCsv() {
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/api/admin/export.csv`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      showToast({ type: "error", title: "Could not export CSV", message: "Please try again in a moment." });
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "freshfold-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!token) return null;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <aside className="fixed left-0 top-0 hidden h-screen w-[280px] border-r border-slate-200 bg-white lg:block">
        <div className="flex h-screen flex-col p-4">
          <div className="flex items-center gap-3 rounded-lg bg-[#0b4ea2] p-4 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white p-1.5">
              <img src="/washtownlogo.png" alt="Washtownnig" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <p className="font-bold">Washtownnig</p>
              <p className="text-xs text-slate-300">Operations console</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Workspace</p>
            <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm font-bold">{role === "SUPER_ADMIN" ? "Corporate HQ" : "Assigned branch"}</p>
          </div>

          <nav className="mt-5 space-y-1">
            {visibleNavItems.map(([id, Icon, label]) => (
              <button key={id} onClick={() => navigate(id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${view === id ? "bg-[#0b4ea2] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>

          <Button className="mt-auto bg-white text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" onClick={signOut}>
            <ArrowLeft className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <section className="min-w-0 lg:ml-[280px]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[#df1f2d]">{role === "SUPER_ADMIN" ? "All branches" : "Branch workspace"}</p>
              <h1 className="text-xl font-bold sm:text-2xl">{role === "SUPER_ADMIN" ? "Corporate Overview" : "Branch Operations"}</h1>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <DateInput value={range.from} onChange={(value) => setRange({ ...range, from: value })} />
              <DateInput value={range.to} onChange={(value) => setRange({ ...range, to: value })} />
              <Button className="bg-[#0b4ea2] px-3 hover:bg-[#073b78]" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
              <Button className="bg-[#0b4ea2] px-3 hover:bg-[#073b78]" onClick={exportPdf}><FileText className="h-4 w-4" /> PDF</Button>
              <Button className="bg-white px-3 text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50 lg:hidden" onClick={signOut}>Sign out</Button>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {visibleNavItems.map(([id, Icon, label]) => (
              <button key={id} onClick={() => navigate(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${view === id ? "bg-[#0b4ea2] text-white" : "bg-slate-100 text-slate-600"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          {isLoading ? (
            <AdminPageSkeleton />
          ) : (
            <>
              {view === "dashboard" && <Dashboard cards={cards} analytics={analytics} orders={orders} />}
              {view === "orders" && <OrdersPipeline orders={orders} token={token} onOrderUpdated={mergeOrder} onStartPricing={openPricing} />}
              {view === "pricing" && pricingOrder && <PricingWorkspace order={pricingOrder} token={token} onBack={() => navigate("orders")} onOrderUpdated={mergeOrder} />}
              {view === "billing" && <BillingOps orders={orders} onStartPricing={openPricing} />}
              {view === "branches" && (role === "SUPER_ADMIN" || role === "BRANCH_ADMIN") && <BranchManagement branches={branches} branchUsers={branchUsers} token={token} role={role} assignedBranchId={branchId} onCreated={(branch) => setBranches((current) => [...current, branch])} onAdminCreated={(user) => setBranchUsers((current) => [user, ...current])} />}
              {view === "notifications" && <NotificationsComposer customers={customers} token={token} />}
              {view === "logistics" && <Logistics orders={orders} />}
              {view === "audit" && <AuditLogs token={token} branches={branches} role={role} />}
              {view === "settings" && <SettingsPanel role={role} />}
            </>
          )}
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

function AdminPageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-0 p-5 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-40" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="border-0 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
                <div key={itemIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-3 w-36" />
                  <Skeleton className="mt-4 h-8 w-28" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ cards, analytics, orders }: { cards: Array<{ label: string; value: string; helper: string }>; analytics?: AnalyticsResponse; orders: Order[] }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <KpiCard key={card.label} {...card} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-0 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div><h3 className="font-bold">Revenue by branch</h3><p className="text-sm text-slate-500">Paid cleaning and delivery totals</p></div>
            <BarChart3 className="h-5 w-5 text-[#df1f2d]" />
          </div>
          {analytics?.byBranch.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byBranch}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="branch" /><YAxis /><Tooltip formatter={(value) => formatNaira(Number(value))} /><Bar dataKey="revenue" fill="#df1f2d" radius={[8, 8, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState title="No paid revenue yet" detail="Revenue appears after bills are paid." />}
        </Card>
        <Card className="border-0 p-5 shadow-sm">
          <h3 className="font-bold">Recent orders</h3>
          <div className="mt-4 space-y-3">
            {orders.slice(0, 6).map((order) => <OrderRow key={order.id} order={order} />)}
            {!orders.length && <EmptyState title="No orders yet" detail="Customer wash requests will appear here." />}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-0 p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </Card>
  );
}

function OrdersPipeline({ orders, token, onOrderUpdated, onStartPricing }: { orders: Order[]; token: string; onOrderUpdated: (order: Order) => void; onStartPricing: (order: Order) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {orderColumns.map((column) => {
        const columnOrders = orders.filter((order) => column.statuses.includes(order.status));
        return (
          <Card key={column.title} className="min-h-[360px] border-0 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">{column.title}</h3>
              <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{columnOrders.length}</span>
            </div>
            <div className="space-y-3">
              {columnOrders.map((order) => <OrderCard key={order.id} order={order} token={token} onOrderUpdated={onOrderUpdated} onStartPricing={onStartPricing} />)}
              {!columnOrders.length && <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No orders in this stage.</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function OrderCard({ order, token, onOrderUpdated, onStartPricing }: { order: Order; token: string; onOrderUpdated: (order: Order) => void; onStartPricing: (order: Order) => void }) {
  const { showToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [provider, setProvider] = useState<(typeof courierProviders)[number]>("SHIPBUBBLE");
  const [isDispatching, setIsDispatching] = useState(false);
  const isReturnDeliveryPaymentPending = order.deliveries?.some((delivery) => delivery.leg === "BRANCH_TO_CUSTOMER" && delivery.status === "return_payment_pending");
  const hasPaidFailedReturnDispatch = order.deliveries?.some((delivery) => delivery.leg === "BRANCH_TO_CUSTOMER" && delivery.status === "dispatch_failed_after_payment" && delivery.paidAt);
  const opensBillWorkspace = order.status === "AWAITING_PAYMENT" || Boolean(order.bill);
  const canDispatchReturn = order.status === "READY" && order.fulfillmentMethod !== "STORE_PICKUP" && (!isReturnDeliveryPaymentPending || hasPaidFailedReturnDispatch);
  const canMarkAtBranchForTesting = ["PICKUP_REQUESTED", "PICKUP_COURIER_ASSIGNED", "PICKED_UP"].includes(order.status);
  const canMarkReady = ["PAID", "WASHING", "DRYING", "IRONING", "BAGGED"].includes(order.status);

  async function updateStatus(status: string, note: string) {
    setIsUpdating(true);
    try {
      const updated = await apiFetch<Order>(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note })
      }, token);
      onOrderUpdated(updated);
      if (status === "PRICING") onStartPricing({ ...order, ...updated });
      showToast({ type: "success", title: "Order updated", message: `${order.code} is now ${formatStatus(status)}.` });
    } catch (error) {
      showToast({ type: "error", title: "Could not update order", message: toErrorMessage(error) });
    } finally {
      setIsUpdating(false);
    }
  }

  async function dispatchCourier(leg: "PICKUP_TO_BRANCH" | "BRANCH_TO_CUSTOMER") {
    setIsDispatching(true);
    try {
      const result = await apiFetch<{ order: Order }>(`/api/orders/${order.id}/deliveries`, {
        method: "POST",
        body: JSON.stringify({ provider, leg })
      }, token);
      onOrderUpdated(result.order);
      showToast({
        type: "success",
        title: leg === "BRANCH_TO_CUSTOMER" ? hasPaidFailedReturnDispatch ? "Return dispatch retried" : "Delivery payment sent" : "Courier dispatched",
        message: leg === "BRANCH_TO_CUSTOMER"
          ? hasPaidFailedReturnDispatch ? `${provider} return delivery dispatch was retried for ${order.code}.` : `${provider} return delivery quote was sent to the customer for payment.`
          : `${provider} tracking is now attached to ${order.code}.`
      });
    } catch (error) {
      showToast({ type: "error", title: "Could not dispatch courier", message: toErrorMessage(error) });
    } finally {
      setIsDispatching(false);
    }
  }

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 p-4 ${opensBillWorkspace ? "cursor-pointer transition hover:border-[#df1f2d] hover:bg-red-50" : ""}`}
      role={opensBillWorkspace ? "button" : undefined}
      tabIndex={opensBillWorkspace ? 0 : undefined}
      onClick={() => {
        if (opensBillWorkspace) onStartPricing(order);
      }}
      onKeyDown={(event) => {
        if (opensBillWorkspace && (event.key === "Enter" || event.key === " ")) onStartPricing(order);
      }}
    >
      <strong className="block">{order.code}</strong>
      <p className="mt-1 text-sm text-slate-500">{order.customer?.fullName ?? "Customer"} · {order.branch?.name ?? "Branch"}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{formatStatus(order.status)}</p>
      {!!order.deliveries?.length && (
        <div className="mt-3 space-y-2">
          {order.deliveries.map((delivery) => (
            <div key={delivery.id} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{delivery.provider} · {formatDeliveryLeg(delivery.leg)}</span>
                <span className="text-slate-500">{delivery.status}</span>
              </div>
              <p className="mt-1 text-slate-500">{formatNaira(delivery.fee)}</p>
              <div className="mt-2 rounded-md bg-slate-50 p-2 text-slate-600">
                <p className="font-bold text-slate-900">Rider details</p>
                {delivery.courierName || delivery.courierPhone ? (
                  <>
                    {delivery.courierName && <p className="mt-1">{delivery.courierName}</p>}
                    {delivery.courierPhone && <a className="mt-1 block font-bold text-[#0b4ea2]" href={`tel:${delivery.courierPhone}`} onClick={(event) => event.stopPropagation()}>{delivery.courierPhone}</a>}
                  </>
                ) : (
                  <p className="mt-1">Rider details pending</p>
                )}
              </div>
              {delivery.trackingUrl && (
                <a className="mt-2 inline-flex items-center gap-1 font-bold text-[#b91c1c]" href={delivery.trackingUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                  Track delivery <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {delivery.status === "return_payment_pending" && delivery.paystackUrl && (
                <a className="mt-2 inline-flex items-center gap-1 font-bold text-[#0b4ea2]" href={delivery.paystackUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                  Open delivery payment <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      {canDispatchReturn && (
        <div className="mt-3 grid gap-2">
          <select className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold" value={provider} onClick={(event) => event.stopPropagation()} onChange={(event) => setProvider(event.target.value as typeof provider)}>
            {courierProviders.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Button className="h-9 px-3 text-xs" disabled={isDispatching} onClick={(event) => {
            event.stopPropagation();
            dispatchCourier("BRANCH_TO_CUSTOMER");
          }}>
            <Truck className="h-3.5 w-3.5" /> {isDispatching ? hasPaidFailedReturnDispatch ? "Retrying..." : "Sending quote..." : hasPaidFailedReturnDispatch ? "Retry return dispatch" : "Send return delivery fee"}
          </Button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {canMarkAtBranchForTesting && (
          <Button className="h-9 bg-white px-3 text-xs text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={isUpdating} onClick={(event) => {
            event.stopPropagation();
            updateStatus("AT_BRANCH", "Test pickup marked as received at branch");
          }}>
            <PackageCheck className="h-3.5 w-3.5" /> At branch
          </Button>
        )}
        {order.status === "AT_BRANCH" && (
          <Button className="h-9 bg-white px-3 text-xs text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={isUpdating} onClick={(event) => {
            event.stopPropagation();
            updateStatus("PRICING", "Branch started inspection and pricing");
          }}>
            <FileText className="h-3.5 w-3.5" /> Start pricing
          </Button>
        )}
        {order.status === "PRICING" && (
          <Button className="h-9 bg-white px-3 text-xs text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" onClick={(event) => {
            event.stopPropagation();
            onStartPricing(order);
          }}>
            <FileText className="h-3.5 w-3.5" /> Open pricing
          </Button>
        )}
        {canMarkReady && (
          <Button className="h-9 bg-white px-3 text-xs text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={isUpdating} onClick={(event) => {
            event.stopPropagation();
            updateStatus("READY", "Branch marked cleaning complete and order ready");
          }}>
            <PackageCheck className="h-3.5 w-3.5" /> Mark ready
          </Button>
        )}
        {opensBillWorkspace && (
          <span className="text-xs font-semibold text-[#df1f2d]">Click to view bill</span>
        )}
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm">
      <div>
        <p className="font-bold">{order.code}</p>
        <p className="text-slate-500">{order.customer?.fullName ?? "Customer"} · {order.branch?.name ?? "Branch"}</p>
      </div>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{formatStatus(order.status)}</span>
    </div>
  );
}

function BillingOps({ orders, onStartPricing }: { orders: Order[]; onStartPricing: (order: Order) => void }) {
  const billable = orders.filter((order) => ["AT_BRANCH", "PRICING", "AWAITING_PAYMENT"].includes(order.status));
  return (
    <Card className="border-0 p-5 shadow-sm">
      <h3 className="text-xl font-bold">Billing queue</h3>
      <p className="mt-1 text-sm text-slate-500">Orders appear here after pickup reaches the branch or when payment is waiting.</p>
      <div className="mt-5 space-y-3">
        {billable.map((order) => (
          <div key={order.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <OrderRow order={order} />
            <Button className="h-10 px-3" onClick={() => onStartPricing(order)}>
              <FileText className="h-4 w-4" /> {order.bill ? "View bill" : "Open pricing"}
            </Button>
          </div>
        ))}
        {!billable.length && <EmptyState title="No orders need billing" detail="Branch inspection and Paystack billing actions will appear here." />}
      </div>
    </Card>
  );
}

type RequestedItem = { itemType?: string; quantity?: number };

function PricingWorkspace({ order, token, onOrderUpdated, onBack }: { order: Order; token: string; onOrderUpdated: (order: Order) => void; onBack: () => void }) {
  const { showToast } = useToast();
  const courierDeliveryFee = order.deliveries
    ?.filter((delivery) => !["dispatch_failed", "duplicate_active_pickup", "dispatch_failed_after_payment"].includes(delivery.status) || delivery.paidAt)
    .reduce((sum, delivery) => sum + delivery.fee, 0) ?? 0;
  const requestedItems = Array.isArray(order.requestedItems) ? order.requestedItems as RequestedItem[] : [];
  const submittedItemNames = Array.from(new Set(requestedItems.map((item) => item.itemType).filter(Boolean))) as string[];
  const initialItemName = submittedItemNames[0] ?? "";
  const [items, setItems] = useState([{ itemName: initialItemName, serviceType: "Wash and fold", quantity: "1", unitPrice: "" }]);
  const [deliveryFee, setDeliveryFee] = useState(String(order.bill?.deliveryFee ?? courierDeliveryFee));
  const [isSaving, setIsSaving] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const total = subtotal + Number(deliveryFee || 0);

  useEffect(() => {
    if (order.bill) return;
    setItems([{ itemName: initialItemName, serviceType: "Wash and fold", quantity: "1", unitPrice: "" }]);
    setDeliveryFee(String(courierDeliveryFee));
  }, [courierDeliveryFee, initialItemName, order.bill, order.id]);

  function updateItem(index: number, field: keyof typeof items[number], value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function addPricingItem() {
    setItems((current) => {
      const nextName = submittedItemNames.find((name) => !current.some((item) => item.itemName === name)) ?? submittedItemNames[0] ?? "";
      return [...current, { itemName: nextName, serviceType: "Wash and fold", quantity: "1", unitPrice: "" }];
    });
  }

  async function saveBill() {
    const payloadItems = items.map((item) => ({
      itemName: item.itemName.trim(),
      serviceType: item.serviceType.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice)
    })).filter((item) => item.itemName && item.serviceType && item.quantity > 0 && item.unitPrice >= 0);
    if (!payloadItems.length) {
      showToast({ type: "error", title: "Inspection is empty", message: "Add at least one priced clothing item." });
      return;
    }
    setIsSaving(true);
    try {
      const bill = await apiFetch<Order["bill"]>(`/api/orders/${order.id}/bill`, {
        method: "POST",
        body: JSON.stringify({ items: payloadItems, deliveryFee: Number(deliveryFee || 0) })
      }, token);
      onOrderUpdated({ ...order, status: "AWAITING_PAYMENT", bill });
      showToast({ type: "success", title: "Bill created", message: `${order.code} total is ${formatNaira(bill?.total ?? total)}.` });
    } catch (error) {
      showToast({ type: "error", title: "Could not create bill", message: toErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }

  async function resendPaymentLink() {
    setIsResending(true);
    try {
      const bill = await apiFetch<Order["bill"]>(`/api/orders/${order.id}/bill/payment-link`, { method: "POST" }, token);
      onOrderUpdated({ ...order, status: "AWAITING_PAYMENT", bill });
      showToast({ type: "success", title: "Payment link resent", message: `A new Paystack link was sent for ${order.code}.` });
    } catch (error) {
      showToast({ type: "error", title: "Could not resend link", message: toErrorMessage(error) });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#0b4ea2]" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </button>
          <p className="text-xs font-bold uppercase text-[#df1f2d]">Inspection pricing</p>
          <h2 className="mt-1 text-2xl font-bold">{order.code}</h2>
          <p className="mt-1 text-sm text-slate-500">{order.customer?.fullName ?? "Customer"} · {order.branch?.name ?? "Branch"} · {formatStatus(order.status)}</p>
        </div>
        {order.bill?.paystackUrl && (
          <div className="flex flex-wrap gap-2">
            <Button className="h-11 bg-white px-3 text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={isResending || Boolean(order.bill.paidAt)} onClick={resendPaymentLink}>
              <Mail className="h-4 w-4" /> Resend link
            </Button>
            <a className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0b4ea2] px-4 text-sm font-semibold text-white" href={order.bill.paystackUrl} target="_blank" rel="noreferrer">Open payment link</a>
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-0 p-5 shadow-sm">
          <h3 className="text-lg font-bold">Customer request</h3>
          <div className="mt-4 grid gap-3 text-sm">
            <ReadOnlyValue label="Customer" value={`${order.customer?.fullName ?? "Customer"}${order.customer?.phone ? ` · ${order.customer.phone}` : ""}`} />
            <ReadOnlyValue label="Pickup address" value={order.pickupAddress} />
            <ReadOnlyValue label="Return address" value={order.dropoffAddress ?? order.pickupAddress} />
            <ReadOnlyValue label="Fulfillment" value={formatStatus(order.fulfillmentMethod ?? "HOME_DELIVERY")} />
          </div>
          <div className="mt-5">
            <p className="text-xs font-bold uppercase text-slate-400">Submitted items</p>
            <div className="mt-2 space-y-2">
              {requestedItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold">{item.itemType ?? "Item"}</span>
                  <span className="text-slate-500">Qty {item.quantity ?? 1}</span>
                </div>
              ))}
              {!requestedItems.length && <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">No item estimate was submitted.</p>}
            </div>
          </div>
          {order.customerNote && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase text-slate-400">Customer note</p>
              <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 whitespace-pre-wrap">{order.customerNote}</p>
            </div>
          )}
          {!!order.photoUrls?.length && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase text-slate-400">Photos</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {order.photoUrls.map((url) => <img key={url} className="aspect-square rounded-lg object-cover" src={url} alt="Customer submitted laundry" />)}
              </div>
            </div>
          )}
        </Card>

        <Card className="border-0 p-5 shadow-sm">
          <h3 className="text-lg font-bold">Inspected items and pricing</h3>
          {order.bill ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <p className="font-bold">Bill total: {formatNaira(order.bill.total)}</p>
              <p className="mt-1 text-slate-500">Cleaning {formatNaira(order.bill.cleaningSubtotal)} · Delivery {formatNaira(order.bill.deliveryFee)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="h-10 bg-white px-3 text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={isResending || Boolean(order.bill.paidAt)} onClick={resendPaymentLink}>
                  <Mail className="h-4 w-4" /> Resend Paystack link
                </Button>
                {order.bill.paystackUrl && <a className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0b4ea2] px-3 text-sm font-semibold text-white" href={order.bill.paystackUrl} target="_blank" rel="noreferrer">Open link</a>}
              </div>
              <div className="mt-4 space-y-2">
                {order.bill.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <span><strong>{item.itemName}</strong><span className="block text-xs text-slate-500">{item.serviceType} · Qty {item.quantity}</span></span>
                    <span className="font-semibold">{formatNaira(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_80px_120px]">
                  {submittedItemNames.length ? (
                    <select className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={item.itemName} onChange={(event) => updateItem(index, "itemName", event.target.value)}>
                      {submittedItemNames.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  ) : (
                    <Input placeholder="Item inspected" value={item.itemName} onChange={(value) => updateItem(index, "itemName", value)} />
                  )}
                  <Input placeholder="Service" value={item.serviceType} onChange={(value) => updateItem(index, "serviceType", value)} />
                  <Input placeholder="Qty" value={item.quantity} onChange={(value) => updateItem(index, "quantity", value)} type="number" />
                  <Input placeholder="Unit price" value={item.unitPrice} onChange={(value) => updateItem(index, "unitPrice", value)} type="number" />
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <Input placeholder="Delivery fee" value={deliveryFee} onChange={setDeliveryFee} type="number" />
                <Button className="h-12 bg-white px-3 text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" onClick={addPricingItem}>
                  <Plus className="h-4 w-4" /> Item
                </Button>
                <Button className="h-12 px-3" disabled={isSaving} onClick={saveBill}>
                  <CreditCard className="h-4 w-4" /> Create bill
                </Button>
              </div>
              <p className="text-sm font-bold text-slate-600">Total: {formatNaira(total)}</p>
              {!!courierDeliveryFee && <p className="text-xs font-semibold text-slate-500">Courier fee from delivery provider: {formatNaira(courierDeliveryFee)}</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function BranchManagement({ branches, branchUsers, token, role, assignedBranchId, onCreated, onAdminCreated }: { branches: Branch[]; branchUsers: ApiUser[]; token: string; role: AdminRole; assignedBranchId?: string; onCreated: (branch: Branch) => void; onAdminCreated: (user: ApiUser) => void }) {
  const { showToast } = useToast();
  const canCreateBranches = role === "SUPER_ADMIN";
  const manageableBranches = useMemo(() => canCreateBranches ? branches : branches.filter((branch) => branch.id === assignedBranchId), [assignedBranchId, branches, canCreateBranches]);
  const [branchForm, setBranchForm] = useState({ name: "", slug: "", address: "", city: "", state: "", latitude: "", longitude: "", phone: "" });
  const [geocodeResults, setGeocodeResults] = useState<Array<{ label: string; latitude: string; longitude: string }>>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: "", email: "", phone: "", password: "", branchId: assignedBranchId ?? "", role: "BRANCH_ADMIN" as "BRANCH_ADMIN" | "BRANCH_STAFF" });
  const [selectedBranchId, setSelectedBranchId] = useState(manageableBranches[0]?.id ?? "");
  const [branchPage, setBranchPage] = useState(1);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(manageableBranches.length / pageSize));
  const visibleBranches = manageableBranches.slice((branchPage - 1) * pageSize, branchPage * pageSize);

  useEffect(() => {
    if (!manageableBranches.length) {
      setSelectedBranchId("");
      return;
    }
    if (!selectedBranchId || !manageableBranches.some((branch) => branch.id === selectedBranchId)) {
      setSelectedBranchId(manageableBranches[0].id);
    }
    if (!canCreateBranches && assignedBranchId) {
      setAdminForm((current) => ({ ...current, branchId: assignedBranchId, role: "BRANCH_STAFF" }));
    }
    setBranchPage((current) => Math.min(current, Math.max(1, Math.ceil(manageableBranches.length / pageSize))));
  }, [manageableBranches, selectedBranchId, canCreateBranches, assignedBranchId]);

  async function createBranch() {
    try {
      if (!branchForm.latitude || !branchForm.longitude) {
        showToast({ type: "error", title: "Confirm branch location", message: "Please find and confirm the address coordinates before creating this branch." });
        return;
      }
      const branch = await apiFetch<Branch>("/api/branches", {
        method: "POST",
        body: JSON.stringify({ ...branchForm, latitude: Number(branchForm.latitude), longitude: Number(branchForm.longitude), phone: branchForm.phone || undefined })
      }, token);
      onCreated(branch);
      setBranchForm({ name: "", slug: "", address: "", city: "", state: "", latitude: "", longitude: "", phone: "" });
      setGeocodeResults([]);
      showToast({ type: "success", title: "Branch created", message: `${branch.name} is now available for orders.` });
    } catch (error) {
      showToast({ type: "error", title: "Could not create branch", message: toErrorMessage(error) });
    }
  }

  async function findCoordinates() {
    const query = [branchForm.address, branchForm.city, branchForm.state, "Nigeria"].filter(Boolean).join(", ");
    if (!branchForm.address || !branchForm.city || !branchForm.state) {
      showToast({ type: "error", title: "Address is incomplete", message: "Enter the branch address, city, and state before finding coordinates." });
      return;
    }

    setIsGeocoding(true);
    setGeocodeResults([]);
    setBranchForm((current) => ({ ...current, latitude: "", longitude: "" }));
    try {
      const result = await apiFetch<{ results: Array<{ label: string; latitude: string; longitude: string }> }>("/api/geocode/address", {
        method: "POST",
        body: JSON.stringify({
          address: branchForm.address,
          city: branchForm.city,
          state: branchForm.state,
          country: "Nigeria"
        })
      }, token);
      setGeocodeResults(result.results);
    } catch (error) {
      showToast({ type: "error", title: "Could not find coordinates", message: toErrorMessage(error) });
    } finally {
      setIsGeocoding(false);
    }
  }

  function confirmCoordinates(result: { latitude: string; longitude: string }) {
    setBranchForm((current) => ({ ...current, latitude: result.latitude, longitude: result.longitude }));
    setGeocodeResults([]);
    showToast({ type: "success", title: "Coordinates confirmed", message: "These coordinates will be attached when you create the branch." });
  }

  async function createAdmin() {
    const payload = {
      ...adminForm,
      branchId: canCreateBranches ? adminForm.branchId : assignedBranchId ?? "",
      role: canCreateBranches ? adminForm.role : "BRANCH_STAFF"
    };
    if (!payload.fullName || !payload.email || !payload.password || !payload.branchId) {
      showToast({ type: "error", title: "Admin details incomplete", message: "Enter the name, email, temporary password, and select a branch." });
      return;
    }
    try {
      const user = await apiFetch<ApiUser>("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }, token);
      onAdminCreated(user);
      setSelectedBranchId(user.branchId ?? payload.branchId);
      setAdminForm({ fullName: "", email: "", phone: "", password: "", branchId: canCreateBranches ? "" : assignedBranchId ?? "", role: canCreateBranches ? "BRANCH_ADMIN" : "BRANCH_STAFF" });
      showToast({ type: "success", title: "User created", message: "The branch user can now sign in. Their login details will be sent by email once Resend is verified." });
    } catch (error) {
      showToast({ type: "error", title: "Could not create admin", message: toErrorMessage(error) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {canCreateBranches && <Card className="border-0 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-xl font-bold"><Plus className="h-5 w-5 text-[#df1f2d]" />Create branch</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Input placeholder="Branch name" value={branchForm.name} onChange={(name) => setBranchForm({ ...branchForm, name })} />
            <Input placeholder="Slug" value={branchForm.slug} onChange={(slug) => setBranchForm({ ...branchForm, slug })} />
            <Input placeholder="Address" value={branchForm.address} onChange={(address) => {
              setBranchForm({ ...branchForm, address, latitude: "", longitude: "" });
              setGeocodeResults([]);
            }} />
            <Input placeholder="City" value={branchForm.city} onChange={(city) => {
              setBranchForm({ ...branchForm, city, latitude: "", longitude: "" });
              setGeocodeResults([]);
            }} />
            <Input placeholder="State" value={branchForm.state} onChange={(state) => {
              setBranchForm({ ...branchForm, state, latitude: "", longitude: "" });
              setGeocodeResults([]);
            }} />
            <Input placeholder="Phone" value={branchForm.phone} onChange={(phone) => setBranchForm({ ...branchForm, phone })} />
            <Button className="h-12 bg-white text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50 sm:col-span-2" disabled={isGeocoding} onClick={findCoordinates}>
              <MapPin className="h-4 w-4" /> {isGeocoding ? "Finding coordinates..." : "Find coordinates from address"}
            </Button>
            {geocodeResults.length > 0 && (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950 sm:col-span-2">
                <p className="font-bold">Choose the best matching location</p>
                {geocodeResults.map((result) => (
                  <div key={`${result.latitude}-${result.longitude}`} className="rounded-lg bg-white p-3">
                    <p className="text-red-950">{result.label}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <ReadOnlyValue label="Latitude" value={result.latitude} />
                      <ReadOnlyValue label="Longitude" value={result.longitude} />
                    </div>
                    <Button className="mt-3 h-10 w-full" onClick={() => confirmCoordinates(result)}>Use these coordinates</Button>
                  </div>
                ))}
              </div>
            )}
            <ReadOnlyValue label="Latitude" value={branchForm.latitude || "Not confirmed"} />
            <ReadOnlyValue label="Longitude" value={branchForm.longitude || "Not confirmed"} />
            <Button className="h-12 sm:col-span-2" onClick={createBranch}>Create branch</Button>
          </div>
        </Card>}
        <Card className="border-0 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-xl font-bold"><UserPlus className="h-5 w-5 text-[#df1f2d]" />{canCreateBranches ? "Create branch user" : "Create branch staff"}</h3>
          <p className="mt-2 text-sm text-slate-500">Use an email that is not already registered as a customer or admin.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Input placeholder="Full name" value={adminForm.fullName} onChange={(fullName) => setAdminForm({ ...adminForm, fullName })} />
            <Input placeholder="Email" value={adminForm.email} onChange={(email) => setAdminForm({ ...adminForm, email })} />
            <Input placeholder="Phone" value={adminForm.phone} onChange={(phone) => setAdminForm({ ...adminForm, phone })} />
            <Input placeholder="Temporary password" value={adminForm.password} onChange={(password) => setAdminForm({ ...adminForm, password })} type="password" />
            {canCreateBranches ? <select className="h-12 rounded-lg border border-slate-200 px-3 text-sm sm:col-span-2" value={adminForm.branchId} onChange={(event) => setAdminForm({ ...adminForm, branchId: event.target.value })}>
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select> : <ReadOnlyValue label="Branch" value={manageableBranches[0]?.name ?? "Assigned branch"} />}
            {canCreateBranches ? <select className="h-12 rounded-lg border border-slate-200 px-3 text-sm sm:col-span-2" value={adminForm.role} onChange={(event) => setAdminForm({ ...adminForm, role: event.target.value as "BRANCH_ADMIN" | "BRANCH_STAFF" })}>
              <option value="BRANCH_ADMIN">Branch admin</option>
              <option value="BRANCH_STAFF">Branch staff</option>
            </select> : <ReadOnlyValue label="Role" value="Branch staff" />}
            <Button className="h-12 sm:col-span-2" onClick={createAdmin}>Create user</Button>
          </div>
        </Card>
      </div>

      <BranchDirectory
        branches={manageableBranches}
        branchUsers={branchUsers}
        page={branchPage}
        pageCount={pageCount}
        selectedBranchId={selectedBranchId}
        visibleBranches={visibleBranches}
        onPageChange={setBranchPage}
        onSelectBranch={setSelectedBranchId}
      />
    </div>
  );
}

function BranchDirectory({ branches, branchUsers, visibleBranches, selectedBranchId, page, pageCount, onPageChange, onSelectBranch }: { branches: Branch[]; branchUsers: ApiUser[]; visibleBranches: Branch[]; selectedBranchId: string; page: number; pageCount: number; onPageChange: (page: number) => void; onSelectBranch: (branchId: string) => void }) {
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const selectedUsers = branchUsers.filter((user) => user.branchId === selectedBranchId);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card className="border-0 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-bold"><Building2 className="h-5 w-5 text-[#df1f2d]" />Branches</h3>
            <p className="mt-1 text-sm text-slate-500">{branches.length} active {branches.length === 1 ? "branch" : "branches"}</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Button className="h-9 bg-white px-3 text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
            <span>Page {page} of {pageCount}</span>
            <Button className="h-9 bg-white px-3 text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {visibleBranches.map((branch) => {
            const usersForBranch = branchUsers.filter((user) => user.branchId === branch.id);
            const isSelected = branch.id === selectedBranchId;
            return (
              <button key={branch.id} className={`rounded-lg border p-4 text-left transition ${isSelected ? "border-[#df1f2d] bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"}`} onClick={() => onSelectBranch(branch.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">{branch.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{branch.address}, {branch.city}, {branch.state}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{branch.isActive ? "Active" : "Inactive"}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <ReadOnlyValue label="Admins" value={String(usersForBranch.filter((user) => user.role === "BRANCH_ADMIN").length)} />
                  <ReadOnlyValue label="Staff" value={String(usersForBranch.filter((user) => user.role === "BRANCH_STAFF").length)} />
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">Slug: {branch.slug}</p>
              </button>
            );
          })}
          {!branches.length && <div className="md:col-span-2"><EmptyState title="No branches yet" detail="Create a branch above, then assign its admin or staff." /></div>}
        </div>
      </Card>

      <Card className="border-0 p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-[#df1f2d]" />Branch users</h3>
        {selectedBranch ? (
          <>
            <p className="mt-2 text-sm text-slate-500">{selectedBranch.name}</p>
            <div className="mt-5 space-y-3">
              {selectedUsers.map((user) => (
                <div key={user.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{user.fullName}</p>
                      <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                      {user.phone && <p className="mt-1 text-sm text-slate-500">{user.phone}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{user.role === "BRANCH_ADMIN" ? "Admin" : "Staff"}</span>
                  </div>
                </div>
              ))}
              {!selectedUsers.length && <EmptyState title="No users assigned" detail="Create a branch admin or staff account for this branch." />}
            </div>
          </>
        ) : (
          <EmptyState title="Select a branch" detail="Branch admins and staff will appear here." />
        )}
      </Card>
    </div>
  );
}

function NotificationsComposer({ customers, token }: { customers: ApiUser[]; token: string }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [channels, setChannels] = useState({ inApp: true, email: false, push: false });

  async function sendNotification() {
    try {
      await apiFetch("/api/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          userIds: selectedUserIds,
          type: "BROADCAST",
          channels: [
            ...(channels.inApp ? ["IN_APP"] : []),
            ...(channels.email ? ["EMAIL"] : []),
            ...(channels.push ? ["PUSH"] : [])
          ],
          title,
          excerpt,
          bodyHtml: body
        })
      }, token);
      setTitle("");
      setExcerpt("");
      setBody("");
      setSelectedUserIds([]);
      showToast({ type: "success", title: "Notification sent", message: "Selected customers will see it in their inbox." });
    } catch (error) {
      showToast({ type: "error", title: "Could not send notification", message: toErrorMessage(error) });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card className="border-0 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Send notification</h2>
            <p className="mt-1 text-sm text-slate-500">Send in-app and email notifications to real customer accounts.</p>
          </div>
          <Button className="w-full sm:w-auto" disabled={!selectedUserIds.length || !title || !body} onClick={sendNotification}><Bell className="h-4 w-4" /> Send</Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Short preview" value={excerpt} onChange={setExcerpt} />
        </div>
        <textarea className="mt-4 min-h-48 w-full rounded-lg border border-slate-200 bg-white p-4 text-sm outline-none focus:border-[#df1f2d]" placeholder="Message body" value={body} onChange={(event) => setBody(event.target.value)} />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Channel checked={channels.inApp} label="In-app" icon={<Bell />} onClick={() => setChannels({ ...channels, inApp: !channels.inApp })} />
          <Channel checked={channels.email} label="Email" icon={<Mail />} onClick={() => setChannels({ ...channels, email: !channels.email })} />
          <Channel checked={channels.push} label="Push pending" icon={<Bell />} disabled onClick={() => undefined} />
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">Push delivery needs a device-token provider such as FCM/APNs before it can be enabled.</p>
      </Card>
      <Card className="border-0 p-5 shadow-sm">
        <p className="text-sm font-bold uppercase text-[#df1f2d]">Audience</p>
        <div className="mt-4 space-y-2">
          {customers.map((customer) => (
            <label key={customer.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <input type="checkbox" checked={selectedUserIds.includes(customer.id)} onChange={(event) => {
                setSelectedUserIds((current) => event.target.checked ? [...current, customer.id] : current.filter((id) => id !== customer.id));
              }} />
              <span><strong>{customer.fullName}</strong><span className="block text-slate-500">{customer.email}</span></span>
            </label>
          ))}
          {!customers.length && <EmptyState title="No customers found" detail="Customers appear here after they register." />}
        </div>
      </Card>
    </div>
  );
}

function Logistics({ orders }: { orders: Order[] }) {
  const deliveryOrders = orders.filter((order) => order.deliveries?.length);
  return (
    <Card className="border-0 p-5 shadow-sm">
      <h3 className="text-xl font-bold">Delivery queue</h3>
      <div className="mt-5 space-y-3">
        {deliveryOrders.map((order) => (
          <div key={order.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <OrderRow order={order} />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {order.deliveries?.map((delivery) => (
                <div key={delivery.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <strong>{delivery.provider}</strong>
                    <span className="text-xs font-semibold text-slate-500">{formatDeliveryLeg(delivery.leg)}</span>
                  </div>
                  <p className="mt-1 text-slate-500">{delivery.status} · {formatNaira(delivery.fee)}</p>
                  {delivery.externalDeliveryId && <p className="mt-1 text-xs text-slate-500">Ref: {delivery.externalDeliveryId}</p>}
                  <div className="mt-2 rounded-md bg-white p-2 text-xs text-slate-600">
                    <p className="font-bold text-slate-900">Rider details</p>
                    {delivery.courierName || delivery.courierPhone ? (
                      <>
                        {delivery.courierName && <p className="mt-1">{delivery.courierName}</p>}
                        {delivery.courierPhone && <a className="mt-1 block font-bold text-[#0b4ea2]" href={`tel:${delivery.courierPhone}`}>{delivery.courierPhone}</a>}
                      </>
                    ) : (
                      <p className="mt-1">Rider details pending</p>
                    )}
                  </div>
                  {delivery.trackingUrl && (
                    <a className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#b91c1c]" href={delivery.trackingUrl} target="_blank" rel="noreferrer">
                      Open tracking <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {!deliveryOrders.length && <EmptyState title="No active courier jobs" detail="Pickup and return delivery jobs will appear here." />}
      </div>
    </Card>
  );
}

function AuditLogs({ token, branches, role }: { token: string; branches: Branch[]; role: AdminRole }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const branchName = (id?: string | null) => branches.find((branch) => branch.id === id)?.name ?? "Corporate";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20"
      });
      if (search.trim()) params.set("search", search.trim());
      if (branchFilter) params.set("branchId", branchFilter);
      if (roleFilter) params.set("actorRole", roleFilter);
      if (actionFilter) params.set("action", actionFilter);
      setIsLoading(true);
      apiFetch<AuditLogPage>(`/api/admin/audit-logs?${params.toString()}`, {}, token).then((result) => {
        setLogs(result.data);
        setActions(result.actions);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      }).catch((error) => {
        showToast({ type: "error", title: "Could not load audit logs", message: toErrorMessage(error) });
      }).finally(() => {
        setIsLoading(false);
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [actionFilter, branchFilter, page, roleFilter, search, showToast, token]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <Card className="border-0 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold">Audit logs</h3>
          <p className="mt-1 text-sm text-slate-500">{total.toLocaleString()} tracked admin actions. Showing 20 per page.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <input className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#df1f2d]" placeholder="Search logs" value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} />
        {role === "SUPER_ADMIN" && (
          <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={branchFilter} onChange={(event) => updateFilter(setBranchFilter, event.target.value)}>
            <option value="">All branches</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        )}
        <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={roleFilter} onChange={(event) => updateFilter(setRoleFilter, event.target.value)}>
          <option value="">All roles</option>
          <option value="SUPER_ADMIN">Super admins</option>
          <option value="BRANCH_ADMIN">Branch admins</option>
          <option value="BRANCH_STAFF">Branch staff</option>
        </select>
        <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={actionFilter} onChange={(event) => updateFilter(setActionFilter, event.target.value)}>
          <option value="">All actions</option>
          {actions.map((action) => <option key={action} value={action}>{formatAuditAction(action)}</option>)}
        </select>
      </div>
      <div className="mt-5 space-y-3">
        {isLoading && Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/3" />
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          </div>
        ))}
        {!isLoading && logs.map((log) => (
          <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-bold">{log.summary}</p>
                <p className="mt-1 text-sm text-slate-500">{formatAuditAction(log.action)} · {branchName(log.branchId)}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <ReadOnlyValue label="Actor" value={log.actorName || log.actorEmail || "System"} />
              <ReadOnlyValue label="Role" value={formatStatus(log.actorRole ?? "SYSTEM")} />
              <ReadOnlyValue label="Target" value={[log.targetType, log.targetId].filter(Boolean).join(" · ") || "None"} />
            </div>
          </div>
        ))}
        {!isLoading && !logs.length && <EmptyState title="No audit logs found" detail="Try a different search or filter." />}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-500">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button className="h-9 bg-white px-3 text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
          <Button className="h-9 bg-white px-3 text-[#0b4ea2] ring-1 ring-slate-200 hover:bg-slate-50" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
        </div>
      </div>
    </Card>
  );
}

function SettingsPanel({ role }: { role: string }) {
  return <Card className="border-0 p-5 shadow-sm"><h3 className="text-xl font-bold">Settings</h3><p className="mt-2 text-slate-500">{role === "SUPER_ADMIN" ? "Global business settings, branch provisioning, courier billing and admin permissions." : "Branch profile, staff users, service pricing and notification preferences."}</p></Card>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<input className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#df1f2d]" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Input({ placeholder, value, onChange, type = "text" }: { placeholder: string; value: string; onChange: (value: string) => void; type?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  return (
    <span className="relative block">
      <input className="h-12 w-full rounded-lg border border-slate-200 px-3 pr-11 text-sm outline-none focus:border-[#df1f2d]" placeholder={placeholder} type={isPassword && showPassword ? "text" : type} value={value} onChange={(event) => onChange(event.target.value)} />
      {isPassword && (
        <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" onClick={() => setShowPassword((current) => !current)}>
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </span>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function Channel({ checked, label, icon, disabled, onClick }: { checked: boolean; label: string; icon: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button disabled={disabled} onClick={onClick} className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm font-semibold ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : checked ? "border-[#df1f2d] bg-red-50 text-[#0b4ea2]" : "border-slate-200 bg-white text-slate-500"}`}><span className={disabled ? "text-slate-400" : "text-[#df1f2d]"}>{icon}</span>{label}</button>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center"><p className="font-bold">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>;
}

function formatNaira(value: number) {
  return `NGN ${Number(value).toLocaleString()}`;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w|\s\w/g, (match) => match.toUpperCase());
}

function formatAuditAction(action: string) {
  return formatStatus(action);
}

function formatDeliveryLeg(leg: string) {
  return leg === "PICKUP_TO_BRANCH" ? "Pickup to branch" : "Return to customer";
}
