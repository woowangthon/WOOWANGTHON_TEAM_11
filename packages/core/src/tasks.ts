import type { Profile, Task } from './types.ts';

const MAX_TASKS = 10;

export function parseTasks(raw: unknown): Task[] {
  if (typeof raw !== 'object' || raw === null) throw new Error('expected a JSON object');
  const list = (raw as Record<string, unknown>).tasks;
  if (!Array.isArray(list) || list.length === 0) throw new Error('tasks: expected a non-empty array');
  return list.slice(0, MAX_TASKS).map((t, i) => {
    const task = t as Record<string, unknown>;
    if (typeof task?.title !== 'string' || !task.title.trim()) throw new Error(`tasks[${i}].title: expected a string`);
    return {
      title: task.title.trim().slice(0, 120),
      done: typeof task.done === 'string' ? task.done.trim().slice(0, 160) : '',
    };
  });
}

/** A generic plan derived from the profile alone; used when the AI call fails. */
export function fallbackTasks(profile: Profile): Task[] {
  const tasks: Task[] = [
    { title: '규칙 파일의 폴더 구조대로 프로젝트 뼈대 만들기', done: '빈 화면이 실행되고 폴더 구조가 규칙과 일치함' },
    { title: '핵심 기능 하나를 저장 없이 화면에서 동작시키기', done: '새로고침 전까지 기능이 동작함' },
  ];
  if (profile.storage === 'local') tasks.push({ title: '데이터를 기기 저장소에 저장·불러오기', done: '새로고침 후에도 데이터가 남아 있음' });
  if (profile.storage === 'server-db') tasks.push({ title: '서버 DB 연결과 접근 규칙 설정', done: '접근 규칙이 켜진 상태에서 읽기·쓰기가 동작함' });
  if (profile.auth !== 'none') tasks.push({ title: '로그인 구현 후 사용자별 데이터 분리', done: '다른 계정으로 로그인하면 내 데이터가 보이지 않음' });
  if (profile.upload === 'yes') tasks.push({ title: '파일 업로드와 크기·형식 제한', done: '제한을 넘는 파일이 거부됨' });
  if (profile.externalApi === 'yes') tasks.push({ title: '외부 API를 서비스 모듈로 감싸 연결', done: '키가 코드에 없고 API 실패 시 화면에 안내가 뜸' });
  if (profile.payment === 'yes') tasks.push({ title: '결제 서비스 연동과 서버측 결제 확인', done: '웹훅으로 확인된 결제만 완료 처리됨' });
  tasks.push({ title: '나머지 기능을 하나씩 추가하고 매번 테스트 실행', done: '요청한 기능이 모두 동작하고 테스트가 통과함' });
  return tasks;
}
