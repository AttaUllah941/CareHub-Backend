/**
 * Backward-compatible facade — delegates to the slot engine.
 */
const slotEngine = require('./slotEngine.util');

module.exports = {
  subtractBookedSlots: slotEngine.subtractBookedSlots,
  filterPastSlots: slotEngine.filterPastSlots,
  getAvailableSlots: (availability, dateStr, bookedAppointments, clinic = null) =>
    slotEngine.getAvailableSlotsForDate({
      availability,
      date: dateStr,
      bookedAppointments,
      clinic,
    }).slots,
  normalizeAppointmentDate: slotEngine.normalizeDate,
  slotEngine,
};
