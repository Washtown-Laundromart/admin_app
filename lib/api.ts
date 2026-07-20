// Admin should call only the FreshFold backend; courier and payment secrets stay in backend `.env`.
export const API_BASE_URL = "/api/freshfold";

export type AdminRole = "SUPER_ADMIN" | "BRANCH_ADMIN" | "BRANCH_STAFF";

export type ApiUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  defaultAddress?: string | null;
  role: AdminRole | "CUSTOMER";
  branchId?: string | null;
  createdAt?: string;
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

export type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  phone?: string | null;
  isActive: boolean;
};

export type Bill = {
  id: string;
  total: number;
  deliveryFee: number;
  cleaningSubtotal: number;
  paidAt?: string | null;
  paystackUrl?: string | null;
  items?: Array<{
    id: string;
    itemName: string;
    serviceType: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

export type DeliveryJob = {
  id: string;
  provider: "RELAY" | "BOLT" | "KWIK" | "SHIPBUBBLE";
  leg: "PICKUP_TO_BRANCH" | "BRANCH_TO_CUSTOMER";
  status: string;
  fee: number;
  trackingUrl?: string | null;
  externalDeliveryId?: string | null;
  courierName?: string | null;
  courierPhone?: string | null;
};

export type Order = {
  id: string;
  code: string;
  status: string;
  pickupAddress: string;
  dropoffAddress?: string | null;
  customerNote?: string | null;
  fulfillmentMethod?: "STORE_PICKUP" | "HOME_DELIVERY";
  photoUrls?: string[];
  createdAt: string;
  branch: Branch;
  customer?: ApiUser;
  bill?: Bill | null;
  deliveries?: DeliveryJob[];
  requestedItems?: unknown;
};

export type AnalyticsResponse = {
  cards: {
    revenue: number;
    orders: number;
    averageTicket: number;
    failedHandovers: number;
  };
  byBranch: Array<{ branch: string; orders: number; revenue: number }>;
  logistics: {
    averagePickupWait: number;
    averageTransitTime: number;
    onTimeDelivery: number;
  };
};

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof TypeError) {
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 800));
          continue;
        }
        throw new Error("FreshFold could not reach its server right now. Please try again later.");
      }
      throw error;
    }
  }

  throw new Error("FreshFold could not reach its server right now. Please try again later.");
}

export function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as { message?: string };
      return friendlyErrorMessage(parsed.message ?? error.message);
    } catch {
      return friendlyErrorMessage(error.message);
    }
  }
  return "Something went wrong. Please try again.";
}

function friendlyErrorMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? "";
  if (normalized.includes("invalid credentials")) return "The email or password is not correct. Please check it and try again.";
  if (normalized.includes("forbidden")) return "Your admin account is not allowed to do that.";
  if (normalized.includes("missing bearer") || normalized.includes("invalid or expired")) return "Your session has expired. Please sign in again.";
  if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("can't reach")) {
    return "We could not connect to FreshFold right now. Please check your internet connection and try again.";
  }
  if (normalized.includes("could not connect to freshfold at")) return message ?? "We could not connect to FreshFold right now.";
  if (normalized.includes("unique constraint") || normalized.includes("already exists")) return "An account with this email already exists. Use a different email address.";
  return message && message.length < 140 ? message : "Something went wrong. Please try again.";
}
