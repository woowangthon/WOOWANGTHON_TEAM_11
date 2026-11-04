import { Blocks, ExternalLink, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { mergeSkills, recommendSkills } from '@spec/core';
import type { Profile, Rule, SkillPick } from '@spec/core';
import { AiSettings } from './AiSettings.tsx';

const PROFILE_LABEL: { [K in keyof Profile]?: Record<string, string> } = {
  platform: { web: '웹', mobile: '모바일 앱', desktop: 'PC 프로그램', cli: '명령줄' },
  auth: { none: '로그인 없음', email: '이메일 로그인', social: '소셜 로그인' },
  storage: { none: '저장 안 함', local: '기기 저장', 'server-db': '서버 DB' },
  upload: { yes: '파일 업로드' },
  payment: { yes: '결제' },
  money: { yes: '돈 계산' },
  externalApi: { yes: '외부 API' },
  stage: { prototype: '시제품', production: '실서비스' },
  scale: { large: '대규모' },
};

interface Props {
  /** null until cards exist: before that there is no project to summarize. */
  profile: Profile | null;
  rules: Rule[];
  decided: number;
  /** Picks the AI tailored to this project once a plan exists; null before that or on fallback. */
  skillPicks: SkillPick[] | null;
}

/**
 * Always-visible summary, so the engineering and security rules being applied are never
 * hidden behind a step the user has already left.
 */
export function Sidebar({ profile, rules, decided, skillPicks }: Props) {
  if (!profile) {
    return (
      <aside className="Side">
        <span className="SideHead">실시간 요약</span>
        <section className="Panel">
          <h3 className="SideTitle"><Sparkles size={14} /> 프로젝트 요약</h3>
          <p className="Empty">앱 설명을 입력하면 여기에 정해진 것, 적용되는 유지보수·보안 규칙, 추천 스킬이 실시간으로 보입니다.</p>
        </section>
        <AiSettings />
      </aside>
    );
  }
  const engineering = rules.filter((r) => r.category === 'engineering');
  const security = rules.filter((r) => r.category === 'security');
  const tags = (Object.keys(PROFILE_LABEL) as (keyof Profile)[])
    .map((k) => PROFILE_LABEL[k]?.[profile[k]])
    .filter((t): t is string => Boolean(t));
  // Tailored picks replace the profile-based ones once the plan exists; both come from the vetted catalog.
  const skills = skillPicks?.length
    ? mergeSkills(skillPicks, profile)
    : recommendSkills(profile).map((r) => ({ ...r, by: 'rule' as const }));

  return (
    <aside className="Side">
      <span className="SideHead">실시간 요약</span>
      <section className="Panel">
        <h3 className="SideTitle"><Sparkles size={14} /> 프로젝트 요약</h3>
        <div className="Tags">{tags.map((t) => <span key={t} className="Tag">{t}</span>)}</div>
        <div className="Stats">
          <div className="Stat"><span className="StatNum">{decided}</span><span className="StatLabel">정한 갈림길</span></div>
          <div className="Stat"><span className="StatNum">{rules.length}</span><span className="StatLabel">적용 규칙</span></div>
        </div>
      </section>

      <section className="Panel">
        <h3 className="SideTitle"><Blocks size={14} /> 추천 스킬 {skillPicks?.length ? <span className="Badge">이 프로젝트 맞춤 · AI</span> : <span className="Badge fallback">기본 · 규칙 기반</span>}</h3>
        <ul className="MiniList">
          {skills.map(({ skill, reason, by }) => (
            <li key={skill.id} className="MiniItem">
              <Blocks size={12} />
              <span>
                <a href={`https://github.com/${skill.repo}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', fontWeight: 700 }}>
                  {skill.name} <ExternalLink size={10} />
                </a>
                <span className="Note"> · {skill.repo.split('/')[0]}{skillPicks?.length && by === 'rule' ? ' · 규칙 추가' : ''}</span>
                <br />
                <span className="Note">{reason}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <AiSettings />

      <section className="Panel">
        <h3 className="SideTitle"><Wrench size={14} /> 유지보수 규칙 {engineering.length}</h3>
        {engineering.length ? (
          <ul className="MiniList">
            {engineering.map((r) => <li key={r.id} className="MiniItem"><Wrench size={12} />{r.title}</li>)}
          </ul>
        ) : <p className="Empty">선택된 유지보수 규칙이 없습니다.</p>}
        <h3 className="SideTitle"><ShieldCheck size={14} /> 보안 규칙 {security.length}</h3>
        {security.length ? (
          <ul className="MiniList">
            {security.map((r) => <li key={r.id} className="MiniItem"><ShieldCheck size={12} />{r.title}</li>)}
          </ul>
        ) : <p className="Empty">선택된 보안 규칙이 없습니다.</p>}
      </section>
    </aside>
  );
}
