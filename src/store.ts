import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { mergeSeed } from './data/mergeSeed';
import { buildSeed, SEED_VERSION } from './data/seed';
import { findPrevious, lastGrip, latestBodyweight, pickVariant } from './lib/stats';
import { defaultWorkoutName, newSet, uid } from './lib/util';
import type {
  Exercise,
  Grip,
  Gym,
  RestTimer,
  Routine,
  RoutineItem,
  SetEntry,
  Settings,
  Variant,
  Workout,
  WorkoutExercise,
  WorkoutReview,
} from './types';

export interface DataState {
  exercises: Exercise[];
  variants: Variant[];
  gyms: Gym[];
  routines: Routine[];
  /** 완료된 운동. 최신순 */
  workouts: Workout[];
  active: Workout | null;
  rest: RestTimer | null;
  settings: Settings;
  seedVersion: number;
}

interface Actions {
  // 카탈로그
  addExercise: (x: Omit<Exercise, 'id' | 'custom'>) => string;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  addVariant: (v: Omit<Variant, 'id' | 'custom'>) => string;
  updateVariant: (id: string, patch: Partial<Variant>) => void;
  // 헬스장
  addGym: (name: string) => string;
  renameGym: (id: string, name: string) => void;
  deleteGym: (id: string) => void;
  // 루틴
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  routineFromWorkout: (workoutId: string, name: string) => string;
  // 진행 중 운동
  startWorkout: (opts?: { routineId?: string; copyOf?: string }) => void;
  setActiveGym: (gymId: string | null) => void;
  renameActive: (name: string) => void;
  /** 오늘 체중 (null = 지움) */
  setActiveBodyweight: (kg: number | null) => void;
  addExercises: (exerciseIds: string[]) => void;
  removeEntry: (entryId: string) => void;
  /**
   * 운동 바꾸기. 완료한 세트가 없으면 그 자리에서 새 운동으로 교체하고,
   * 있으면 완료한 세트는 원래 운동에 남기고(미완료 세트만 정리) 바로 아래에 새 운동을 넣음.
   */
  replaceEntry: (entryId: string, exerciseId: string) => void;
  moveEntry: (entryId: string, dir: -1 | 1) => void;
  /** 진행 중 운동의 순서를 id 목록대로 바꿈 */
  reorderEntries: (ids: string[]) => void;
  setEntryVariant: (entryId: string, variantId: string | null) => void;
  setEntryGrip: (entryId: string, grip: Grip | undefined) => void;
  setEntryRest: (entryId: string, sec: number) => void;
  setEntryNote: (entryId: string, note: string) => void;
  addSet: (entryId: string) => void;
  removeSet: (entryId: string, setId: string) => void;
  updateSet: (entryId: string, setId: string, patch: Partial<SetEntry>) => void;
  /** 완료 체크를 토글하고, 새로 완료됐으면 true */
  toggleSet: (entryId: string, setId: string) => boolean;
  finishWorkout: () => string | null;
  discardWorkout: () => void;
  deleteWorkout: (id: string) => void;
  /** 운동 후 돌아보기·메모 저장 (기록 화면에서 바로) */
  setWorkoutReview: (id: string, review: WorkoutReview | undefined, note?: string) => void;
  /** 완료한 기록 고치기 (같은 id를 통째로 교체) */
  updateWorkout: (w: Workout) => void;
  // 휴식 타이머
  startRest: (sec: number, label: string) => void;
  adjustRest: (delta: number) => void;
  stopRest: () => void;
  // 설정/데이터
  updateSettings: (patch: Partial<Settings>) => void;
  importData: (data: Partial<DataState>) => void;
  resetAll: () => void;
}

export type Store = DataState & Actions;

function initialState(): DataState {
  const seed = buildSeed();
  return {
    exercises: seed.exercises,
    variants: seed.variants,
    gyms: [],
    routines: [],
    workouts: [],
    active: null,
    rest: null,
    settings: { defaultRestSec: 90, sound: true, vibrate: true, lastGymId: null, weekStart: 1 },
    seedVersion: SEED_VERSION,
  };
}

