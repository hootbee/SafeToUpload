interface Props {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <section className="card error-box">
      <h3>권한 오류 안내</h3>
      <p>{message}</p>
      <p className="muted">CPU 모드 폴백을 고려할 수 있습니다 (mock 안내)</p>
      <label
        className="btn" 
        role="button"
        tabIndex={0} 
        onClick={onRetry}
        onKeyDown={(e) => e.key === 'Enter' && onRetry()}>
        다시 시도
      </label>
    </section>
  );
}
