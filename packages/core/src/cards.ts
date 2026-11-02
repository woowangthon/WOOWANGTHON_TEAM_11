import { isProfileKey, isProfileValue } from './profile.ts';
import { DIFFICULTIES } from './types.ts';
import type { Card, CardOption, CardsData, Difficulty, Profile } from './types.ts';
import { parseFeasibility } from './feasibility.ts';

export const MAX_CARDS = 9;
const MAX_OPTIONS = 4;

/**
 * Used when the AI call fails or returns something unusable. These cover the profile
 * keys the rule presets read, so rules are still recommended correctly without AI.
 * The UI labels them as non-AI cards.
 */
type RawCard = Omit<Card, 'kind' | 'options'> & { options: Omit<CardOption, 'policy'>[] };

const RAW_FALLBACK: RawCard[] = [
  {
    id: 'platform',
    question: '어디에서 쓰는 앱인가요?',
    why: '플랫폼에 따라 프로젝트 구조와 배포 방법이 완전히 달라집니다.',
    options: [
      { id: 'web', label: '웹', detail: '브라우저에서 바로 접속', recommended: true, sets: { platform: 'web' }, difficulty: 'easy', effort: '' },
      { id: 'mobile', label: '모바일 앱', detail: '설치형 앱', recommended: false, sets: { platform: 'mobile' }, difficulty: 'hard', effort: '빌드·스토어 등록 필요' },
      { id: 'desktop', label: 'PC 프로그램', detail: '설치형 데스크톱 앱', recommended: false, sets: { platform: 'desktop' }, difficulty: 'medium', effort: '설치 파일 배포 필요' },
    ],
  },
  {
    id: 'auth',
    question: '로그인이 필요한가요?',
    why: '로그인을 나중에 붙이면 데이터 구조를 거의 다시 짜야 합니다.',
    options: [
      { id: 'none', label: '필요 없음', detail: '누구나 바로 사용', recommended: true, sets: { auth: 'none', users: 'single' }, difficulty: 'easy', effort: '' },
      { id: 'social', label: '소셜 로그인', detail: '구글·카카오 등', recommended: false, sets: { auth: 'social', users: 'multi' }, difficulty: 'medium', effort: '사용자별 데이터 분리 필요' },
      { id: 'email', label: '이메일 가입', detail: '아이디·비밀번호 직접 관리', recommended: false, sets: { auth: 'email', users: 'multi' }, difficulty: 'hard', effort: '비밀번호·재설정까지 관리' },
    ],
  },
  {
    id: 'storage',
    question: '데이터를 어디에 저장하나요?',
    why: '저장 위치가 정해지지 않으면 AI가 임의로 정하고, 나중에 옮기기 어렵습니다.',
    options: [
      { id: 'local', label: '내 기기에만', detail: '브라우저·기기 저장소', recommended: true, sets: { storage: 'local' }, difficulty: 'easy', effort: '' },
      { id: 'server-db', label: '서버 DB', detail: '여러 기기·사용자가 공유', recommended: false, sets: { storage: 'server-db' }, difficulty: 'medium', effort: 'DB 접근 규칙 설정 필요' },
      { id: 'none', label: '저장 안 함', detail: '매번 새로 시작', recommended: false, sets: { storage: 'none' }, difficulty: 'easy', effort: '' },
    ],
  },
  {
    id: 'extras',
    question: '다음 중 필요한 기능이 있나요?',
    why: '파일 업로드·결제·외부 API는 각각 별도의 보안 대책이 필요합니다.',
    options: [
      { id: 'nothing', label: '없음', detail: '기본 기능만', recommended: true, sets: { upload: 'no', payment: 'no', externalApi: 'no' }, difficulty: 'easy', effort: '' },
      { id: 'upload', label: '파일 업로드', detail: '사진·문서 올리기', recommended: false, sets: { upload: 'yes' }, difficulty: 'medium', effort: '크기·형식 제한 필요' },
      { id: 'external', label: '외부 API 연동', detail: 'AI·지도·날씨 등', recommended: false, sets: { externalApi: 'yes' }, difficulty: 'medium', effort: '키 관리·실패 처리 필요' },
      { id: 'payment', label: '결제', detail: '유료 기능·상품 판매', recommended: false, sets: { payment: 'yes' }, difficulty: 'hard', effort: '웹훅·환불 처리 필요' },
      { id: 'money', label: '돈 계산', detail: '벌금·정산·포인트', recommended: false, sets: { money: 'yes' }, difficulty: 'medium', effort: '변경 내역·감사 로그 필요' },
    ],
  },
  {
    id: 'scale',
    question: '얼마나 많은 사람이 쓰게 될까요?',
    why: '규모에 따라 서버 비용, 요청 제한, 성능 대비가 완전히 달라집니다.',
    options: [
      { id: 'small', label: '수십~수백 명', detail: '동아리·지인·소규모 테스트', recommended: true, sets: { scale: 'small' }, difficulty: 'easy', effort: '' },
      { id: 'large', label: '수천 명 이상', detail: '공개 서비스·트래픽 급증 가능', recommended: false, sets: { scale: 'large' }, difficulty: 'hard', effort: '캐시·요청 제한·부하 대비 필요' },
    ],
  },
  {
    id: 'stage',
    question: '어디까지 만들 계획인가요?',
    why: '시험용과 실제 서비스는 필요한 테스트·점검 수준이 다릅니다.',
    options: [
      { id: 'prototype', label: '일단 동작하는 시제품', detail: '아이디어 검증용', recommended: true, sets: { stage: 'prototype' }, difficulty: 'easy', effort: '' },
      { id: 'production', label: '실제로 공개할 서비스', detail: '다른 사람이 계속 사용', recommended: false, sets: { stage: 'production' }, difficulty: 'hard', effort: '테스트·점검 범위가 커짐' },
    ],
  },
];

