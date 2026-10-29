import type { Locale } from "@/lib/i18n/messages";

const PHRASES: Record<string, string> = {
  "Clocked in. Have a great shift!": "Eingestempelt. Einen guten Tag!",
  "Clocked out. Nice work today!": "Ausgestempelt. Gute Arbeit heute!",
  "Break started.": "Pause gestartet.",
  "Break ended. Back to work!": "Pause beendet. Weiter geht's!",
  "Correction request submitted for review.": "Zeitkorrektur wurde zur Prüfung gesendet.",
  "Project updated.": "Projekt aktualisiert.",
  "Project deleted.": "Projekt gelöscht.",
  "Task status updated.": "Status aktualisiert.",
  "Subtask added.": "Unteraufgabe hinzugefügt.",
  "Task deleted.": "Aufgabe gelöscht.",
  "Note saved.": "Notiz gespeichert.",
  "Time updated.": "Zeit aktualisiert.",
  "Trip added.": "Reise hinzugefügt.",
  "Trip updated.": "Reise aktualisiert.",
  "Trip deleted.": "Reise gelöscht.",
  "Expense added.": "Spese hinzugefügt.",
  "Expense removed.": "Spese entfernt.",
  "Expense claim submitted.": "Abrechnung gesendet.",
  "Booked.": "Gebucht.",
  "Reservation cancelled.": "Buchung storniert.",
  "Leave request submitted.": "Antrag gesendet.",
  "Leave request cancelled.": "Antrag zurückgezogen.",
  "Profile updated.": "Profil aktualisiert.",
  "Password updated.": "Passwort aktualisiert.",
  "Settings saved.": "Einstellungen gespeichert.",
  "Department created.": "Abteilung angelegt.",
  "Department removed.": "Abteilung entfernt.",
  "Holiday added.": "Feiertag hinzugefügt.",
  "Holiday removed.": "Feiertag entfernt.",
  "Employee updated.": "Person aktualisiert.",
  "Employee deactivated.": "Person deaktiviert.",
  "If an account exists for that email, a reset link has been sent.":
    "Falls ein Konto zu dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.",
  "Your password has been reset. You can now sign in.": "Das Passwort wurde zurückgesetzt. Du kannst dich anmelden.",
  "Done": "Erledigt",
  "Something went wrong": "Etwas ist schiefgelaufen",
  "You're already clocked in.": "Du bist schon eingestempelt.",
  "You're not currently clocked in.": "Du bist nicht eingestempelt.",
  "Clock in before starting a break.": "Stempel zuerst ein, bevor die Pause beginnt.",
  "You're already on a break.": "Du bist schon in der Pause.",
  "You don't have an active break.": "Es läuft keine Pause.",
  "Add a destination and a purpose.": "Ziel und Anlass angeben.",
  "Choose a valid date range.": "Wähle einen gültigen Zeitraum.",
  "Trip not found.": "Reise nicht gefunden.",
  "An approved claim cannot be deleted.": "Eine genehmigte Abrechnung kann nicht gelöscht werden.",
  "A submitted claim cannot be deleted. Take it back first.":
    "Eine gesendete Abrechnung kann nicht gelöscht werden. Nimm sie zuerst zurück.",
  "Only a submitted claim can be taken back.": "Nur eine gesendete Abrechnung kann zurückgenommen werden.",
  "Claim returned to draft.": "Abrechnung ist wieder ein Entwurf.",
  "Expense claim not found.": "Abrechnung nicht gefunden.",
  "That time has already passed.": "Dieser Zeitpunkt liegt schon in der Vergangenheit.",
  "End time has to be after the start.": "Das Ende muss nach dem Beginn liegen.",
  "This trip can no longer be edited.": "Diese Reise kann nicht mehr bearbeitet werden.",
  "Some expenses fall outside these dates. Remove them first.": "Einige Spesen liegen außerhalb dieser Daten. Entferne sie zuerst.",
  "The date has to fall within the trip.": "Das Datum muss in die Reise fallen.",
  "Choose the date of the expense.": "Wähle das Datum der Spese.",
  "Describe the expense.": "Beschreibe die Spese.",
  "Add a photo of the receipt.": "Füge ein Foto des Belegs hinzu.",
  "Enter the kilometres driven.": "Gib die gefahrenen Kilometer ein.",
  "Add at least one expense first.": "Füge zuerst mindestens eine Spese hinzu.",
  "This claim can no longer be edited.": "Diese Abrechnung kann nicht mehr bearbeitet werden.",
  "This claim was already submitted.": "Diese Abrechnung wurde schon gesendet.",
  "That slot is already booked.": "Dieser Zeitraum ist schon belegt.",
  "Not authenticated": "Nicht angemeldet",
  "Invalid input": "Ungültige Eingabe",
  "No employee profile linked to this account.": "Diesem Konto ist keine Person zugeordnet.",
  "Share the project with every assignee first.": "Teile das Projekt zuerst mit allen Zugewiesenen.",
};

const STATUS: Record<string, string> = {
  approved: "genehmigt",
  rejected: "abgelehnt",
};

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
}

/** Turn a stored English action message into German. Unknown text is left as is. */
export function localizeActionText(message: string | undefined, locale: Locale): string | undefined {
  if (!message || locale === "en") return message;
  const exact = PHRASES[message];
  if (exact) return exact;

  const timerStart = /^Timer started on "(.+)"\.$/.exec(message);
  if (timerStart) return fill("Timer gestartet: „{name}“.", { name: timerStart[1] });

  const timerStop = /^Stopped timer on "(.+)"\.$/.exec(message);
  if (timerStop) return fill("Timer gestoppt: „{name}“.", { name: timerStop[1] });

  const project = /^Project "(.+)" created\.$/.exec(message);
  if (project) return fill("Projekt „{name}“ angelegt.", { name: project[1] });

  const meeting = /^Meeting shared with (.+)\.$/.exec(message);
  if (meeting) return fill("Meeting mit {name} geteilt.", { name: meeting[1] });

  const assigned = /^Task assigned to (.+)\.$/.exec(message);
  if (assigned) return fill("Aufgabe an {name} vergeben.", { name: assigned[1] });

  const travel = /^Travel request (approved|rejected)\.$/.exec(message);
  if (travel) return fill("Reise {status}.", { status: STATUS[travel[1]] });

  const claim = /^Expense claim (approved|rejected)\.$/.exec(message);
  if (claim) return fill("Abrechnung {status}.", { status: STATUS[claim[1]] });

  const leave = /^Leave request (approved|rejected)\.$/.exec(message);
  if (leave) return fill("Antrag {status}.", { status: STATUS[leave[1]] });

  const correction = /^Correction (approved|rejected)\.$/.exec(message);
  if (correction) return fill("Korrektur {status}.", { status: STATUS[correction[1]] });

  const room = /^Room "(.+)" added\.$/.exec(message);
  if (room) return fill("Raum „{name}“ hinzugefügt.", { name: room[1] });

  const taken = /^Booked by (.+) until (\d{2}:\d{2})\.$/.exec(message);
  if (taken) return fill("{name} hat es bis {time}.", { name: taken[1], time: taken[2] });

  const hired = /^(.+) was added to the team\. They can sign in with (.+)\.$/.exec(message);
  if (hired) return fill("{name} ist im Team. Anmeldung mit {email}.", { name: hired[1], email: hired[2] });

  return message;
}
