import { GOALS, TIERS } from './types.ts';
import type { Feasibility, Goal, Tier } from './types.ts';

// Said in so many words: selling it, charging for it. "판매" alone is not enough ("판매글 정리 앱").
const COMMERCIAL = /상업\s?용|유료|판매\s?(예정|할|하려|목적|용)|팔\s?(예정|거|려고)|수익\s?화|과금|돈\s?(받고|벌)/;

// The worst outcome for a beginner is starting a project far bigger than it looks and abandoning
// it halfway. A small model can call a crypto exchange "a simple web app", so for domains where
// that would be dangerously wrong, a rule sets a floor the AI cannot go under.
const FLOORS: { pattern: RegExp; tier: Tier; reason: string }[] = [
  {
    pattern: /비트코인|이더리움|암호\s?화폐|가상\s?자산|코인\s?(거래|지갑|시세|투자)|블록체인|거래소|crypto|bitcoin|nft|디파이|defi/i,
    tier: 'enterprise',
    reason: '암호화폐·거래소·지갑은 해킹의 주요 표적이고 자산 보관과 가상자산 규제 대응이 필요해, 실제 서비스는 보안 감사와 운영 조직을 갖춘 기업 규모가 기본입니다.',
  },
  {
    pattern: /증권|주식\s?(거래|매매|주문)|트레이딩|trading|송금|환전|대출|p2p\s?금융|전자\s?지갑|선불\s?충전|간편\s?결제\s?서비스/i,
    tier: 'enterprise',
    reason: '남의 돈을 맡거나 옮기는 서비스는 전자금융 관련 등록·감사 같은 금융 규제를 받아 개인이 실서비스로 운영하기 어렵습니다.',
  },
  {
    pattern: /진료|처방|의료\s?(기록|정보)|환자|건강\s?기록|원격\s?의료|emr\b/i,
    tier: 'enterprise',
    reason: '진료·건강 기록은 법으로 보호되는 민감정보라 별도 보호 조치와 인증이 필요합니다.',
  },
  {
    // The owner's test (#36): "is this image AI-generated or hand-drawn" came back far too small.
    pattern:
      /딥\s?페이크|deepfake|(ai|인공지능).{0,15}(생성|그린|만든|그림|이미지|글).{0,20}(판별|탐지|감지|구분|검출)|(판별|탐지|감지|구분|검출).{0,20}(ai|인공지능).{0,8}(생성|그린|만든)/i,
    tier: 'enterprise',
    reason: 'AI 생성물 판별은 아직 풀리지 않은 연구 문제예요. 새 생성 모델이 나올 때마다 다시 학습해야 하고, 사람 그림을 AI로 잘못 판정하면 실제 피해가 생겨서 "정확한 확률"을 혼자 보장할 수 없어요.',
  },
  {
    pattern: /실시간\s?(멀티|대전|게임)|mmo|동시\s?접속\s?(수천|수만|만)|대규모\s?트래픽/i,
    tier: 'team',
    reason: '많은 사람이 동시에 쓰는 실시간 기능은 서버 설계와 부하 테스트가 필요해 혼자 AI와 만들기엔 벅찹니다.',
  },
  {
    pattern: /결제|정기\s?구독|쇼핑몰|마켓\s?플레이스|중고\s?거래|배달\s?(앱|서비스)/i,
    tier: 'team',
    reason: '실제 돈이 오가는 결제·주문은 환불·정산·분쟁 처리까지 만들어야 해서 생각보다 훨씬 큽니다.',
  },
  {
    pattern: COMMERCIAL,
    tier: 'team',
    reason: '돈을 받고 팔면 만드는 것 외에 결제·환불, 라이선스·이용약관, 고객 문의, 업데이트 배포까지 따라옵니다.',
  },
];

const rank = (t: Tier) => TIERS.indexOf(t);

/** The goal the request states outright, when it does; otherwise the AI's reading stands. */
export function statedGoal(request: string): Goal | null {
  if (COMMERCIAL.test(request)) return 'commercial';
  if (/오픈\s?소스|open\s?source|누구나\s?(쓰|수정|사용)|공개\s?(배포|서비스)/i.test(request)) return 'public';
  return null;
}

/** The highest tier a rule demands for this request, or null when no rule applies. */
export function tierFloor(request: string): { tier: Tier; reason: string } | null {
  let best: { tier: Tier; reason: string } | null = null;
  for (const f of FLOORS) {
    if (f.pattern.test(request) && (!best || rank(f.tier) > rank(best.tier))) best = { tier: f.tier, reason: f.reason };
  }
  return best;
}

/**
 * The AI's verdict, never lower than the rule floor, and with the goal the request states outright.
 * Raising the tier is recorded so the screen can say so.
 */
export function applyFloor(f: Feasibility, request: string): Feasibility {
  const goal = statedGoal(request) ?? f.goal;
  const floor = tierFloor(request);
  if (!floor || rank(floor.tier) <= rank(f.tier)) return { ...f, goal };
  // The AI's reason argued for the smaller tier; next to the raised one it reads as a contradiction.
  return { ...f, goal, tier: floor.tier, why: floor.reason, raisedBy: floor.reason, aiTier: f.tier };
}

/** When the AI gave nothing: only what the rule knows, never an invented app-specific verdict. */
export function ruleFeasibility(request: string): Feasibility | null {
  const floor = tierFloor(request);
  if (!floor) return null;
  const goal = statedGoal(request) ?? 'personal';
  return { goal, tier: floor.tier, why: floor.reason, risks: [], goalAdds: [], scopeDown: '', raisedBy: null, by: 'rule' };
}

/** A malformed verdict is dropped (null), not allowed to sink the cards it came with. */
export function parseFeasibility(raw: unknown): Feasibility | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!TIERS.includes(o.tier as Tier)) return null;
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const why = text(o.why, 300);
  if (!why) return null;
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.map((r) => text(r, 80)).filter(Boolean).slice(0, n) : []);
  const goal = GOALS.includes(o.goal as Goal) ? (o.goal as Goal) : 'personal';
  return {
    goal,
    tier: o.tier as Tier,
    why,
    risks: list(o.risks, 3),
    goalAdds: goal === 'personal' ? [] : list(o.goalAdds, 4),
    scopeDown: text(o.scopeDown, 200),
    raisedBy: null,
    by: 'ai',
  };
}
