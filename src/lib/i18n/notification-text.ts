import { translate, type Locale, type MessageKey } from "@/lib/i18n/messages";

const LEAVE_TYPES: Record<string, MessageKey> = {
  vacation: "leaveType.vacation",
  sick: "leaveType.sick",
  personal: "leaveType.personal",
  "half day": "leaveType.halfDay",
  "work from home": "leaveType.wfh",
};

function leaveTypeLabel(locale: Locale, raw: string): string {
  const key = LEAVE_TYPES[raw.trim().toLowerCase()];
  return key ? translate(locale, key) : raw;
}

function dayLabel(locale: Locale, count: string): string {
  const days = Number(count);
  if (days === 1) return translate(locale, "notifications.oneDay");
  return translate(locale, "notifications.days", { count });
}

/** Turn stored English notification copy into the active language. Unknown text is left as saved. */
export function localizeNotification(
  locale: Locale,
  item: { title: string; message: string },
): { title: string; message: string } {
  if (locale === "en") return { title: item.title, message: item.message };

  if (item.title === "Clock in reminder") {
    return {
      title: translate(locale, "notifications.clockInTitle"),
      message: translate(locale, "notifications.clockInMessage"),
    };
  }
  if (item.title === "Clock out reminder") {
    return {
      title: translate(locale, "notifications.remindOutTitle"),
      message: translate(locale, "notifications.remindOutMessage"),
    };
  }
  if (item.title === "Break reminder") {
    return {
      title: translate(locale, "notifications.breakTitle"),
      message: translate(locale, "notifications.breakMessage"),
    };
  }

  const expenseSubmittedTitle = /^Expense claim — (.+)$/.exec(item.title);
  const expenseSubmitted = /^(.+) submitted expenses for (.+)\.$/.exec(item.message);
  if (expenseSubmittedTitle && expenseSubmitted) {
    return {
      title: translate(locale, "notifications.expenseTitle", { name: expenseSubmittedTitle[1] }),
      message: translate(locale, "notifications.expenseMessage", {
        name: expenseSubmitted[1],
        destination: expenseSubmitted[2],
      }),
    };
  }

  if (item.title === "Expense claim approved" || item.title === "Expense claim rejected") {
    const approved = item.title === "Expense claim approved";
    const body = /^(.+): your expenses were (approved|rejected)\.$/.exec(item.message);
    return {
      title: translate(locale, approved ? "notifications.expenseApprovedTitle" : "notifications.expenseRejectedTitle"),
      message: body
        ? translate(locale, approved ? "notifications.expenseApproved" : "notifications.expenseRejected", {
            destination: body[1],
          })
        : item.message,
    };
  }

  if (item.title === "Overtime warning") {
    return {
      title: translate(locale, "notifications.selfOvertimeTitle"),
      message: translate(locale, "notifications.selfOvertimeMessage"),
    };
  }

  const clockOutTitle = /^Clocked out — (.+)$/.exec(item.title);
  const clockOutMessage = /^(.+) was clocked out after 2 hours of overtime\.$/.exec(item.message);
  if (clockOutTitle && clockOutMessage) {
    return {
      title: translate(locale, "notifications.clockOutTitle", { name: clockOutTitle[1] }),
      message: translate(locale, "notifications.clockOutMessage", { name: clockOutMessage[1] }),
    };
  }

  const overtimeTitle = /^Overtime alert — (.+)$/.exec(item.title);
  const overtimeMessage = /^(.+) logged (.+) overtime today\.$/.exec(item.message);
  if (overtimeTitle && overtimeMessage) {
    return {
      title: translate(locale, "notifications.overtimeTitle", { name: overtimeTitle[1] }),
      message: translate(locale, "notifications.overtimeMessage", {
        name: overtimeMessage[1],
        time: overtimeMessage[2],
      }),
    };
  }

  if (item.title === "New task assigned") {
    const withDue = /^"(.+)" was assigned to you\. Due (.+)\.$/.exec(item.message);
    if (withDue) {
      return {
        title: translate(locale, "notifications.taskTitle"),
        message: translate(locale, "notifications.taskMessageDue", { title: withDue[1], date: withDue[2] }),
      };
    }
    const plain = /^"(.+)" was assigned to you\.$/.exec(item.message);
    if (plain) {
      return {
        title: translate(locale, "notifications.taskTitle"),
        message: translate(locale, "notifications.taskMessage", { title: plain[1] }),
      };
    }
  }

  const leave = /^Your (.+) request for (\d+) day\(s\) was (approved|rejected)\.$/.exec(item.message);
  if (item.title === "Leave request approved" || item.title === "Leave request rejected") {
    const approved = item.title === "Leave request approved" || leave?.[3] === "approved";
    return {
      title: translate(locale, approved ? "notifications.leaveApprovedTitle" : "notifications.leaveRejectedTitle"),
      message: leave
        ? translate(locale, approved ? "notifications.leaveApproved" : "notifications.leaveRejected", {
            type: leaveTypeLabel(locale, leave[1]),
            days: dayLabel(locale, leave[2]),
          })
        : item.message,
    };
  }

  return { title: item.title, message: item.message };
}
