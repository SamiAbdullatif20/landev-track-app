import { create } from "zustand";

export type AuthStatus = "unknown" | "anonymous" | "authenticated";

type AuthStore = {
  status: AuthStatus;
  username: string;
  roles: string[];
  loading: boolean;
  error: string | null;
  setStatus: (status: AuthStatus) => void;
  setUsername: (username: string) => void;
  setRoles: (roles: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  status: "unknown",
  username: "",
  roles: [],
  loading: false,
  error: null,
  setStatus: (status) => set({ status }),
  setUsername: (username) => set({ username }),
  setRoles: (roles) => set({ roles }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ status: "anonymous", username: "", roles: [], loading: false, error: null })
}));