const sortWorkouts = (ws: Workout[]) => [...ws].sort((a, b) => b.startedAt - a.startedAt);

export const useStore = create<Store>()(
  persist(
    immer((set, get) => {
      const entry = (s: DataState, id: string) => s.active?.exercises.find((x) => x.id === id);

      /** 새 운동 항목: 기구 자동 선택 + 이전 기록 세트 수만큼 빈 세트 */
      const makeEntry = (
        s: DataState,
        exerciseId: string,
        gymId: string | null,
        fallback: string | null = null,
        gripOverride?: Grip,
      ): WorkoutExercise => {
        const variantId = pickVariant(s.workouts, s.variants, exerciseId, gymId, fallback);
        // 그립: 지정한 게 있으면 그것, 없으면 이 기구로 지난번에 쓴 그립
        const grip = gripOverride ?? lastGrip(s.workouts, exerciseId, variantId);
        const prev = findPrevious(s.workouts, exerciseId, variantId, grip);
        const n = prev ? Math.min(prev.entry.sets.filter((x) => x.done).length, 10) : 3;
        return {
          id: uid(),
          exerciseId,
          variantId,
          ...(grip ? { grip } : {}),
          restSec: prev?.entry.restSec ?? s.settings.defaultRestSec,
          sets: Array.from({ length: Math.max(n, 1) }, () => newSet()),
        };
      };

      return {
        ...initialState(),

        // ── 카탈로그 ──
        addExercise: (x) => {
          const id = 'c-' + uid();
          set((s) => {
            s.exercises.push({ ...x, id, custom: true });
          });
          return id;
        },
        updateExercise: (id, patch) =>
          set((s) => {
            const x = s.exercises.find((e) => e.id === id);
            if (x) Object.assign(x, patch);
          }),
        addVariant: (v) => {
          const id = `${v.exerciseId}:c-${uid()}`;
          set((s) => {
            s.variants.push({ ...v, id, custom: true });
          });
          return id;
        },
        updateVariant: (id, patch) =>
          set((s) => {
            const v = s.variants.find((x) => x.id === id);
            if (v) Object.assign(v, patch);
          }),

        // ── 헬스장 ──
        addGym: (name) => {
          const id = 'g-' + uid();
          set((s) => {
            s.gyms.push({ id, name: name.trim() });
          });
          return id;
        },
        renameGym: (id, name) =>
          set((s) => {
            const g = s.gyms.find((x) => x.id === id);
            if (g) g.name = name.trim();
          }),
        deleteGym: (id) =>
          set((s) => {
            s.gyms = s.gyms.filter((g) => g.id !== id);
            for (const v of s.variants) if (v.gymId === id) v.gymId = null;
            if (s.settings.lastGymId === id) s.settings.lastGymId = null;
            if (s.active?.gymId === id) s.active.gymId = null;
            // 지난 기록의 gymId 는 남겨 둡니다(이름만 사라짐).
          }),

        // ── 루틴 ──
        saveRoutine: (r) =>
          set((s) => {
            const i = s.routines.findIndex((x) => x.id === r.id);
            if (i >= 0) s.routines[i] = r;
            else s.routines.unshift(r);
          }),
        deleteRoutine: (id) =>
          set((s) => {
            s.routines = s.routines.filter((r) => r.id !== id);
          }),
        routineFromWorkout: (workoutId, name) => {
          const w = get().workouts.find((x) => x.id === workoutId);
          const id = 'r-' + uid();
          if (!w) return id;
          const items: RoutineItem[] = w.exercises.map((x) => ({
            id: uid(),
            exerciseId: x.exerciseId,
            variantId: x.variantId,
            ...(x.grip ? { grip: x.grip } : {}),
            restSec: x.restSec,
            sets: x.sets
              .filter((st) => st.done)
              .map((st) => ({ weight: st.weight, reps: st.reps, time: st.time })),
          }));
          set((s) => {
            s.routines.unshift({ id, name, items, createdAt: Date.now() });
          });
          return id;
        },

        // ── 진행 중 운동 ──
        startWorkout: (opts = {}) =>
          set((s) => {
            if (s.active) return;
            const gymId = s.settings.lastGymId && s.gyms.some((g) => g.id === s.settings.lastGymId) ? s.settings.lastGymId : null;
            const now = Date.now();
            const w: Workout = {
              id: 'w-' + uid(),
              name: defaultWorkoutName(now),
              startedAt: now,
              gymId,
              routineId: null,
              exercises: [],
            };
            // 체중은 지난번 기록 값을 미리 채워 둠 (운동 화면에서 바로 고칠 수 있음)
            const lastBw = latestBodyweight(s.workouts);
            if (lastBw) w.bodyweightKg = lastBw;
            const routine = opts.routineId ? s.routines.find((r) => r.id === opts.routineId) : undefined;
            const copy = opts.copyOf ? s.workouts.find((x) => x.id === opts.copyOf) : undefined;
            if (routine) {
              w.name = routine.name;
              w.routineId = routine.id;
              routine.lastUsedAt = now;
              for (const item of routine.items) {
                const e = makeEntry(s, item.exerciseId, gymId, item.variantId, item.grip);
                e.restSec = item.restSec;
                // 루틴에 적힌 무게는 루틴의 기본 기구 기준입니다. 오늘 다른 기구라면 무게는 비우고
                // 그 기구의 이전 기록(회색 힌트)을 보여 줍니다.
                const sameMachine = e.variantId === item.variantId && (!item.grip || e.grip === item.grip);
                e.sets = (item.sets.length ? item.sets : [{ weight: null, reps: null, time: null }]).map((p) =>
                  newSet({ weight: sameMachine ? p.weight : null, reps: p.reps, time: p.time }),
                );
                w.exercises.push(e);
              }
            } else if (copy) {
              w.name = copy.name;
              w.routineId = copy.routineId;
              for (const x of copy.exercises) {
                const e = makeEntry(s, x.exerciseId, gymId, x.variantId, x.grip);
                e.restSec = x.restSec;
                e.sets = x.sets.filter((st) => st.done).map(() => newSet());
                if (e.sets.length === 0) e.sets = [newSet()];
                w.exercises.push(e);
              }
            }
            s.active = w;
          }),
        setActiveGym: (gymId) =>
          set((s) => {
            if (!s.active) return;
            s.active.gymId = gymId;
            s.settings.lastGymId = gymId;
            // 아직 한 세트도 안 한 운동은 새 헬스장 기준으로 기구를 다시 고릅니다.
            // 확신할 수 없으면(null) 비워서 다른 헬스장 기구에 기록이 섞이지 않게 합니다.
            for (const e of s.active.exercises) {
              if (e.sets.some((x) => x.done)) continue;
              const v = pickVariant(s.workouts, s.variants, e.exerciseId, gymId, null);
              if (v !== e.variantId) {
                e.variantId = v;
                for (const st of e.sets) st.weight = null;
              }
            }
          }),
        setActiveBodyweight: (kg) =>
          set((s) => {
            if (!s.active) return;
            if (kg && kg > 0) s.active.bodyweightKg = kg;
            else delete s.active.bodyweightKg;
          }),
        renameActive: (name) =>
          set((s) => {
            if (s.active) s.active.name = name;
          }),
        addExercises: (ids) =>
          set((s) => {
            if (!s.active) return;
            for (const id of ids) s.active.exercises.push(makeEntry(s, id, s.active.gymId));
          }),
        replaceEntry: (entryId, exerciseId) =>
          set((s) => {
            const list = s.active?.exercises;
            if (!list || !s.active) return;
            const i = list.findIndex((x) => x.id === entryId);
            if (i < 0) return;
            const old = list[i];
            const fresh = makeEntry(s, exerciseId, s.active.gymId);
            fresh.restSec = old.restSec;
            if (old.sets.some((x) => x.done)) {
              old.sets = old.sets.filter((x) => x.done);
              list.splice(i + 1, 0, fresh);
            } else {
              list[i] = fresh;
            }
          }),
        removeEntry: (entryId) =>
          set((s) => {
            if (s.active) s.active.exercises = s.active.exercises.filter((x) => x.id !== entryId);
          }),
        moveEntry: (entryId, dir) =>
          set((s) => {
            const list = s.active?.exercises;
            if (!list) return;
            const i = list.findIndex((x) => x.id === entryId);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= list.length) return;
            [list[i], list[j]] = [list[j], list[i]];
          }),
        reorderEntries: (ids) =>
          set((s) => {
            if (!s.active) return;
            const byId = new Map(s.active.exercises.map((x) => [x.id, x]));
            const next = ids.map((id) => byId.get(id)).filter((x): x is WorkoutExercise => !!x);
            // 목록에 없던 항목(그 사이 추가된 운동)은 뒤에 붙임
            for (const x of s.active.exercises) if (!ids.includes(x.id)) next.push(x);
            s.active.exercises = next;
          }),
        setEntryVariant: (entryId, variantId) =>
          set((s) => {
            const e = entry(s, entryId);
            if (!e) return;
            const changed = e.variantId !== variantId;
            e.variantId = variantId;
            // 기구가 바뀌면 아직 완료 안 한 세트의 무게는 의미가 없어지므로 비웁니다.
            if (changed) for (const st of e.sets) if (!st.done) st.weight = null;
          }),
        setEntryGrip: (entryId, grip) =>
          set((s) => {
            const e = entry(s, entryId);
            if (!e || (e.grip ?? null) === (grip ?? null)) return;
            if (grip) e.grip = grip;
            else delete e.grip;
            // 그립이 바뀌면 무게감이 달라지므로 아직 안 한 세트의 무게는 비움 (이전 기록도 그 그립 기준으로 바뀜)
            for (const st of e.sets) if (!st.done) st.weight = null;
          }),
        setEntryRest: (entryId, sec) =>
          set((s) => {
            const e = entry(s, entryId);
            if (e) e.restSec = sec;
          }),
        setEntryNote: (entryId, note) =>
          set((s) => {
            const e = entry(s, entryId);
            if (e) e.note = note;
          }),
        addSet: (entryId) =>
          set((s) => {
            const e = entry(s, entryId);
            if (!e) return;
            const last = e.sets[e.sets.length - 1];
            e.sets.push(newSet(last ? { weight: last.weight, reps: last.reps, time: last.time } : {}));
          }),
        removeSet: (entryId, setId) =>
          set((s) => {
            const e = entry(s, entryId);
            if (e) e.sets = e.sets.filter((x) => x.id !== setId);
          }),
        updateSet: (entryId, setId, patch) =>
          set((s) => {
            const st = entry(s, entryId)?.sets.find((x) => x.id === setId);
            if (st) Object.assign(st, patch);
          }),
        toggleSet: (entryId, setId) => {
          let nowDone = false;
          set((s) => {
            const e = entry(s, entryId);
            const st = e?.sets.find((x) => x.id === setId);
            if (!e || !st) return;
            if (!st.done) {
              // 빈 칸이면 이전 기록(같은 기구) 값으로 채웁니다.
              // (화면의 회색 힌트와 같은 순서: 지난번 같은 세트 → 바로 위 세트 → 지난번 마지막 세트)
              const idx = e.sets.indexOf(st);
              const prevSets = findPrevious(s.workouts, e.exerciseId, e.variantId, e.grip)?.entry.sets.filter((x) => x.done) ?? [];
              const prev = prevSets[idx];
              const last = prevSets[prevSets.length - 1];
              const above = e.sets[idx - 1];
              if (st.weight == null) st.weight = prev?.weight ?? above?.weight ?? last?.weight ?? null;
              if (st.reps == null) st.reps = prev?.reps ?? above?.reps ?? last?.reps ?? null;
              if (st.time == null) st.time = prev?.time ?? above?.time ?? last?.time ?? null;
            }
            st.done = !st.done;
            nowDone = st.done;
          });
          return nowDone;
        },
        finishWorkout: () => {
          const a = get().active;
          if (!a) return null;
          const exercises = a.exercises
            .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
            .filter((e) => e.sets.length > 0);
          if (exercises.length === 0) return null;
          const done: Workout = { ...a, exercises, endedAt: Date.now() };
          set((s) => {
            s.workouts = sortWorkouts([done, ...s.workouts]);
            s.active = null;
            s.rest = null;
            if (done.gymId) s.settings.lastGymId = done.gymId;
          });
          return done.id;
        },
        discardWorkout: () =>
          set((s) => {
            s.active = null;
            s.rest = null;
          }),
        setWorkoutReview: (id, review, note) =>
          set((s) => {
            const w = s.workouts.find((x) => x.id === id);
            if (!w) return;
            if (review && Object.keys(review).length) w.review = review;
            else delete w.review;
            if (note !== undefined) {
              if (note.trim()) w.note = note;
              else delete w.note;
            }
          }),
        updateWorkout: (w) =>
          set((s) => {
            s.workouts = sortWorkouts(s.workouts.map((x) => (x.id === w.id ? w : x)));
          }),
        deleteWorkout: (id) =>
          set((s) => {
            s.workouts = s.workouts.filter((w) => w.id !== id);
          }),

        // ── 휴식 타이머 ──
        startRest: (sec, label) =>
          set((s) => {
            s.rest = sec > 0 ? { endAt: Date.now() + sec * 1000, total: sec, label } : null;
          }),
        adjustRest: (delta) =>
          set((s) => {
            if (!s.rest) return;
            s.rest.endAt += delta * 1000;
            s.rest.total = Math.max(1, s.rest.total + delta);
            if (s.rest.endAt <= Date.now()) s.rest = null;
          }),
        stopRest: () =>
          set((s) => {
            s.rest = null;
          }),

        // ── 설정/데이터 ──
        updateSettings: (patch) =>
          set((s) => {
            Object.assign(s.settings, patch);
          }),
        importData: (data) =>
          set(() => {
            const base = initialState();
            const merged = mergeSeed({
              ...base,
              ...data,
              settings: { ...base.settings, ...(data.settings ?? {}) },
              workouts: sortWorkouts(data.workouts ?? []),
              rest: null,
            } as DataState);
            return merged;
          }),
        resetAll: () => set(() => initialState()),
      };
    }),
    {
      name: 'machinelog-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): DataState => ({
        exercises: s.exercises,
        variants: s.variants,
        gyms: s.gyms,
        routines: s.routines,
        workouts: s.workouts,
        active: s.active,
        rest: s.rest,
        settings: s.settings,
        seedVersion: s.seedVersion,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<DataState> | undefined;
        if (!p) return current;
        const next = { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) } };
        return (p.seedVersion ?? 0) < SEED_VERSION ? { ...next, ...mergeSeed(next) } : next;
      },
    },
  ),
);

export function exportData(): string {
  const s = useStore.getState();
  const data: DataState & { app: string; exportedAt: string } = {
    app: 'machinelog',
    exportedAt: new Date().toISOString(),
    exercises: s.exercises,
    variants: s.variants,
    gyms: s.gyms,
    routines: s.routines,
    workouts: s.workouts,
    active: s.active,
    rest: null,
    settings: s.settings,
    seedVersion: s.seedVersion,
  };
  return JSON.stringify(data, null, 2);
}

// ─── 자주 쓰는 셀렉터 훅 ─────────────────────────────────────
export function useMaps() {
  const exercises = useStore((s) => s.exercises);
  const variants = useStore((s) => s.variants);
  const gyms = useStore((s) => s.gyms);
  return useMemo(
    () => ({
      ex: new Map(exercises.map((x) => [x.id, x])),
      v: new Map(variants.map((x) => [x.id, x])),
      gym: new Map(gyms.map((x) => [x.id, x])),
      tracks: Object.fromEntries(exercises.map((x) => [x.id, x.track])) as Record<string, Exercise['track']>,
    }),
    [exercises, variants, gyms],
  );
}
