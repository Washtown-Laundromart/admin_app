"use client";

import { create } from "zustand";
import type { AdminRole } from "./api";

type AdminState = {
  token?: string;
  role: AdminRole;
  branchId?: string;
  setToken: (token: string) => void;
  setRole: (role: AdminRole) => void;
  setBranchId: (branchId?: string) => void;
};

export const useAdminStore = create<AdminState>((set) => ({
  role: "SUPER_ADMIN",
  setToken: (token) => set({ token }),
  setRole: (role) => set({ role }),
  setBranchId: (branchId) => set({ branchId })
}));
