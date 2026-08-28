"use client";

/* =============================================================================
 * The bridge between the two sides of Samanvay.
 *
 * A resident accepting a suggestion is not a private event. It changes what the
 * operator is looking at — the consent coverage, the queue, the feed — and the
 * whole argument of the product is that the two views are the same set of facts
 * seen from two ends. So they share one store.
 *
 * The store is localStorage, mirrored across tabs by BroadcastChannel, which
 * means the resident app and the operator console can sit in two windows on the
 * same machine and stay in step without a server. Everything is last-write-wins
 * on a single object; there is no merge, because there is one society.
 *
 * It is exposed through useSyncExternalStore rather than an effect, so the
 * server renders the empty society, hydration matches, and the stored value is
 * adopted in the commit that follows.
 * ========================================================================== */

import { useCallback, useSyncExternalStore } from "react";

const KEY = "samanvay.society.v1";
const CHANNEL = "samanvay";

/* ------------------------------------------------------------ the shape */

export type EventKind =
  | "accepted" | "declined" | "turned_off" | "reconsidered"
  | "paused" | "resumed" | "medical_on" | "medical_off"
  | "tier_on" | "tier_off" | "pledged" | "requested" | "withdrew";

export interface SocietyEvent {
  id: string;
  /** Wall clock, so the operator sees "2 min ago" and not a sequence number. */
  at: number;
  flat: string;
  kind: EventKind;
  text: string;
  /** Rupees a month, where the event moves money. */
  rupees?: number;
}

export interface ResidentRequestWire {
  id: string;
  flat: string;
  household: string;
  kind: string;
  ask: string;
  when: string;
  reason: string;
  magnitude: string;
  at: number;
}

export interface Shared {
  /** True once the app has written its opening state, so a fresh browser gets
   * the seed and a returning one does not get it a second time. */
  seeded: boolean;
  /** Suggestions this flat is running, and what they are worth a month. */
  accepted: {
    id: string; label: string; rupees: number;
    since: string; savedSoFar: number; running: boolean;
  }[];
  declined: { id: string; label: string; forgone: number; on: string; reason?: string }[];
  paused: boolean;
  medical: boolean;
  tier2: boolean;
  tier3: boolean;
  /** The answer to the last management notice. */
  pledge: "will_try" | "cannot" | null;
  requests: ResidentRequestWire[];
  events: SocietyEvent[];
}

export const EMPTY: Shared = {
  seeded: false,
  accepted: [],
  declined: [],
  paused: false,
  medical: false,
  tier2: true,
  tier3: false,
  pledge: null,
  requests: [],
  events: [],
};

/* --------------------------------------------------------------- the store */

function read(): Shared {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Shared>) };
  } catch {
    /* A private window, cleared site data, or storage the browser refuses.
     * Both apps must render correctly with no stored value at all. */
    return EMPTY;
  }
}

/* getSnapshot must return a stable reference between real changes, or
 * useSyncExternalStore will loop, so the parsed value is cached here and only
 * replaced when something actually writes. */
let snapshot: Shared = EMPTY;
let loaded = false;

const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function announce() {
  for (const l of listeners) l();
}

function adopt(next: Shared) {
  snapshot = next;
  loaded = true;
  announce();
}

function onStorage(e: StorageEvent) {
  if (e.key === KEY) adopt(read());
}

function subscribe(cb: () => void) {
  listeners.add(cb);

  if (listeners.size === 1) {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (e: MessageEvent<Shared>) => adopt({ ...EMPTY, ...e.data });
    }
    /* BroadcastChannel covers same-origin tabs; the storage event covers the
     * browsers that do not have it. */
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      channel?.close();
      channel = null;
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot(): Shared {
  if (!loaded) {
    snapshot = read();
    loaded = true;
  }
  return snapshot;
}

/* The server has no society. Rendering EMPTY on both sides keeps hydration
 * honest; the stored value arrives in the next commit. */
function getServerSnapshot(): Shared {
  return EMPTY;
}

function commit(next: Shared) {
  adopt(next);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Nothing to do — the session simply will not survive a reload. */
  }
  channel?.postMessage(next);
}

/* ---------------------------------------------------------------- the hook */

const alwaysMounted = () => true;
const neverOnServer = () => false;
const noSubscribe = () => () => {};

/**
 * One shared object, live in every tab that asks for it.
 *
 * Returns the current state, whether the client has mounted (so callers can
 * hold off writing until the stored value is in hand), a plain updater, and a
 * helper that records why a change happened in the same write.
 */
export function useShared() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(noSubscribe, alwaysMounted, neverOnServer);

  const update = useCallback((fn: (s: Shared) => Shared) => {
    commit(fn(getSnapshot()));
  }, []);

  const emit = useCallback(
    (fn: (s: Shared) => Shared, event: Omit<SocietyEvent, "id" | "at">) => {
      const next = fn(getSnapshot());
      commit({
        ...next,
        events: [
          { ...event, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() },
          ...next.events,
        ].slice(0, 40),
      });
    },
    [],
  );

  return { state, ready, update, emit };
}

/* ---------------------------------------------------------------- format */

export function ago(at: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} sec ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

export const EVENT_TONE: Record<EventKind, "confirm" | "warn" | "neutral"> = {
  accepted: "confirm",
  reconsidered: "confirm",
  resumed: "confirm",
  medical_off: "confirm",
  tier_on: "confirm",
  pledged: "confirm",
  declined: "neutral",
  turned_off: "warn",
  paused: "warn",
  medical_on: "warn",
  tier_off: "warn",
  requested: "neutral",
  withdrew: "neutral",
};
