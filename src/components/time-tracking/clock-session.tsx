"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ClockStatus } from "@/types/clock";

export type ClockSessionState = {
  status: ClockStatus;
  clockInTime: string | null;
  breakSince: string | null;
  completedBreakSecondsOnOpen: number;
};

type ClockSessionContextValue = {
  session: ClockSessionState;
  /** Optimistic update. Held until the server reports the same shift. */
  commit: (next: ClockSessionState) => void;
  /** Put the previous session back after a failed action. */
  restore: (previous: ClockSessionState) => void;
};

const ClockSessionContext = createContext<ClockSessionContextValue | null>(null);

function sameShift(a: ClockSessionState, b: ClockSessionState) {
  return (
    a.status === b.status &&
    Boolean(a.clockInTime) === Boolean(b.clockInTime) &&
    Boolean(a.breakSince) === Boolean(b.breakSince)
  );
}

/** Keep the earlier instant so a later server timestamp cannot rewind the timer. */
function earlierIso(current: string | null, server: string | null) {
  if (!current) return server;
  if (!server) return current;
  return new Date(current).getTime() <= new Date(server).getTime() ? current : server;
}

export function ClockSessionProvider({
  initial,
  children,
}: {
  initial: ClockSessionState;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState(initial);
  const override = useRef(false);
  const serverKey = `${initial.status}|${initial.clockInTime ?? ""}|${initial.breakSince ?? ""}|${initial.completedBreakSecondsOnOpen}`;
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    const server = initialRef.current;
    setSession((current) => {
      if (override.current && !sameShift(current, server)) return current;
      override.current = false;
      if (!sameShift(current, server)) return server;
      return {
        ...server,
        clockInTime: earlierIso(current.clockInTime, server.clockInTime),
        breakSince: earlierIso(current.breakSince, server.breakSince),
      };
    });
  }, [serverKey]);

  const commit = useCallback((next: ClockSessionState) => {
    override.current = true;
    setSession(next);
  }, []);

  const restore = useCallback((previous: ClockSessionState) => {
    override.current = false;
    setSession(previous);
  }, []);

  return (
    <ClockSessionContext.Provider value={{ session, commit, restore }}>{children}</ClockSessionContext.Provider>
  );
}

export function useClockSession() {
  const ctx = useContext(ClockSessionContext);
  if (!ctx) throw new Error("Clock controls must be inside ClockSessionProvider");
  return ctx;
}
