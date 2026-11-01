import { DIFFICULTIES, FREE_TIERS } from './types.ts';
import type { Budget, BudgetItem, Difficulty, FocusCheck, SecurityCheck, Plan, Profile, SkillPick, StackItem, Task } from './types.ts';
import { SKILLS } from './skills.ts';

const MAX_TASKS = 10;
const MAX_STACK = 6;
const MAX_WATCHOUTS = 3;
const MAX_SECURITY_CHECKS = 2;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function parsePlan(raw: unknown): Plan {
  if (typeof raw !== 'object' || raw === null) throw new Error('expected a JSON object');
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.tasks) || obj.tasks.length === 0) throw new Error('tasks: expected a non-empty array');
  const tasks = obj.tasks.slice(0, MAX_TASKS).map((t, i): Task => {
    const task = t as Record<string, unknown>;
    if (typeof task?.title !== 'string' || !task.title.trim()) throw new Error(`tasks[${i}].title: expected a string`);
    // An unknown level would render as a blank badge; reject it rather than guess one.
    if (!DIFFICULTIES.includes(task.difficulty as Difficulty)) throw new Error(`tasks[${i}].difficulty: expected easy|medium|hard`);
    return {
      title: task.title.trim().slice(0, 120),
      done: text(task.done, 160),
      difficulty: task.difficulty as Difficulty,
      reason: text(task.reason, 200),
      watchouts: (Array.isArray(task.watchouts) ? task.watchouts : [])
        .map((w) => text(w, 140))
        .filter(Boolean)
        .slice(0, MAX_WATCHOUTS),
      securityChecks: (Array.isArray(task.securityChecks) ? task.securityChecks : [])
        .flatMap((c): SecurityCheck[] => {
          const check = c as Record<string, unknown>;
          const what = text(check?.what, 120);
          return what ? [{ what, how: text(check.how, 240) }] : [];
        })
        .slice(0, MAX_SECURITY_CHECKS),
    };
  });
  const stack = (Array.isArray(obj.stack) ? obj.stack : []).slice(0, MAX_STACK).flatMap((s): StackItem[] => {
    const item = s as Record<string, unknown>;
    const area = text(item?.area, 30);
    const choice = text(item?.choice, 60);
    return area && choice ? [{ area, choice, why: text(item.why, 140), connects: text(item.connects, 160) }] : [];
  });
  return {
    tasks: tasks.map(calibrateDifficulty),
    stack,
    budget: parseBudget(obj.budget),
    securityFocus: parseFocus(obj.securityFocus),
    skills: parseSkillPicks(obj.skills),
  };
}

/** A generic plan derived from the profile alone; used when the AI call fails. */
export function fallbackPlan(profile: Profile): Plan {
  // The fallback carries no per-task guidance: the rule-based human checklist still applies.
  const t = (title: string, done: string, difficulty: Difficulty, reason: string): Task => ({
    title, done, difficulty, reason, watchouts: [], securityChecks: [],
  });
  const tasks: Task[] = [
    t('규칙 파일의 폴더 구조대로 프로젝트 뼈대 만들기', '빈 화면이 실행되고 폴더 구조가 규칙과 일치함', 'easy', '템플릿으로 바로 시작 가능'),
    t('핵심 기능 하나를 저장 없이 화면에서 동작시키기', '새로고침 전까지 기능이 동작함', 'medium', '앱마다 다른 핵심 로직'),
  ];
  if (profile.storage === 'local') tasks.push(t('데이터를 기기 저장소에 저장·불러오기', '새로고침 후에도 데이터가 남아 있음', 'easy', '브라우저·기기 기본 기능으로 충분'));
  if (profile.storage === 'server-db') tasks.push(t('서버 DB 연결과 접근 규칙 설정', '접근 규칙이 켜진 상태에서 읽기·쓰기가 동작함', 'hard', '접근 규칙을 빠뜨리면 데이터가 통째로 노출됨'));
  if (profile.auth !== 'none') tasks.push(t('로그인 구현 후 사용자별 데이터 분리', '다른 계정으로 로그인하면 내 데이터가 보이지 않음', 'hard', '서버에서 권한을 매번 확인해야 함'));
  if (profile.upload === 'yes') tasks.push(t('파일 업로드와 크기·형식 제한', '제한을 넘는 파일이 거부됨', 'medium', '저장소 연결과 검증이 함께 필요'));
  if (profile.externalApi === 'yes') tasks.push(t('외부 API를 서비스 모듈로 감싸 연결', '키가 코드에 없고 API 실패 시 화면에 안내가 뜸', 'medium', '키 관리와 실패 처리가 필요'));
  if (profile.payment === 'yes') tasks.push(t('결제 서비스 연동과 서버측 결제 확인', '웹훅으로 확인된 결제만 완료 처리됨', 'hard', '웹훅·서버 검증 없이는 결제 우회 가능'));
  tasks.push(t('나머지 기능을 하나씩 추가하고 매번 테스트 실행', '요청한 기능이 모두 동작하고 테스트가 통과함', 'medium', '기능 수에 비례'));
  // No app-specific security checks or skill picks without the model: those must not be faked.
  return { tasks, stack: fallbackStack(profile), budget: fallbackBudget(profile), securityFocus: [], skills: [] };
}

