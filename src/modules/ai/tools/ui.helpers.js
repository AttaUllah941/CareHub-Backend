/**
 * Generic, structured UI blocks used by the Doctor and Admin agents. The frontend renders these
 * three block types, so new tools don't need new Angular components.
 *
 *  STATS  – headline numbers          { title, stats: [{ label, value, hint? }] }
 *  TABLE  – compact tabular data      { title, columns: string[], rows: string[][] }
 *  LIST   – records with row actions  { title, items: [{ id, title, subtitle?, badge?, lines?, actions? }] }
 *
 * Row actions only carry a chat message (e.g. "Confirm appointment …"); pressing one starts the
 * normal tool → confirmation flow, so UI buttons can never bypass the confirmation gate.
 */
const MAX_ROWS = 25;
const MAX_ITEMS = 15;

const BADGE_TONES = {
  pending: 'warning',
  confirmed: 'success',
  completed: 'info',
  cancelled: 'neutral',
  rejected: 'danger',
  approved: 'success',
  placed: 'info',
  preparing: 'warning',
  out_for_delivery: 'info',
  delivered: 'success',
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
};

const toneFor = (status) => BADGE_TONES[status] || 'neutral';

const text = (value) => (value === null || value === undefined ? '' : String(value));

const stats = (title, items) => ({
  type: 'STATS',
  data: {
    title,
    stats: items.slice(0, 12).map(({ label, value, hint }) => ({
      label,
      value: text(value),
      ...(hint ? { hint: text(hint) } : {}),
    })),
  },
});

const table = (title, columns, rows) => ({
  type: 'TABLE',
  data: { title, columns, rows: rows.slice(0, MAX_ROWS).map((row) => row.map(text)) },
});

const list = (title, items) => ({
  type: 'LIST',
  data: {
    title,
    items: items.slice(0, MAX_ITEMS).map((item) => ({
      id: text(item.id),
      title: text(item.title),
      subtitle: text(item.subtitle),
      badge: item.badge ? { text: text(item.badge), tone: item.tone || toneFor(item.badge) } : null,
      lines: (item.lines || []).filter(Boolean).map(text),
      actions: (item.actions || []).slice(0, 3),
    })),
  },
});

module.exports = { stats, table, list, toneFor };
