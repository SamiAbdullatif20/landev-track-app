import { create } from "zustand";

type AuthState = "anonymous" | "authenticated";

type SessionState = {
  active: boolean;
  sessionId: string | null;
  projectId: string;
  description: string;
  startedAt: string | null;
};

type AppStore = {
  auth: AuthState;
  busy: boolean;
  lastError: string | null;
  session: SessionState;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  setAuth: (auth: AuthState) => void;
  setSession: (session: Partial<SessionState>) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  auth: "anonymous",
  busy: false,
  lastError: null,
  session: {
    active: false,
    sessionId: null,
    projectId: "",
    description: "",
    startedAt: null
  },
  setBusy: (busy) => set({ busy }),
  setError: (lastError) => set({ lastError }),
  setAuth: (auth) => set({ auth }),
  setSession: (session) => set((state) => ({ session: { ...state.session, ...session } }))
}));
