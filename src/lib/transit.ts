// Transit network data (lines, stops, curated trips) — served by GET /api/transit
// from the Supabase tables created by migrations/10_transit_network_2026-11-25.sql.
// The payload is name-based (Arabic names), so the fallback constants in
// src/lib/constants.ts (TRANSPORT_NET / CURATED_TRIPS) have the same shape.

export interface TransitStopData {
  id: string;
  name: string;
  short_name: string | null;
  district: string | null;
  lat: number;
  lon: number;
  aliases: string[];
  notes: string | null;
}

export interface TransitLineStopData {
  name: string;
  seq: number;
  note: string | null;
}

export interface TransitLineData {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  outbound_path: string | null;
  return_path: string | null;
  needs_review: boolean;
  stops: TransitLineStopData[];
}

export interface TransitTripLeg {
  /** Line name, or null for a walking leg (rendered from `note`). */
  line: string | null;
  from: string;
  to: string;
  board_text?: string;
  alight_text?: string;
  /** Full instruction text for a walking leg, e.g. "تتمشى من كلية التكنولوجيا لصيدلة". */
  note?: string;
}

export interface TransitTripData {
  id: string;
  from: string;
  to: string;
  title: string;
  legs: TransitTripLeg[];
  is_confirmed: boolean;
}

export interface TransitData {
  stops: TransitStopData[];
  lines: TransitLineData[];
  bans: { line: string; from: string; to: string }[];
  trips: TransitTripData[];
}

export function fetchTransitData(): Promise<TransitData | null> {
  return fetch('/api/transit')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && j.ok ? (j as TransitData) : null))
    .catch(() => null);
}

/** Display name for a stop in an instruction ("من المعدية" uses the short name). */
export function stopDisplayName(
  name: string,
  stopsByName: Record<string, TransitStopData>,
): string {
  const s = stopsByName[name];
  return (s && s.short_name) || name;
}

/**
 * Render a trip's legs as one instruction line, exactly in Mahmoud's format:
 * "اركب خط الأمين من المعدية وانزل عند قصر الثقافة، بعدها اركب خط الزهور وانزل عند عجوة جنب الكلية".
 * The boarding point is shown only on the first leg (a later leg boards where
 * the previous one dropped you off). A custom alight_text is a bare phrase:
 * "عند " is added unless it already starts with "قدام" or "عند"
 * ("وانزل قدام الكلية", not "وانزل عند قدام الكلية").
 * A walking leg (line === null) renders from its note.
 */
export function buildTripText(
  legs: TransitTripLeg[],
  stopsByName: Record<string, TransitStopData>,
): string {
  return legs
    .map((leg, i) => {
      const prefix = i === 0 ? '' : 'بعدها ';
      if (!leg.line) {
        return prefix + (leg.note || `تتمشى من ${leg.from} إلى ${leg.to}`);
      }
      const alight = alightPhrase(leg.alight_text, leg.to, stopsByName);
      if (i === 0) {
        const board = leg.board_text || stopDisplayName(leg.from, stopsByName);
        return `${prefix}اركب خط ${leg.line} من ${board} وانزل ${alight}`;
      }
      return `${prefix}اركب خط ${leg.line} وانزل ${alight}`;
    })
    .join('، ');
}

function alightPhrase(
  alightText: string | undefined,
  toStop: string,
  stopsByName: Record<string, TransitStopData>,
): string {
  if (!alightText) return `عند ${stopDisplayName(toStop, stopsByName)}`;
  if (alightText.startsWith('قدام') || alightText.startsWith('عند')) return alightText;
  return `عند ${alightText}`;
}

/** Same one-line format for a computed (BFS) route: legs are {l, f, t} by name. */
export function buildRouteText(
  legs: { l: string; f: string; t: string }[],
  stopsByName: Record<string, TransitStopData>,
): string {
  return legs
    .map((leg, i) => {
      const prefix = i === 0 ? '' : 'بعدها ';
      const alight = `عند ${stopDisplayName(leg.t, stopsByName)}`;
      if (i === 0) {
        const board = stopDisplayName(leg.f, stopsByName);
        return `${prefix}اركب خط ${leg.l} من ${board} وانزل ${alight}`;
      }
      return `${prefix}اركب خط ${leg.l} وانزل ${alight}`;
    })
    .join('، ');
}

export type TransitNetwork = Record<string, string[]>;
export type TransitBanMap = Record<string, number>;

/** Build the BFS network (line name -> ordered stop names) from DB lines. */
export function networkFromData(data: TransitData): {
  net: TransitNetwork;
  bans: TransitBanMap;
  stopsByName: Record<string, TransitStopData>;
  linesByName: Record<string, TransitLineData>;
} {
  const net: TransitNetwork = {};
  const linesByName: Record<string, TransitLineData> = {};
  data.lines.forEach((line) => {
    linesByName[line.name] = line;
    net[line.name] = [...line.stops]
      .sort((a, b) => a.seq - b.seq)
      .map((s) => s.name);
  });
  const bans: TransitBanMap = {};
  data.bans.forEach((b) => {
    bans[`${b.line}|${b.from}>${b.to}`] = 1;
  });
  const stopsByName: Record<string, TransitStopData> = {};
  data.stops.forEach((s) => {
    stopsByName[s.name] = s;
  });
  return { net, bans, stopsByName, linesByName };
}

/** BFS over any line network — same algorithm as planRoute in constants.ts. */
export function planRouteFromNet(
  from: string,
  to: string,
  net: TransitNetwork,
  bans: TransitBanMap,
): { l: string; f: string; t: string }[] | null {
  if (from === to) return [];
  const q: Array<{
    s: string;
    path: Array<{ l: string; f: string; t: string }>;
    used: Record<string, boolean>;
  }> = [{ s: from, path: [], used: {} }];
  const seen: Record<string, boolean> = { [from]: true };

  while (q.length > 0) {
    const cur = q.shift()!;
    for (const line in net) {
      if (cur.used[line] || !net[line].includes(cur.s)) continue;
      for (let i = 0; i < net[line].length; i++) {
        const dest = net[line][i];
        if (dest === cur.s || bans[`${line}|${cur.s}>${dest}`]) continue;
        const np = cur.path.concat([{ l: line, f: cur.s, t: dest }]);
        if (dest === to) return np;
        if (!seen[dest]) {
          seen[dest] = true;
          const u: Record<string, boolean> = { ...cur.used, [line]: true };
          q.push({ s: dest, path: np, used: u });
        }
      }
    }
  }
  return null;
}
