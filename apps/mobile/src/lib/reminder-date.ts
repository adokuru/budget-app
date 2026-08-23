export function recurringReminderDate(
  dueAt: Date,
  daysBefore: number,
  hour: number,
  minute: number
): Date {
  const reminder = new Date(dueAt);
  reminder.setDate(reminder.getDate() - daysBefore);
  reminder.setHours(hour, minute, 0, 0);
  return reminder;
}
