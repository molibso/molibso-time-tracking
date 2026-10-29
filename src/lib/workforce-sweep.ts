import { enforceAllOpenShifts } from "@/lib/overtime-guard";
import { sendWorkdayReminders } from "@/lib/workday-reminders";

/** Clock out anyone past 2 hours of overtime, then send the workday reminders. */
export async function runWorkforceSweep() {
  await enforceAllOpenShifts();
  await sendWorkdayReminders();
}