export const FALLBACK_CARDS: Card[] = RAW_FALLBACK.map((c) => ({
  ...c,
  kind: 'tech',
  options: c.options.map((o) => ({ ...o, policy: '' })),
}));

const str = (v: unknown, field: string, max: number): string => {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${field}: expected a non-empty string`);
  return v.trim().slice(0, max);
};

function parseSets(raw: unknown, where: string): Partial<Profile> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${where}.sets: expected an object`);
  const sets: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    // An unknown key would be silently ignored by every rule, so reject it instead.
    if (!isProfileKey(key)) throw new Error(`${where}.sets: unknown profile key "${key}"`);
    if (typeof value !== 'string' || !isProfileValue(key, value)) {
      throw new Error(`${where}.sets.${key}: invalid value ${JSON.stringify(value)}`);
    }
    sets[key] = value;
  }
  return sets as Partial<Profile>;
}

/** Turns untrusted model output into cards, or throws saying what was wrong. */
export function parseCards(raw: unknown): CardsData {
  if (typeof raw !== 'object' || raw === null) throw new Error('expected a JSON object');
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.cards) || obj.cards.length === 0) throw new Error('cards: expected a non-empty array');

  // One malformed card (say, a single option) is dropped rather than discarding the whole
  // answer for the fallback cards. Only when no card survives does the call count as failed.
  const seen = new Set<string>();
  const cards: Card[] = [];
  const errors: string[] = [];
  obj.cards.slice(0, MAX_CARDS).forEach((c, i) => {
    try {
      const card = parseCard(c, `cards[${i}]`, `c${cards.length + 1}`);
      if (seen.has(card.question)) throw new Error(`cards[${i}]: duplicate question`);
      seen.add(card.question);
      cards.push(card);
    } catch (err) {
      errors.push((err as Error).message);
    }
  });
  if (cards.length === 0) throw new Error(errors[0] ?? 'no usable cards');
  return {
    summary: typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 200) : '',
    cards,
    feasibility: parseFeasibility(obj.feasibility),
  };
}

function parseCard(c: unknown, where: string, id: string): Card {
  if (typeof c !== 'object' || c === null) throw new Error(`${where}: expected an object`);
  const card = c as Record<string, unknown>;
  if (!Array.isArray(card.options) || card.options.length < 2) throw new Error(`${where}.options: need at least 2`);
  const options = card.options.slice(0, MAX_OPTIONS).map((o, j): CardOption => {
    const w = `${where}.options[${j}]`;
    if (typeof o !== 'object' || o === null) throw new Error(`${w}: expected an object`);
    const opt = o as Record<string, unknown>;
    return {
      id: `o${j + 1}`,
      label: str(opt.label, `${w}.label`, 40),
      detail: typeof opt.detail === 'string' ? opt.detail.trim().slice(0, 80) : '',
      recommended: opt.recommended === true,
      sets: parseSets(opt.sets, w),
      policy: typeof opt.policy === 'string' ? opt.policy.trim().slice(0, 200) : '',
      // A missing or unknown level shows as medium rather than dropping the card: it is a hint, not a fact.
      difficulty: DIFFICULTIES.includes(opt.difficulty as Difficulty) ? (opt.difficulty as Difficulty) : 'medium',
      effort: typeof opt.effort === 'string' ? opt.effort.trim().slice(0, 60) : '',
    };
  });
  // Exactly one recommendation per card: the UI pre-selects it.
  const firstRec = options.findIndex((o) => o.recommended);
  options.forEach((o, j) => (o.recommended = j === (firstRec < 0 ? 0 : firstRec)));
  // ids are assigned here, not trusted from the model, so they are always unique
  const question = str(card.question, `${where}.question`, 80);
  // Anything not explicitly "domain" is treated as a tech card, so a missing field cannot
  // promote a stray card into the spec's business rules.
  const kind = card.kind === 'domain' ? 'domain' : 'tech';
  if (kind === 'tech') options.forEach((o) => (o.policy = ''));
  return { id, kind, question, why: typeof card.why === 'string' ? card.why.trim().slice(0, 140) : '', options };
}
