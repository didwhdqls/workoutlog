import { useMemo, useState } from 'react';
import { brandMatchesWithLegacy, brandNote, canonicalBrand } from '../data/aliases';
import { BRANDS } from '../data/seed';
import { useStore } from '../store';
import type { Equipment, Loading, Variant, WeightUnit } from '../types';
import { EQUIPMENT_LABEL, EQUIPMENT_ORDER } from '../types';
import { variantSessions } from '../lib/stats';
import { isBrandable } from '../lib/util';
import { ask, askText } from './Dialog';
import { Sheet } from './Sheet';

/** 기구 추가/수정. 같은 운동이라도 브랜드·방식·헬스장별로 따로 등록합니다. */
export function VariantForm({
  exerciseId,
  variant,
  defaultGymId,
  onClose,
  onSaved,
}: {
  exerciseId: string;
  variant?: Variant;
  defaultGymId?: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const gyms = useStore((s) => s.gyms);
  const allVariants = useStore((s) => s.variants);
  const workouts = useStore((s) => s.workouts);
  const addVariant = useStore((s) => s.addVariant);
  const updateVariant = useStore((s) => s.updateVariant);
  const addGym = useStore((s) => s.addGym);
  const exercise = useStore((s) => s.exercises.find((x) => x.id === exerciseId));

  // 새 기구: 이 운동에 머신이 있으면 머신, 아니면 이 운동의 첫 기구 종류 (예: 페이스 풀 → 케이블)
  const [equipment, setEquipment] = useState<Equipment>(() => {
    if (variant) return variant.equipment;
    const own = allVariants.filter((v) => v.exerciseId === exerciseId);
    return own.some((v) => v.equipment === 'machine') || own.length === 0 ? 'machine' : own[0].equipment;
  });
  const [loading, setLoading] = useState<Loading | undefined>(variant?.loading ?? (variant ? undefined : 'stack'));
  const brandable = isBrandable(equipment);
  const [brand, setBrand] = useState(variant?.brand ?? '');
  const [model, setModel] = useState(variant?.model ?? '');
  const [label, setLabel] = useState(variant?.label ?? '');
  const [gymId, setGymId] = useState<string | null>(variant ? variant.gymId ?? null : defaultGymId ?? null);
  const [unit, setUnit] = useState<WeightUnit>(variant?.unit ?? 'kg');
  const [memo, setMemo] = useState(variant?.memo ?? '');

  const brandOptions = useMemo(() => {
    const set = new Set<string>(Object.values(BRANDS));
    for (const v of allVariants) if (v.brand) set.add(v.brand);
    return [...set];
  }, [allVariants]);

  // 입력 중인 글자(한글/영어)로 브랜드 칩을 걸러 보여 줍니다. "ham" → 해머스트렝스
  const typed = brand.trim();
  const [showAllBrands, setShowAllBrands] = useState(false);
  const filtering = !!typed && !brandOptions.includes(typed);
  const BRAND_PREVIEW = 12;
  let shownBrands = filtering ? brandOptions.filter((b) => brandMatchesWithLegacy(b, typed)) : brandOptions;
  const hiddenCount = !filtering && !showAllBrands ? Math.max(0, shownBrands.length - BRAND_PREVIEW) : 0;
  if (hiddenCount > 0) {
    shownBrands = shownBrands.slice(0, BRAND_PREVIEW);
    if (typed && !shownBrands.includes(typed)) shownBrands.push(typed); // 고른 브랜드는 항상 보이게
  }
  const resolvedBrand = typed ? canonicalBrand(typed, brandOptions) : '';

  const hasHistory = useMemo(() => (variant ? variantSessions(workouts, variant.id).length > 0 : false), [variant, workouts]);
  const isMachine = equipment === 'machine';
  const valid = !isMachine || brand.trim() || model.trim() || label.trim() || loading;

  const save = () => {
    const data = {
      exerciseId,
      equipment,
      // "Hammer Strength" 처럼 영어로 적어도 기존 "해머스트렝스"와 같은 브랜드로 저장
      brand: brandable && resolvedBrand ? resolvedBrand : undefined,
      loading: isMachine ? loading : undefined,
      model: model.trim() || undefined,
      label: label.trim() || undefined,
      gymId,
      unit,
      memo: memo.trim() || undefined,
    };
    if (variant) {
      updateVariant(variant.id, data);
      onSaved?.(variant.id);
    } else {
      onSaved?.(addVariant(data));
    }
    onClose();
  };

  return (
    <Sheet
      title={variant ? '기구 수정' : `${exercise?.name ?? ''} · 기구 추가`}
      onClose={onClose}
      footer={
        <>
          {variant && (
            <button
              className="btn danger"
              onClick={async () => {
                if (await ask({ title: '기구 숨기기', message: '이 기구를 목록에서 숨길까요? 지난 기록은 그대로 남아요.', ok: '숨기기', danger: true })) {
                  updateVariant(variant.id, { archived: true });
                  onClose();
                }
              }}
            >
              숨기기
            </button>
          )}
          <button className="btn primary block" disabled={!valid} onClick={save}>
            저장
          </button>
        </>
      }
    >
      <div className="field">
        <label>기구 종류</label>
        <div className="chips wrap">
          {EQUIPMENT_ORDER.map((eq) => (
            <button key={eq} className={'chip' + (equipment === eq ? ' on' : '')} onClick={() => setEquipment(eq)}>
              {EQUIPMENT_LABEL[eq]}
            </button>
          ))}
        </div>
      </div>

      {brandable && (
        <>
          {isMachine && (
          <div className="field">
            <label>무게 방식</label>
            <div className="seg">
              <button className={loading === 'stack' ? 'on' : ''} onClick={() => setLoading('stack')}>
                핀 (웨이트 스택)
              </button>
              <button className={loading === 'plate' ? 'on' : ''} onClick={() => setLoading('plate')}>
                플레이트 (원판)
              </button>
            </div>
          </div>
          )}
          <div className="field">
            <label>브랜드{isMachine ? '' : ' (선택)'}</label>
            <div className="chips wrap" style={{ marginBottom: 8 }}>
              {shownBrands.map((b) => (
                <button key={b} className={'chip' + (brand === b ? ' on' : '')} onClick={() => setBrand(brand === b ? '' : b)}>
                  {b}
                </button>
              ))}
              {hiddenCount > 0 && (
                <button className="chip" style={{ color: 'var(--accent)' }} onClick={() => setShowAllBrands(true)}>
                  +{hiddenCount} 더보기
                </button>
              )}
            </div>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="한글/영어로 검색하거나 직접 입력 (예: prime, 아틀란티스)"
              autoCapitalize="none"
              autoCorrect="off"
            />
            {typed && resolvedBrand !== typed && (
              <div className="hint">
                <b style={{ color: 'var(--accent)' }}>{resolvedBrand}</b>(으)로 저장돼요. 같은 브랜드 기록이 나뉘지 않게 이름을 맞춰요.
              </div>
            )}
            {brandNote(resolvedBrand) && (
              <div className="hint">
                {resolvedBrand}: {brandNote(resolvedBrand)}. 지금 브랜드와 무게감이 다를 수 있어 따로 기록돼요.
              </div>
            )}
            {typed && resolvedBrand === typed && !brandOptions.includes(typed) && (
              <div className="hint">새 브랜드로 저장돼요.</div>
            )}
            {!isMachine && !typed && (
              <div className="hint">
                {equipment === 'cable' ? '케이블도 브랜드마다 도르래 비율이 달라 무게감이 달라요.' : '스미스 머신도 브랜드마다 바 무게와 마찰이 달라요.'} 브랜드를 고르면 따로 기록돼요.
              </div>
            )}
          </div>
        </>
      )}

      <div className="field">
        <label>모델 / 구분 (선택)</label>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="예: ISO-래터럴, 구형, 2층 창가 쪽" />
        <div className="hint">같은 브랜드라도 모델이 다르면 따로 등록해 두세요.</div>
      </div>

      <div className="field">
        <label>헬스장 (선택)</label>
        <div className="chips wrap">
          <button className={'chip' + (gymId == null ? ' on' : '')} onClick={() => setGymId(null)}>
            어디서나
          </button>
          {gyms.map((g) => (
            <button key={g.id} className={'chip' + (gymId === g.id ? ' on' : '')} onClick={() => setGymId(g.id)}>
              {g.name}
            </button>
          ))}
          <button
            className="chip"
            onClick={async () => {
              const name = await askText({ title: '새 헬스장', placeholder: '예: 회사 앞 OO짐', ok: '추가' });
              if (name) setGymId(addGym(name));
            }}
          >
            + 헬스장
          </button>
        </div>
        <div className="hint">특정 헬스장에만 있는 기구라면 지정하세요. 그 헬스장에서 운동할 때 먼저 보여 줍니다.</div>
      </div>

      <div className="field">
        <label>무게 단위</label>
        <div className="seg">
          {(['kg', 'lb', 'level'] as WeightUnit[]).map((u) => (
            <button key={u} className={unit === u ? 'on' : ''} onClick={() => setUnit(u)}>
              {u === 'level' ? '칸 (핀 번호)' : u}
            </button>
          ))}
        </div>
        <div className="hint">
          {hasHistory
            ? '이미 기록이 있어요. 단위를 바꾸면 숫자는 그대로 두고 단위 표시만 바뀝니다.'
            : '무게 표기가 없거나 믿기 어려운 핀 머신은 "칸"으로 기록하면 편해요.'}
        </div>
      </div>

      <div className="field">
        <label>세팅 메모</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 시트 4 / 가슴 패드 2 / 손잡이 넓은 쪽" />
        <div className="hint">운동 중 이 기구를 고르면 메모가 바로 보입니다.</div>
      </div>

      <div className="field">
        <label>표시 이름 (선택)</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="비워 두면 브랜드/종류로 자동 표시" />
      </div>
    </Sheet>
  );
}
