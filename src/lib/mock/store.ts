import type { Store } from "./types";

const globalStore = globalThis as unknown as { __mockStore?: Store };

export function getStore(): Store {
  if (!globalStore.__mockStore) {
    globalStore.__mockStore = createEmptyStore();
  }
  return globalStore.__mockStore;
}

export function createEmptyStore(): Store {
  return {
    users: [],
    employees: [],
    departments: [],
    clockEntries: [],
    breaks: [],
    attendances: [],
    leaveRequests: [],
    correctionRequests: [],
    notifications: [],
    companySettings: [],
    holidays: [],
    shifts: [],
    passwordResetTokens: [],
    auditLogs: [],
  };
}

export function resetStore() {
  globalStore.__mockStore = createEmptyStore();
  idCounter = 0;
}

let idCounter = 0;

export function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}${idCounter.toString(36)}`;
}

export function now() {
  return new Date();
}
