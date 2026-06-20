"use client";

import { create } from "zustand";

type AdminState = {
  token?: string;
  role: "SUPER_ADMIN" | "BRANCH_ADMIN";
  branchId?: string;
  setToken: (token: string) => void;
  setRole: (role: "SUPER_ADMIN" | "BRANCH_ADMIN") => void;
};

export const useAdminStore = create<AdminState>((set) => ({
  role: "SUPER_ADMIN",
  setToken: (token) => set({ token }),
  setRole: (role) => set({ role })
}));
