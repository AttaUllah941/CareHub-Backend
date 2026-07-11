/**
 * Converts 12-hour time (e.g. "10:00 AM") to 24-hour "HH:mm".
 * Returns the input unchanged if already in 24-hour format.
 */
const time12hTo24h = (slot) => {
  if (!slot || typeof slot !== 'string') return slot;

  const trimmed = slot.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return trimmed;

  let hours = Number(match[1]);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

module.exports = { time12hTo24h };