/** Widely used, free-tier-friendly defaults per profile trait. */
export function fallbackStack(profile: Profile): StackItem[] {
  const stack: StackItem[] = [];
  const add = (area: string, choice: string, why: string, connects = '') => stack.push({ area, choice, why, connects });
  if (profile.platform === 'web') add('화면', 'React + Vite (TypeScript)', '자료와 AI 학습량이 가장 많아 코딩 AI가 잘 다룸');
  if (profile.platform === 'mobile') add('화면', 'React Native (Expo)', '한 코드로 안드로이드·iOS, 설치 없이 미리보기 가능');
  if (profile.platform === 'desktop') add('화면', 'Electron + React', '웹 기술 그대로 PC 앱으로 배포');
  if (profile.platform === 'cli') add('실행 환경', 'Node.js (TypeScript)', '설치가 쉽고 패키지가 많음');
  if (profile.storage === 'local') add('데이터 저장', profile.platform === 'mobile' ? 'AsyncStorage' : 'IndexedDB (Dexie)', '서버 없이 기기에 저장');
  if (profile.storage === 'server-db') add('데이터 저장', 'Supabase (Postgres)', '무료 티어, 행 수준 보안(RLS) 기본 제공');
  if (profile.auth !== 'none') {
    add(
      '로그인',
      profile.storage === 'server-db' ? 'Supabase Auth' : 'Supabase Auth (로그인만)',
      '비밀번호 해시·소셜 로그인을 직접 구현하지 않아도 됨',
      profile.storage === 'server-db' ? 'DB와 같은 Supabase 프로젝트라 로그인 사용자 기준으로 행 단위 접근 규칙(RLS)을 바로 걸 수 있음' : '',
    );
  }
  if (profile.payment === 'yes') add('결제', 'Toss Payments', '국내 결제수단, 웹훅으로 서버 검증');
  if (profile.platform === 'web') add('배포', 'Vercel', '무료로 시작, Git 연결만으로 자동 배포');
  return stack.slice(0, MAX_STACK);
}

function parseBudget(raw: unknown): Budget {
  const b = (raw ?? {}) as Record<string, unknown>;
  // A missing or odd verdict is shown as "partial": claiming "fully free" without basis is the worse error.
  const freeTier = FREE_TIERS.includes(b.freeTier as Budget['freeTier']) ? (b.freeTier as Budget['freeTier']) : 'partial';
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 8).flatMap((i): BudgetItem[] => {
    const item = i as Record<string, unknown>;
    const name = text(item?.name, 40);
    return name ? [{ name, free: text(item.free, 120), paid: text(item.paid, 120) }] : [];
  });
  return {
    freeTier,
    assumedScale: text(b.assumedScale, 60) || '규모 미상',
    monthly: text(b.monthly, 40) || '추정 불가',
    summary: text(b.summary, 200),
    items,
  };
}

