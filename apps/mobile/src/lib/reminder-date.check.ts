import { recurringReminderDate } from "./reminder-date";

const reminder = recurringReminderDate(new Date(2026, 7, 25, 9), 1, 20, 30);
const actual = [
  reminder.getFullYear(), reminder.getMonth(), reminder.getDate(),
  reminder.getHours(), reminder.getMinutes(),
];
const expected = [2026, 7, 24, 20, 30];
if (actual.join() !== expected.join()) {
  throw new Error(`Expected ${expected.join()}, received ${actual.join()}`);
}
console.log("reminder date check passed");
