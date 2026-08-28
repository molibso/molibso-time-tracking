/** Runtime clock state (not a DB column — derived from open clock entries / breaks). */
export type ClockStatus = "WORKING" | "ON_BREAK" | "OFFLINE";
