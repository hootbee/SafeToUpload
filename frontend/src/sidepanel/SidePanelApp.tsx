import { useEffect, useMemo, useRef, useState } from 'react';
import { ONBOARDING_KEY } from '../shared/constants';
import type { AnalysisInput, ExtensionMessage, Platform, RiskReportData, SettingsState, TabKey } from '../shared/types';
import { AgentProgress } from './components/AgentProgress';
import { BottomTabNav } from './components/BottomTabNav';
import { ConfirmDialog } from './components/ConfirmDialog';
import { HistoryList } from './components/HistoryList';
import { ImageMaskingPanel } from './components/ImageMaskingPanel';
import { ImageUploadBox } from './components/ImageUploadBox';
import { ModelStatusBanner } from './components/ModelStatusBanner';
import { OnboardingPanel } from './components/OnboardingPanel';
import { PlatformSelector } from './components/PlatformSelector';
import { RewriteSuggestion } from './components/RewriteSuggestion';
import { RiskReport } from './components/RiskReport';
import { SettingsPanel } from './components/SettingsPanel';
import { TextInputCard } from './components/TextInputCard';
import { buildMockReport, createInitialStages, stageLogs } from './mock/mockAnalysis';
import { initialHistory } from './mock/mockHistory';

const hasChromeRuntime = typeof chrome !== 'undefined' && !!chrome.runtime;

type ViewMode = 'home' | 'analysis-running' | 'report' | 'rewrite' | 'image-masking';

