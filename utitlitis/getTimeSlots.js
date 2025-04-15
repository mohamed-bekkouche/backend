export function generateTimeSlots(selectedDate) {
  const slots = [];
  const start = 8 * 60; // 8:00 in minutes
  const end = 16 * 60; // 16:00 in minutes

  const baseDate = new Date(selectedDate);

  const dayOfWeek = baseDate.getDay();

  // Skip if the day is Friday (5) or Saturday (6)
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    return slots;
  }

  for (let mins = start; mins < end; mins += 30) {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;

    const slot = new Date(baseDate);
    slot.setHours(hours, minutes, 0, 0);
    slots.push(slot);
  }

  return slots;
}
