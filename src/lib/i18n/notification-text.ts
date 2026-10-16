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
