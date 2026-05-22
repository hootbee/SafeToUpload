import { TbShieldCheck, TbBrowserCheck, TbCode, TbCopy, TbShare } from "react-icons/tb";

interface Props {
  onStart: () => void;
}

export function OnboardingPanel({ onStart }: Props) {
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '50%', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TbShieldCheck size={44} />
        </div>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
            환영합니다!
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
            안전한 개인정보 보호를 위해<br />앱 사용에 필요한 권한을 안내해 드립니다.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '23px', textAlign: 'left', background: '#f8fafc', padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: '#ffffff', borderRadius: '8px', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <TbBrowserCheck size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>현재 탭 콘텐츠 점검 (activeTab)</span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>분석할 콘텐츠를 안전하게 읽어옵니다.</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: '#ffffff', borderRadius: '8px', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <TbCode size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>콘텐츠 스크린 삽입 (scripting)</span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>화면에 분석을 돕는 스크린을 띄웁니다.</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: '#ffffff', borderRadius: '8px', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <TbCopy size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>클립보드 접근 (clipboardWrite)</span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>수정된 안전한 문장을 바로 복사합니다.</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: '#ffffff', borderRadius: '8px', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <TbShare size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>대상 SNS (socialMedia)</span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Instagram / X / Facebook</span>
          </div>
        </div>
      </div>
      <label 
        className="btn primary" 
        role="button" 
        tabIndex={0} 
        onClick={onStart}
        onKeyDown={(e) => e.key === 'Enter' && onStart()}
        style={{ width: '100%', padding: '16px', textAlign: 'center', boxSizing: 'border-box', marginTop: '8px', fontSize: '15px' }}
      >
        시작하기
      </label>
    </section>
  );
}