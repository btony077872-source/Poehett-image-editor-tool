import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FitMode,
  LogoWatermarkAsset,
  LogoWatermarkState,
  PadBackdrop,
} from '../types';

export interface EditSnapshot {
  activeItemId: string | null;
  offsetX: number;
  offsetY: number;
  zoom: number;
  fitMode: FitMode;
  autoCropEnabled: boolean;
  padBackdrop: PadBackdrop;
  padColor: string;
  blurRadius: number;
  padInset: number;
  showGrid: boolean;
  logoWatermark: LogoWatermarkState;
  logoAsset: LogoWatermarkAsset | null;
}

export type EditChannel = 'discrete' | 'framing' | 'logo';

const MAX_HISTORY_ENTRIES = 40;
const COALESCE_DELAY_MS = 360;

function cloneLogoWatermark(lw: LogoWatermarkState): LogoWatermarkState {
  return {
    ...lw,
    bgRemoval: { ...lw.bgRemoval },
  };
}

export function cloneSnapshot(snap: EditSnapshot): EditSnapshot {
  return {
    ...snap,
    logoWatermark: cloneLogoWatermark(snap.logoWatermark),
  };
}

export function areSnapshotsEqual(a: EditSnapshot, b: EditSnapshot): boolean {
  if (
    a.activeItemId !== b.activeItemId ||
    Math.abs(a.offsetX - b.offsetX) > 0.0005 ||
    Math.abs(a.offsetY - b.offsetY) > 0.0005 ||
    Math.abs(a.zoom - b.zoom) > 0.0005 ||
    a.fitMode !== b.fitMode ||
    a.autoCropEnabled !== b.autoCropEnabled ||
    a.padBackdrop !== b.padBackdrop ||
    a.padColor !== b.padColor ||
    a.blurRadius !== b.blurRadius ||
    a.padInset !== b.padInset ||
    a.showGrid !== b.showGrid ||
    a.logoAsset !== b.logoAsset
  ) {
    return false;
  }

  const la = a.logoWatermark;
  const lb = b.logoWatermark;
  if (
    la.enabled !== lb.enabled ||
    la.sizePercent !== lb.sizePercent ||
    Math.abs(la.opacity - lb.opacity) > 0.001 ||
    la.position !== lb.position ||
    la.marginPercent !== lb.marginPercent ||
    la.rotation !== lb.rotation ||
    la.gifMotion !== lb.gifMotion ||
    la.gifSpeed !== lb.gifSpeed ||
    la.gifFps !== lb.gifFps ||
    la.bgRemoval.enabled !== lb.bgRemoval.enabled ||
    la.bgRemoval.mode !== lb.bgRemoval.mode ||
    la.bgRemoval.tolerance !== lb.bgRemoval.tolerance ||
    la.bgRemoval.smoothness !== lb.bgRemoval.smoothness ||
    la.bgRemoval.edgeTrim !== lb.bgRemoval.edgeTrim ||
    la.bgRemoval.removeInteriorHoles !== lb.bgRemoval.removeInteriorHoles ||
    la.bgRemoval.defringe !== lb.bgRemoval.defringe ||
    la.bgRemoval.targetColor !== lb.bgRemoval.targetColor
  ) {
    return false;
  }

  return true;
}

export function useEditHistory() {
  const pastRef = useRef<EditSnapshot[]>([]);
  const futureRef = useRef<EditSnapshot[]>([]);
  const pendingRef = useRef<{
    base: EditSnapshot;
    latest: EditSnapshot;
    channel: 'framing' | 'logo';
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  const [counts, setCounts] = useState({ undo: 0, redo: 0 });

  const syncCounts = useCallback(() => {
    const undo = pastRef.current.length + (pendingRef.current ? 1 : 0);
    const redo = futureRef.current.length;
    setCounts((prev) =>
      prev.undo === undo && prev.redo === redo ? prev : { undo, redo }
    );
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flushPending = useCallback(() => {
    clearTimer();
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;

    if (!areSnapshotsEqual(pending.base, pending.latest)) {
      pastRef.current.push(pending.base);
      if (pastRef.current.length > MAX_HISTORY_ENTRIES) {
        pastRef.current.shift();
      }
    }
    syncCounts();
  }, [clearTimer, syncCounts]);

  const recordEdit = useCallback(
    (before: EditSnapshot, after: EditSnapshot, channel: EditChannel) => {
      if (areSnapshotsEqual(before, after)) return;

      if (channel === 'discrete') {
        flushPending();
        pastRef.current.push(cloneSnapshot(before));
        if (pastRef.current.length > MAX_HISTORY_ENTRIES) {
          pastRef.current.shift();
        }
        futureRef.current = [];
        syncCounts();
        return;
      }

      // Continuous gesture/slider channel ('framing' or 'logo')
      if (pendingRef.current && pendingRef.current.channel !== channel) {
        flushPending();
      }

      if (!pendingRef.current) {
        pendingRef.current = {
          base: cloneSnapshot(before),
          latest: cloneSnapshot(after),
          channel,
        };
      } else {
        pendingRef.current.latest = cloneSnapshot(after);
      }

      futureRef.current = [];
      syncCounts();

      clearTimer();
      timerRef.current = window.setTimeout(() => {
        flushPending();
      }, COALESCE_DELAY_MS);
    },
    [clearTimer, flushPending, syncCounts]
  );

  const undo = useCallback(
    (current: EditSnapshot): EditSnapshot | null => {
      clearTimer();

      if (pendingRef.current) {
        const target = pendingRef.current.base;
        pendingRef.current = null;
        if (!areSnapshotsEqual(target, current)) {
          futureRef.current.push(cloneSnapshot(current));
          syncCounts();
          return cloneSnapshot(target);
        }
      }

      const target = pastRef.current.pop();
      if (!target) {
        syncCounts();
        return null;
      }

      futureRef.current.push(cloneSnapshot(current));
      if (futureRef.current.length > MAX_HISTORY_ENTRIES) {
        futureRef.current.shift();
      }
      syncCounts();
      return cloneSnapshot(target);
    },
    [clearTimer, syncCounts]
  );

  const redo = useCallback(
    (current: EditSnapshot): EditSnapshot | null => {
      flushPending();
      const target = futureRef.current.pop();
      if (!target) {
        syncCounts();
        return null;
      }

      pastRef.current.push(cloneSnapshot(current));
      if (pastRef.current.length > MAX_HISTORY_ENTRIES) {
        pastRef.current.shift();
      }
      syncCounts();
      return cloneSnapshot(target);
    },
    [flushPending, syncCounts]
  );

  const clearHistory = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    pastRef.current = [];
    futureRef.current = [];
    syncCounts();
  }, [clearTimer, syncCounts]);

  const getReferencedLogos = useCallback((): Set<LogoWatermarkAsset> => {
    const refs = new Set<LogoWatermarkAsset>();
    for (const s of pastRef.current) {
      if (s.logoAsset) refs.add(s.logoAsset);
    }
    for (const s of futureRef.current) {
      if (s.logoAsset) refs.add(s.logoAsset);
    }
    if (pendingRef.current?.base.logoAsset) {
      refs.add(pendingRef.current.base.logoAsset);
    }
    if (pendingRef.current?.latest.logoAsset) {
      refs.add(pendingRef.current.latest.logoAsset);
    }
    return refs;
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    canUndo: counts.undo > 0,
    canRedo: counts.redo > 0,
    undoCount: counts.undo,
    redoCount: counts.redo,
    recordEdit,
    undo,
    redo,
    clearHistory,
    getReferencedLogos,
  };
}