/** Rule-based estimate from the profile, used when the AI call fails. Small scale, ~100 users. */
export function fallbackBudget(profile: Profile): Budget {
  const items: BudgetItem[] = [];
  const add = (name: string, free: string, paid: string) => items.push({ name, free, paid });
  if (profile.platform === 'web') add('호스팅 (Vercel)', '개인 프로젝트는 무료', '상업용·팀은 월 약 3만원부터');
  if (profile.platform === 'mobile') add('앱 스토어 등록', '테스트 배포는 무료', 'Google Play 약 3.5만원(1회), Apple 연 약 13만원');
  if (profile.storage === 'server-db') add('데이터베이스 (Supabase)', '500MB·소규모 무료, 1주 미사용 시 일시정지', '월 약 3.5만원부터');
  if (profile.auth !== 'none') add('로그인 (Supabase Auth 등)', '월 활성 사용자 수만 명까지 무료', '대규모부터 과금');
  if (profile.externalApi === 'yes') add('외부/AI API', '무료 티어는 하루 요청 수 제한', '사용량 비례 (AI는 요청당 수원~수십원)');
  if (profile.upload === 'yes') add('파일 저장소', '1GB 안팎 무료', '용량·전송량 비례');
  if (profile.payment === 'yes') add('결제 (PG)', '가입·테스트 무료', '결제 금액의 약 3% 수수료');
  if (profile.scale === 'large') add('트래픽 대응', '무료 티어는 요청·대역폭 한도가 작음', '사용량 비례로 월 수만~수십만원');
  const paidOnly = profile.payment === 'yes' || profile.platform === 'mobile';
  const freeTier: Budget['freeTier'] =
    profile.scale === 'large' ? 'none' : paidOnly || profile.externalApi === 'yes' ? 'partial' : 'full';
  return {
    freeTier,
    assumedScale: profile.scale === 'large' ? '수천 명 이상 (카드 선택 기준)' : '수십~수백 명 (카드 선택 기준)',
    monthly: freeTier === 'full' ? '0원' : freeTier === 'none' ? '수만~수십만원' : '0원~수만원',
    summary:
      freeTier === 'full'
        ? '소규모라면 무료 티어만으로 운영할 수 있습니다. 사용자가 늘거나 상업적으로 쓰면 유료로 바뀝니다.'
        : freeTier === 'none'
          ? '트래픽이 많으면 무료 한도를 바로 넘습니다. 호스팅·DB·API 모두 사용량에 비례해 비용이 생깁니다.'
          : '개발·시험은 무료로 가능하지만, 외부 API 사용량이나 결제·앱 스토어 비용이 생깁니다.',
    items,
  };
}

const AUTH_PROVIDERS = /supabase|firebase|appwrite|pocketbase/i;
const AUTH_LIBRARIES = /next-?auth|auth\.js|clerk|lucia|passport|auth0|kinde/i;

/** Overlaps a person should resolve before building; empty when the picks are consistent. */
export function stackWarnings(stack: StackItem[]): string[] {
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  for (const s of stack) {
    const prev = seen.get(s.area);
    if (prev) warnings.push(`'${s.area}'에 ${prev}와 ${s.choice}가 함께 추천됐어요. 하나로 정하세요.`);
    else seen.set(s.area, s.choice);
  }
  const provider = stack.find((s) => AUTH_PROVIDERS.test(s.choice));
  const library = stack.find((s) => AUTH_LIBRARIES.test(s.choice));
  if (provider && library) {
    warnings.push(
      `${provider.choice}도 로그인 기능이 있는데 ${library.choice}를 따로 쓰도록 추천됐어요. 사용자 계정과 데이터 권한을 어느 쪽이 관리할지 정해야 합니다.`,
    );
  }
  return warnings;
}

// Topics that are hard for a non-developer with an AI agent whatever the model says: they fail
// under load, under concurrency or with money, and the failure is not visible in a quick test.
const HARD_TOPICS = /트래픽|성능|최적화|확장|부하|동시|실시간|결제|환불|웹훅|캐시|마이그레이션|rate\s?limit|요청 제한|scal|concurren|real-?time|payment|webhook|perf/i;

/** Raises a task on a known-hard topic to "hard", saying so, instead of trusting a lower estimate. */
export function calibrateDifficulty(task: Task): Task {
  if (task.difficulty === 'hard' || !HARD_TOPICS.test(`${task.title} ${task.done}`)) return task;
  return { ...task, difficulty: 'hard', reason: `(규칙 보정: 부하·동시성·돈이 걸린 작업은 '상') ${task.reason}`.trim() };
}

function parseFocus(raw: unknown): FocusCheck[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 5).flatMap((c): FocusCheck[] => {
    const item = c as Record<string, unknown>;
    const what = text(item?.what, 140);
    const steps = (Array.isArray(item?.steps) ? item.steps : []).map((st) => text(st, 240)).filter(Boolean).slice(0, 5);
    return what && steps.length ? [{ what, steps }] : [];
  });
}

/** Only ids from the vetted catalog survive: the model may tailor the reason, not invent a skill. */
function parseSkillPicks(raw: unknown): SkillPick[] {
  // Models often answer with the display name instead of the id; both resolve to the same entry.
  const byKey = new Map(SKILLS.flatMap((s) => [[s.id.toLowerCase(), s.id], [s.name.toLowerCase(), s.id]] as const));
  const seen = new Set<string>();
  return (Array.isArray(raw) ? raw : []).flatMap((p): SkillPick[] => {
    const item = p as Record<string, unknown>;
    const id = byKey.get(text(item?.id ?? item?.name, 60).toLowerCase());
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{ id, reason: text(item.reason, 160) }];
  }).slice(0, 4);
}
