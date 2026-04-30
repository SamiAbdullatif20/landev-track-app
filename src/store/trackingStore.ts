import { create } from "zustand";

export type Project = {
  id: string;
  name: string;
};

export type SessionState = {
  active: boolean;
  sessionId: string | null;
  projectId: string;
  description: string;
  startedAt: string | null;
};

type TrackingStore = {
  projects: Project[];
  projectsLoading: boolean;
  sessionLoading: boolean;
  session: SessionState;
  error: string | null;
  setProjects: (projects: Project[]) => void;
  setProjectsLoading: (loading: boolean) => void;
  setSessionLoading: (loading: boolean) => void;
  setSession: (session: Partial<SessionState>) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialSession: SessionState = {
  active: false,
  sessionId: null,
  projectId: "",
  description: "",
  startedAt: null
};

export const useTrackingStore = create<TrackingStore>((set) => ({
  projects: [],
  projectsLoading: false,
  sessionLoading: false,
  session: initialSession,
  error: null,
  setProjects: (projects) => set({ projects }),
  setProjectsLoading: (projectsLoading) => set({ projectsLoading }),
  setSessionLoading: (sessionLoading) => set({ sessionLoading }),
  setSession: (session) => set((state) => ({ session: { ...state.session, ...session } })),
  setError: (error) => set({ error }),
  reset: () => set({ projects: [], projectsLoading: false, sessionLoading: false, session: initialSession, error: null })
}));