export function SidePanelApp() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const [tab, setTab] = useState<TabKey>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem(ONBOARDING_KEY) === 'true');

  const [modelStatus, setModelStatus] = useState<'not-loaded' | 'loading' | 'ready' | 'error'>('not-loaded');
  const [modelProgress, setModelProgress] = useState(0);
  const [modelError, setModelError] = useState('');

  const [text, setText] = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [imageName] = useState<string | undefined>();

  const [history, setHistory] = useState(initialHistory);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [settings, setSettings] = useState<SettingsState>({
    platforms: { instagram: true, x: true, facebook: true, other: false },
    sensitivity: 6,
    retentionDays: 30,
    notifications: true,
  });
  const [stages, setStages] = useState(createInitialStages());
  const [currentStageTitle, setCurrentStageTitle] = useState('대기');
  const [report, setReport] = useState<RiskReportData | null>(null);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>('');

  const [files, setFiles] = useState<File[]>([]);

  const analysisTimerRef = useRef<number[]>([]);

  useEffect(() => {
    if (!hasChromeRuntime || !chrome.runtime.onMessage) return;

    const listener = (message: ExtensionMessage) => {
      if (message?.type === 'CONTEXT_ANALYZE_TEXT' && message.payload?.selectedText) {
        setTab('home');
        setViewMode('home');
        setText(message.payload.selectedText);
      }
      if (message?.type === 'INJECTED_BUTTON_CLICK') {
        setTab('home');
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => () => analysisTimerRef.current.forEach((id) => window.clearTimeout(id)), []);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history;
    return history.filter((h) => h.riskLevel === historyFilter);
  }, [history, historyFilter]);

  const startOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDone(true);
  };

  const loadModel = () => {
    setModelStatus('loading');
    setModelProgress(0);
    const fail = Math.random() < 0.2;
    let p = 0;
    const id = window.setInterval(() => {
      p += 10;
      setModelProgress(p);
      if (p >= 100) {
        window.clearInterval(id);
        if (fail) {
          setModelStatus('error');
          setModelError('WebGPU 미지원 또는 권한 부족 시나리오 (mock)');
          return;
        }
        setModelStatus('ready');
      }
    }, 140);
  };

  const runAnalysis = () => {
    if (modelStatus !== 'ready') return;
    setViewMode('analysis-running');
    setStages(createInitialStages());
    const input: AnalysisInput = { text, platform, imageName };

    const stageTitles = ['PII 탐지', '컨텍스트 분석', '이미지 분석', '리라이트 제안'];
    stageTitles.forEach((title, index) => {
      const startId = window.setTimeout(() => {
        setCurrentStageTitle(title);
        setStages((prev) =>
          prev.map((s) =>
            s.title === title
              ? { ...s, status: 'running', logs: stageLogs[title] ? [stageLogs[title][0]] : ['처리 중...'] }
              : s,
          ),
        );
      }, 700 * index);

      const finishId = window.setTimeout(() => {
        setStages((prev) =>
          prev.map((s) =>
            s.title === title
              ? { ...s, status: 'done', logs: stageLogs[title] || ['완료'] }
              : s,
          ),
        );
        if (index === stageTitles.length - 1) {
          const result = buildMockReport(input);
          setReport(result);
          setHistory((prev) => [
            {
              id: `h-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              platform,
              riskLevel: result.score >= 70 ? 'high' : result.score >= 40 ? 'medium' : 'low',
              summary: `자동 생성 요약: ${result.contextSummary}`,
            },
            ...prev,
          ]);
          //setViewMode('report');
        }
      }, 700 * index + 500);

      analysisTimerRef.current.push(startId, finishId);
    });
  };

  const cancelAnalysis = () => {
    analysisTimerRef.current.forEach((id) => window.clearTimeout(id));
    analysisTimerRef.current = [];
    setShowCancelDialog(false);
    setViewMode('home');
    setCurrentStageTitle('취소됨');
  };

  const clearHistory = () => {
    setHistory([]);
    setShowDeleteDialog(false);
  };

  const toggleMask = (id: string) => {
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        imageMasks: prev.imageMasks.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)),
      };
    });
  };

  const checkBackendHealth = async () => {
    try {
      setHealthStatus('연결 확인 중...');
      const response = await fetch(`${apiBaseUrl}/health`);
      if (!response.ok) {
        setHealthStatus(`실패: HTTP ${response.status}`);
        return;
      }
      const data = (await response.json()) as { status?: string; appMode?: string };
      setHealthStatus(`성공: status=${data.status ?? 'unknown'}, mode=${data.appMode ?? 'unknown'}`);
    } catch (error) {
      setHealthStatus(`실패: ${(error as Error).message}`);
    }
  };

  if (!onboardingDone) {
    return (
      <div className="panel-root">
        <header className="panel-header">
          <h1 className="logo-title">AI PRIVACY GUARD</h1>
        </header>
        <main className="panel-content">
          <OnboardingPanel onStart={startOnboarding} />
        </main>
      </div>
    );
  }

  return (
    <div className="panel-root">
      <header className="panel-header">
        <h1 className="logo-title">AI PRIVACY GUARD</h1>
      </header>
      
      <main className="panel-content">
        {tab === 'home' && (
          <>
            {viewMode === 'home' && (
              <>
                <section className="card">
                  <div className="flex-between">
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>시스템 연결 상태</h3>
                    <button className="btn-text" type="button" onClick={checkBackendHealth}>
                      연결 테스트
                    </button>
                  </div>
                  {healthStatus && <p className="muted" style={{ marginTop: '8px' }}>{healthStatus}</p>}
                </section>
                
                <ModelStatusBanner
                  status={modelStatus}
                  progress={modelProgress}
                  errorMessage={modelError}
                  onLoadModel={loadModel}
                  onRetry={loadModel}
                />
                
                <TextInputCard value={text} onChange={setText} />
                <PlatformSelector value={platform} onChange={setPlatform} />
                <ImageUploadBox files={files} onFilesChange={setFiles} />
                
                <button 
                  className="btn primary" 
                  type="button" 
                  onClick={runAnalysis} 
                  disabled={modelStatus !== 'ready'}
                >
                  개인정보 분석 시작
                </button>
              </>
            )}

            {viewMode === 'analysis-running' && (
              <AgentProgress
                stages={stages}
                currentStageTitle={currentStageTitle}
                onRequestCancel={() => setShowCancelDialog(true)}
              />
            )}
            
            {viewMode === 'report' && report && (
              <RiskReport
                report={report}
                onOpenDetail={setSelectedRiskId}
                onOpenRewrite={() => setViewMode('rewrite')}
                onOpenImageMasking={() => setViewMode('image-masking')}
              />
            )}
            
            {viewMode === 'rewrite' && report && <RewriteSuggestion report={report} />}
            {viewMode === 'image-masking' && report && <ImageMaskingPanel report={report} onToggleMask={toggleMask} />}
          </>
        )}

        {tab === 'history' && (
          <HistoryList items={filteredHistory} filter={historyFilter} onFilter={setHistoryFilter} />
        )}

        {tab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onTogglePlatform={(p) =>
              setSettings((prev) => ({ ...prev, platforms: { ...prev.platforms, [p]: !prev.platforms[p] } }))
            }
            onSensitivity={(value) => setSettings((prev) => ({ ...prev, sensitivity: value }))}
            onRetention={(value) => setSettings((prev) => ({ ...prev, retentionDays: value }))}
            onToggleNotification={() => setSettings((prev) => ({ ...prev, notifications: !prev.notifications }))}
            onClearAll={() => setShowDeleteDialog(true)}
          />
        )}
      </main>

      <BottomTabNav current={tab} onChange={setTab} />

      {selectedRiskId && report && (
        <ConfirmDialog
          title="위험 상세 보기"
          description={`${report.piiItems.find((r) => r.id === selectedRiskId)?.description} / 위치: ${report.piiItems.find((r) => r.id === selectedRiskId)?.location} / 정책: ${report.piiItems.find((r) => r.id === selectedRiskId)?.policyRef}`}
          confirmText="닫기"
          cancelText="닫기"
          onConfirm={() => setSelectedRiskId(null)}
          onCancel={() => setSelectedRiskId(null)}
        />
      )}

      {showDeleteDialog && (
        <ConfirmDialog
          title="데이터 삭제 확인"
          description="전체 분석 기록을 삭제하시겠습니까? 이 작업은 복구할 수 없습니다."
          confirmText="삭제 확인"
          cancelText="취소"
          onConfirm={clearHistory}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}

      {showCancelDialog && (
        <ConfirmDialog
          title="분석 취소 확인"
          description={`현재 단계: ${currentStageTitle}. 취소 시 분석 결과가 저장되지 않습니다.`}
          confirmText="분석 취소"
          cancelText="계속 분석"
          onConfirm={cancelAnalysis}
          onCancel={() => setShowCancelDialog(false)}
        />
      )}
    </div>
  );
}