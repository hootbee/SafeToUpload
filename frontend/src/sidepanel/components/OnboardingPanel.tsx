interface Props {
  onStart: () => void;
}

export function OnboardingPanel({ onStart }: Props) {
  return (
    <section className="card">
      <h2>G-01 온보딩 & 권한 안내</h2>
      <ul>
        <li>activeTab: 현재 탭 콘텐츠 점검 트리거</li>
        <li>scripting: 콘텐츠 버튼 삽입</li>
        <li>clipboardWrite: 수정 문장 복사</li>
        <li>대상 SNS: Instagram / X / Facebook</li>
      </ul>
      <button className="btn" type="button" onClick={onStart}>
        시작하기
      </button>
    </section>
  );
}
