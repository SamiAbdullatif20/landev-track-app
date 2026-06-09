import { clearActiveSessionProjectName } from "../db/work-log";
import {
  clearActiveSessionOwner,
  getActiveSessionOwnerKey,
  getCurrentAppUserKey,
  isActiveSessionOwnedByCurrentUser
} from "../db/user-scope";
import { getSessionState, resetActiveSessionState, saveSessionState, setSetting } from "../db/queue-repo";
import { stopSessionPowerBlocker } from "./session-power";

export type ReleaseForeignSessionOptions = {
  stopCapture: () => void;
  notifyStatus: () => void;
};

export function releaseActiveSessionIfForeignUser(options: ReleaseForeignSessionOptions): boolean {
  const state = getSessionState();
  if (!state.active) {
    return false;
  }

  const current = getCurrentAppUserKey();
  const owner = getActiveSessionOwnerKey();
  if (!current) {
    return false;
  }

  if (owner && owner === current) {
    return false;
  }

  options.stopCapture();
  stopSessionPowerBlocker();
  resetActiveSessionState();
  clearActiveSessionOwner();
  clearActiveSessionProjectName();
  setSetting("activeSessionIsNonChargeable", "false");
  options.notifyStatus();
  return true;
}

export function sessionStateForCurrentUser(): {
  active: boolean;
  sessionId: string | null;
  projectId: string | null;
  description: string | null;
  startedAt: string | null;
} {
  const state = getSessionState();
  if (!state.active) {
    return {
      active: false,
      sessionId: state.sessionId,
      projectId: state.projectId,
      description: state.description,
      startedAt: state.startedAt
    };
  }

  if (!isActiveSessionOwnedByCurrentUser()) {
    return {
      active: false,
      sessionId: null,
      projectId: null,
      description: null,
      startedAt: null
    };
  }

  return {
    active: true,
    sessionId: state.sessionId,
    projectId: state.projectId,
    description: state.description,
    startedAt: state.startedAt
  };
}
