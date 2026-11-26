import { useMemo, useState } from 'react';
import { BRAND_ALIASES, EQUIPMENT_ALIASES, LOADING_ALIASES, brandMatchesWithLegacy, brandNote, norm } from '../data/aliases';
import { BRANDS } from '../data/seed';
import { useStore } from '../store';
import type { Loading, SetEntry, Variant } from '../types';
import { EQUIPMENT_LABEL, LOADING_LABEL } from '../types';
import { topSet } from '../lib/stats';
import { fmtSet, fmtShortDate, isBrandable, variantDetail, variantTitle } from '../lib/util';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { VariantForm } from './VariantForm';

interface Usage {
  lastAt: number;
  top: SetEntry | null;
  usedAtGym: boolean;
}

/** 기구 목록이 이보다 길면 검색창을 보여 줍니다. */
const SEARCH_THRESHOLD = 6;
type QuickKind = { equipment: 'machine' | 'cable' | 'smith'; loading?: Loading };

/** 운동 중 "어떤 기구로 하는지" 고르는 시트 */
export function VariantPicker({
  exerciseId,
  currentId,
  gymId,
  onPick,
  onClose,
  allowNone = false,
}: {
  exerciseId: string;
  currentId: string | null;
  gymId: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
  /** 루틴 편집용: "운동할 때 고르기" 선택지 표시 */
  allowNone?: boolean;
}) {
  const exercise = useStore((s) => s.exercises.find((x) => x.id === exerciseId));
  const allVariants = useStore((s) => s.variants);
  const workouts = useStore((s) => s.workouts);
  const gyms = useStore((s) => s.gyms);
  const addVariant = useStore((s) => s.addVariant);
  const updateVariant = useStore((s) => s.updateVariant);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');

  const usage = useMemo(() => {
    const map = new Map<string, Usage>();
    for (const w of workouts) {
      for (const e of w.exercises) {
        if (e.exerciseId !== exerciseId || !e.variantId) continue;
        const u = map.get(e.variantId);
        if (!u) map.set(e.variantId, { lastAt: w.startedAt, top: topSet(e.sets, exercise?.track ?? 'weight'), usedAtGym: !!gymId && w.gymId === gymId });
        else if (gymId && w.gymId === gymId) u.usedAtGym = true;
      }
    }
    return map;
  }, [workouts, exerciseId, gymId, exercise?.track]);

  const all = useMemo(() => {
    const vs = allVariants.filter((v) => v.exerciseId === exerciseId && (!v.archived || v.id === currentId));
    const rank = (v: Variant) => {
      const u = usage.get(v.id);
      if (gymId && (v.gymId === gymId || u?.usedAtGym)) return 0;
      if (gymId && v.gymId && v.gymId !== gymId) return 3;
      return u ? 1 : 2;
    };
    return vs
      .map((v, i) => ({ v, i, r: rank(v), last: usage.get(v.id)?.lastAt ?? 0 }))
      .sort((a, b) => a.r - b.r || b.last - a.last || a.i - b.i)
      .map((x) => x.v);
  }, [allVariants, exerciseId, currentId, usage, gymId]);

  // 검색: 브랜드(한글/영어), 모델, 종류, 플레이트/핀, 헬스장 이름
  const tokens = q.split(/\s+/).map(norm).filter(Boolean);
  const list = useMemo(() => {
    if (tokens.length === 0) return all;
    return all.filter((v) => {
      const hay = [
        variantTitle(v),
        v.brand,
        ...(v.brand ? BRAND_ALIASES[v.brand] ?? [] : []),
        v.model,
        v.label,
        EQUIPMENT_LABEL[v.equipment],
        ...EQUIPMENT_ALIASES[v.equipment],
        v.loading ? LOADING_LABEL[v.loading] : '',
        ...(v.loading ? LOADING_ALIASES[v.loading] : []),
        v.gymId ? gyms.find((g) => g.id === v.gymId)?.name : '',
      ]
        .filter(Boolean)
        .map((s) => norm(s!));
      return tokens.every((t) => hay.some((h) => h.includes(t)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, gyms]);

  // 검색한 브랜드가 이 운동에 아직 없으면 바로 등록할 수 있게 제안
  const quickAdds = useMemo(() => {
    const text = q.trim();
    if (!text || exercise?.track === 'time') return [];
    const known = new Set<string>(Object.values(BRANDS));
    for (const v of allVariants) if (v.brand) known.add(v.brand);
    // 이 운동에 케이블·스미스 기구가 있으면 그 브랜드 버전도 제안 (예: 라이프피트니스 케이블)
    const own = allVariants.filter((v) => v.exerciseId === exerciseId);
    const kinds: QuickKind[] = [];
    for (const eq of ['cable', 'smith'] as const) if (own.some((v) => v.equipment === eq)) kinds.push({ equipment: eq });
    kinds.push({ equipment: 'machine', loading: 'stack' }, { equipment: 'machine', loading: 'plate' });
    const out: (QuickKind & { brand: string; archived?: Variant })[] = [];
    for (const brand of known) {
      if (!brandMatchesWithLegacy(brand, text)) continue;
      for (const k of kinds) {
        const existing = own.find((v) => v.brand === brand && v.equipment === k.equipment && v.loading === k.loading);
        if (existing && !existing.archived) continue;
        out.push({ ...k, brand, archived: existing });
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [q, allVariants, exerciseId, exercise?.track]);

  const gymName = gymId ? gyms.find((g) => g.id === gymId)?.name : null;

  // 케이블·스미스 기구가 있는 운동: 브랜드를 탭 한 번으로 고르는 칩.
  // 이 헬스장에서 다른 운동에 쓴 브랜드 케이블(=같은 케이블 스테이션)이 맨 앞에 옴
  const [brandsOpen, setBrandsOpen] = useState<Record<string, boolean>>({});
  const brandRows = useMemo(() => {
    const own = allVariants.filter((v) => v.exerciseId === exerciseId);
    const vmap = new Map(allVariants.map((v) => [v.id, v]));
    return (['cable', 'smith'] as const)
      .filter((eq) => own.some((v) => v.equipment === eq))
      .map((eq) => {
        const atGym = new Set<string>();
        const used = new Set<string>();
        for (const w of workouts)
          for (const e of w.exercises) {
            const v = e.variantId ? vmap.get(e.variantId) : undefined;
            if (v?.equipment !== eq || !v.brand) continue;
            used.add(v.brand);
            if (gymId && w.gymId === gymId) atGym.add(v.brand);
          }
        const taken = new Set(own.filter((v) => v.equipment === eq && v.brand && !v.archived).map((v) => v.brand!));
        const order = [...atGym, ...used, ...Object.values(BRANDS)].filter((b, i, a) => a.indexOf(b) === i && !taken.has(b));
        return { eq, brands: order.map((b) => ({ brand: b, atGym: atGym.has(b) })) };
      });
  }, [allVariants, workouts, exerciseId, gymId]);
  const pickBrand = (eq: 'cable' | 'smith', brand: string) => {
    const archived = allVariants.find((v) => v.exerciseId === exerciseId && v.equipment === eq && v.brand === brand);
    if (archived) {
      updateVariant(archived.id, { archived: false });
      pick(archived.id);
    } else pick(addVariant({ exerciseId, equipment: eq, brand, unit: 'kg', gymId: null }));
  };

  const pick = (id: string | null) => {
    onPick(id);
    onClose();
  };

  if (adding) {
    return <VariantForm exerciseId={exerciseId} defaultGymId={gymId} onClose={() => setAdding(false)} onSaved={pick} />;
  }

  return (
    <Sheet
      title={`${exercise?.name ?? ''} · 기구 선택`}
      onClose={onClose}
      footer={
        <button className="btn soft block" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> 새 기구 등록
        </button>
      }
    >
      <p className="small muted" style={{ margin: '0 2px 10px' }}>
        기록과 이전 무게는 기구마다 따로 관리돼요.
        {gymName && (
          <>
            {' '}
            <b style={{ color: 'var(--text)' }}>{gymName}</b>에서 쓴 기구가 위에 나옵니다.
          </>
        )}
      </p>

      {(all.length > SEARCH_THRESHOLD || all.some((v) => isBrandable(v.equipment))) && exercise?.track !== 'time' && (
        <div className="search" style={{ marginBottom: 10 }}>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="브랜드 검색 (예: 프라임, atlantis, 핀)"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      )}

      <div className="list">
        {allowNone && !q && (
          <button className="list-item" onClick={() => pick(null)}>
            <div className="grow">
              <div className="title" style={{ color: currentId == null ? 'var(--accent)' : undefined }}>
                운동할 때 고르기
              </div>
              <div className="sub">헬스장마다 기구가 다르면 이걸 고르세요. 그 헬스장에서 마지막에 쓴 기구가 자동 선택돼요.</div>
            </div>
            {currentId == null && (
              <span style={{ color: 'var(--accent)' }}>
                <Icon name="check" size={18} />
              </span>
            )}
          </button>
        )}
        {list.map((v) => {
          const u = usage.get(v.id);
          const detail = variantDetail(v);
          const vGym = v.gymId ? gyms.find((g) => g.id === v.gymId)?.name : null;
          const selected = v.id === currentId;
          return (
            <button key={v.id} className="list-item" onClick={() => pick(v.id)}>
              <div className="grow">
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className="title" style={{ color: selected ? 'var(--accent)' : undefined }}>
                    {variantTitle(v)}
                  </span>
                  {gymId && u?.usedAtGym && <span className="tag ok">이 헬스장</span>}
                  {vGym && !(gymId && u?.usedAtGym) && <span className="tag">{vGym}</span>}
                  {v.unit !== 'kg' && <span className="tag">{v.unit === 'lb' ? 'lb' : '칸'}</span>}
                </div>
                {detail && <div className="sub">{detail}</div>}
                {v.memo && <div className="sub faint ellipsis">{v.memo}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {u ? (
                  <>
                    <div className="small tnum" style={{ fontWeight: 600 }}>
                      {u.top ? fmtSet(u.top, exercise?.track ?? 'weight', v.unit) : ''}
                    </div>
                    <div className="tiny faint">{fmtShortDate(u.lastAt)}</div>
                  </>
                ) : (
                  <span className="tiny faint">기록 없음</span>
                )}
              </div>
              {selected && (
                <span style={{ color: 'var(--accent)' }}>
                  <Icon name="check" size={18} />
                </span>
              )}
            </button>
          );
        })}
        {list.length === 0 && quickAdds.length === 0 && (
          <div className="empty" style={{ padding: '20px 12px' }}>
            찾는 기구가 없어요. 아래 "새 기구 등록"으로 추가하세요.
          </div>
        )}
      </div>

      {!q &&
        brandRows.map(({ eq, brands }) => {
          const open = brandsOpen[eq];
          const shown = open ? brands : brands.slice(0, 9);
          return (
            <div key={eq}>
              <div className="section-title" style={{ marginTop: 14 }}>
                {EQUIPMENT_LABEL[eq]} 브랜드 고르기
              </div>
              <p className="tiny faint" style={{ margin: '-4px 2px 8px' }}>
                {eq === 'cable' ? '케이블 스테이션도 브랜드마다 도르래·무게감이 달라요.' : '스미스 머신도 브랜드마다 바 무게·마찰이 달라요.'} 탭하면 그
                브랜드 {EQUIPMENT_LABEL[eq]}로 따로 기록돼요.
              </p>
              <div className="chips wrap">
                {shown.map(({ brand, atGym }) => (
                  <button key={brand} className="chip" onClick={() => pickBrand(eq, brand)}>
                    {brand}
                    {atGym && <span className="tag ok" style={{ marginLeft: 4 }}>이 헬스장</span>}
                  </button>
                ))}
                {!open && brands.length > shown.length && (
                  <button className="chip" style={{ color: 'var(--accent)' }} onClick={() => setBrandsOpen((o) => ({ ...o, [eq]: true }))}>
                    +{brands.length - shown.length} 더보기
                  </button>
                )}
              </div>
            </div>
          );
        })}

      {quickAdds.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 14 }}>
            바로 등록
          </div>
          <div className="list">
            {quickAdds.map(({ brand, equipment, loading, archived }) => (
              <button
                key={brand + equipment + (loading ?? '')}
                className="list-item"
                onClick={() => {
                  if (archived) {
                    updateVariant(archived.id, { archived: false });
                    pick(archived.id);
                  } else {
                    pick(addVariant({ exerciseId, equipment, brand, ...(loading ? { loading } : {}), unit: 'kg', gymId: null }));
                  }
                }}
              >
                <span style={{ color: 'var(--accent)' }}>
                  <Icon name="plus" size={18} />
                </span>
                <div className="grow">
                  <div className="title">{brand}</div>
                  <div className="sub">
                    {loading ? `${LOADING_LABEL[loading]} 머신` : EQUIPMENT_LABEL[equipment]}
                    {brandNote(brand) ? ` · ${brandNote(brand)}` : ''}
                    {archived ? ' · 숨겨 둔 기구 다시 표시' : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
