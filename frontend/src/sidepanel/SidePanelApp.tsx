import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, DEFAULT_SERVER_LLM_CHAT_URL, DEFAULT_SERVER_LLM_MODEL } from '../config/models';
import * as api from '../services/apiClient';
import { mapAiResponseToReport, mapHistoryToItem, mapRecordToReport } from '../services/analysisMapper';
import { detectMaskRegionsFromFile } from '../services/imageDetectService';
import { inferMaskCategoriesFromContext } from '../services/maskCategoryUtils';
import { applyMasksToFile, suggestedMaskedFileName } from '../services/imageMaskService';
import { isLocalModelReady, loadLocalModel, runLocalAnalysis } from '../services/localAiService';
import { ANALYSIS_STAGE_TITLES, ONBOARDING_KEY } from '../shared/constants';
import type {
  AnalysisInput,
  AnalysisStage,
  ExtensionMessage,
  HistoryItem,
  InferenceMode,
  MaskCategory,
  Platform,
  RiskReportData,
  SettingsState,
  TabKey,
} from '../shared/types';
import { AgentProgress } from './components/AgentProgress';
import { BottomTabNav } from './components/BottomTabNav';
import { ConfirmDialog, ConfirmDialog2 } from './components/ConfirmDialog';
import { HistoryList } from './components/HistoryList';
import { ImageMaskingPanel } from './components/ImageMaskingPanel';
import { ImageUploadBox } from './components/ImageUploadBox';
import { InferenceModeSelector } from './components/InferenceModeSelector';
import { ModelStatusBanner } from './components/ModelStatusBanner';
import { OnboardingPanel } from './components/OnboardingPanel';
import { PlatformSelector } from './components/PlatformSelector';
import { RewriteSuggestion } from './components/RewriteSuggestion';
import { RiskReport } from './components/RiskReport';
import { SettingsPanel } from './components/SettingsPanel';
import { TextInputCard } from './components/TextInputCard';
import { TbArrowLeft } from 'react-icons/tb';

const hasChromeRuntime = typeof chrome !== 'undefined' && !!chrome.runtime;

type ViewMode = 'home' | 'analysis-running' | 'report' | 'rewrite' | 'image-masking';

const createInitialStages = (): AnalysisStage[] =>
  ANALYSIS_STAGE_TITLES.map((title, idx) => ({
    id: `stage-${idx + 1}`,
    title,
    status: 'pending',
    logs: [],
  }));

const defaultSettings = (): SettingsState => ({
  inferenceMode: 'local',
  platforms: { instagram: true, x: true, facebook: true, other: false },
  sensitivity: 6,
  retentionDays: 30,
  notifications: true,
  serverLlm: {
    chatUrl: DEFAULT_SERVER_LLM_CHAT_URL,
    apiKey: '',
    model: DEFAULT_SERVER_LLM_MODEL,
  },
});

const mergeSettings = (partial: Partial<SettingsState>): SettingsState => {
  const base = defaultSettings();
  return {
    ...base,
    ...partial,
    platforms: { ...base.platforms, ...partial.platforms },
    serverLlm: { ...base.serverLlm, ...partial.serverLlm },
  };
};

const platformsToArray = (platforms: SettingsState['platforms']): Platform[] =>
  (Object.keys(platforms) as Platform[]).filter((p) => platforms[p]);

export function SidePanelApp() {
  const [tab, setTab] = useState<TabKey>('home');
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem(ONBOARDING_KEY) === 'true');

  const [modelStatus, setModelStatus] = useState<'not-loaded' | 'loading' | 'ready' | 'error'>('not-loaded');
  const [modelProgress, setModelProgress] = useState(0);
  const [modelError, setModelError] = useState('');

  const [text, setText] = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [stages, setStages] = useState(createInitialStages());
  const [currentStageTitle, setCurrentStageTitle] = useState('대기');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [report, setReport] = useState<RiskReportData | null>(null);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>('');
  const [analysisError, setAnalysisError] = useState('');
  const [maskError, setMaskError] = useState('');
  const [isMaskApplying, setIsMaskApplying] = useState(false);
  const [maskPreviewApplied, setMaskPreviewApplied] = useState(false);

  const [files, setFiles] = useState<File[]>([]);

  const analysisAbortedRef = useRef(false);
  const activeAnalysisIdRef = useRef<string | null>(null);
  const analysisImageFileRef = useRef<File | null>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);
  const maskedImagePreviewUrlRef = useRef<string | null>(null);

  const revokeImagePreviewUrl = useCallback(() => {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
    }
  }, []);

  const revokeMaskedPreviewUrl = useCallback(() => {
    if (maskedImagePreviewUrlRef.current) {
      URL.revokeObjectURL(maskedImagePreviewUrlRef.current);
      maskedImagePreviewUrlRef.current = null;
    }
  }, []);

  const attachImagePreview = useCallback(
    (result: RiskReportData, imageFile?: File): RiskReportData => {
      revokeImagePreviewUrl();
      revokeMaskedPreviewUrl();
      if (!imageFile) {
        return { ...result, imagePreviewUrl: undefined, maskedImagePreviewUrl: undefined };
      }
      const url = URL.createObjectURL(imageFile);
      imagePreviewUrlRef.current = url;
      return { ...result, imagePreviewUrl: url, maskedImagePreviewUrl: undefined };
    },
    [revokeImagePreviewUrl, revokeMaskedPreviewUrl],
  );

  useEffect(
    () => () => {
      revokeImagePreviewUrl();
      revokeMaskedPreviewUrl();
    },
    [revokeImagePreviewUrl, revokeMaskedPreviewUrl],
  );

  const refreshHistory = useCallback(async () => {
    try {
      const records = await api.fetchHistory();
      setHistory(records.map(mapHistoryToItem));
    } catch {
      // 백엔드 미연결 시 로컬 상태 유지
    }
  }, []);

  const persistSettings = useCallback(async (next: SettingsState) => {
    try {
      await api.updateSettings({
        targetPlatforms: platformsToArray(next.platforms),
        inferenceMode: next.inferenceMode,
        sensitivity: next.sensitivity * 10,
        retentionDays: next.retentionDays,
        notificationEnabled: next.notifications,
      });
    } catch {
      // 오프라인이면 로컬 설정만 유지
    }
  }, []);

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

  useEffect(() => {
    (async () => {
      try {
        const remote = await api.fetchSettings();
        setSettings(
          mergeSettings({
            inferenceMode: (remote.inferenceMode as InferenceMode) ?? 'local',
            platforms: {
              instagram: remote.targetPlatforms.includes('instagram'),
              x: remote.targetPlatforms.includes('x'),
              facebook: remote.targetPlatforms.includes('facebook'),
              other: remote.targetPlatforms.includes('other'),
            },
            sensitivity: Math.max(1, Math.min(10, Math.round(remote.sensitivity / 10) || 6)),
            retentionDays: (remote.retentionDays === 7 || remote.retentionDays === 90
              ? remote.retentionDays
              : 30) as 7 | 30 | 90,
            notifications: remote.notificationEnabled,
          }),
        );
      } catch {
        const saved = localStorage.getItem('safeToUploadSettings');
        if (saved) {
          try {
            setSettings(mergeSettings(JSON.parse(saved) as Partial<SettingsState>));
          } catch {
            /* ignore */
          }
        }
      }
      await refreshHistory();
    })();
  }, [refreshHistory]);

  useEffect(() => {
    localStorage.setItem('safeToUploadSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (settings.inferenceMode === 'server') {
      setModelStatus('ready');
      setModelError('');
    } else if (!isLocalModelReady() && modelStatus === 'ready') {
      setModelStatus('not-loaded');
    }
  }, [settings.inferenceMode]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history;
    return history.filter((h) => h.riskLevel === historyFilter);
  }, [history, historyFilter]);

  const canStartAnalysis =
    settings.inferenceMode === 'server' ? true : modelStatus === 'ready';

  const startOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDone(true);
  };

  const loadModel = async () => {
    if (settings.inferenceMode !== 'local') return;
    setModelStatus('loading');
    setModelProgress(0);
    setModelError('');
    try {
      await loadLocalModel((progress) => {
        setModelProgress(progress);
      });
      setModelStatus('ready');
    } catch (error) {
      setModelStatus('error');
      setModelError((error as Error).message);
    }
  };

  const updateStage = (
    title: string,
    status: AnalysisStage['status'],
    log: string,
    progressHint?: number,
  ) => {
    setCurrentStageTitle(title);
    if (progressHint != null) {
      setAnalysisProgress((prev) => Math.max(prev, Math.min(99, progressHint)));
    } else if (status === 'done') {
      const stageIdx = ANALYSIS_STAGE_TITLES.indexOf(title);
      const doneProgress = stageIdx >= 0 ? 12 + (stageIdx + 1) * 22 : 90;
      setAnalysisProgress((prev) => Math.max(prev, Math.min(99, doneProgress)));
    }

    setStages((prev) =>
      prev.map((stage) => {
        const order = ANALYSIS_STAGE_TITLES;
        const activeIdx = order.indexOf(title);
        const stageIdx = order.indexOf(stage.title);

        if (stage.title !== title) {
          if (status === 'running' && stageIdx >= 0 && stageIdx < activeIdx && stage.status === 'running') {
            return { ...stage, status: 'done' as const };
          }
          return stage;
        }

        const logs =
          log && (status === 'running' || status === 'done')
            ? stage.logs[stage.logs.length - 1] === log
              ? stage.logs
              : [...stage.logs, log].slice(-14)
            : stage.logs;
        return { ...stage, status, logs };
      }),
    );
  };

  const resolveImageDetections = async (imageFile?: File, gemmaCategories?: Set<MaskCategory>) => {
    if (!imageFile) return [];
    try {
      return await detectMaskRegionsFromFile(imageFile, (message, subPercent) => {
        const mapped =
          subPercent != null ? 68 + Math.round(subPercent * 0.27) : undefined;
        updateStage('이미지 분석', 'running', message, mapped);
      }, gemmaCategories);
    } catch (error) {
      console.warn('[SafeToUpload] 이미지 자동 탐지 실패, 폴백 영역 사용', error);
      return [];
    }
  };

  const commitMaskedPreview = useCallback(
    async (file: File, regions: RiskReportData['maskRegions']) => {
      const blob = await applyMasksToFile(file, regions);
      revokeMaskedPreviewUrl();
      const url = URL.createObjectURL(blob);
      maskedImagePreviewUrlRef.current = url;
      setReport((prev) => (prev ? { ...prev, maskedImagePreviewUrl: url } : prev));
    },
    [revokeMaskedPreviewUrl],
  );

  const finishReport = (result: RiskReportData, summary: string, imageFile?: File) => {
    const file = imageFile ?? files[0] ?? null;
    analysisImageFileRef.current = file;
    setMaskError('');
    setReport(attachImagePreview(result, file ?? undefined));
    setHistory((prev) => [
      {
        id: `h-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        platform,
        riskLevel: result.score >= 70 ? 'high' : result.score >= 40 ? 'medium' : 'low',
        summary,
      },
      ...prev,
    ]);
    setMaskPreviewApplied(false);
    setViewMode('report');
    void refreshHistory();
  };

  const openImageMasking = () => {
    setMaskPreviewApplied(false);
    setViewMode('image-masking');
  };

  const runLocalAnalysisFlow = async (input: AnalysisInput) => {
    const stageOrder = ANALYSIS_STAGE_TITLES;
    let stageIndex = 0;

    const ai = await runLocalAnalysis(input, (title, log, progress) => {
      if (analysisAbortedRef.current) return;
      if (title !== stageOrder[stageIndex]) {
        if (stageIndex >= 0 && stageIndex < stageOrder.length) {
          updateStage(stageOrder[stageIndex], 'done', `${stageOrder[stageIndex]} 완료`);
        }
        stageIndex = stageOrder.indexOf(title);
      }
      if (stageIndex >= 0 && stageIndex < stageOrder.length) {
        updateStage(stageOrder[stageIndex], 'running', log, progress);
      }
    });

    if (analysisAbortedRef.current) return;

    let detections: Awaited<ReturnType<typeof detectMaskRegionsFromFile>> = [];
    const gemmaCategories = input.imageFile
      ? inferMaskCategoriesFromContext(ai.imageRisks, input.text)
      : new Set<MaskCategory>();
    if (input.imageFile) {
      updateStage('이미지 분석', 'running', '마스킹 영역 자동 탐지(OwlViT) 시작...', 68);
      detections = await resolveImageDetections(input.imageFile, gemmaCategories);
    }

    stageOrder.forEach((title) => updateStage(title, 'done', `${title} 완료`));
    setAnalysisProgress(100);

    const result = mapAiResponseToReport(ai, input, detections);
    const summaryText =
      typeof ai.contextResult.summary === 'string'
        ? ai.contextResult.summary
        : result.contextSummary;
    finishReport(result, summaryText, input.imageFile);
  };

  const runServerAnalysisFlow = async (input: AnalysisInput) => {
    updateStage('PII 탐지', 'running', '서버에 분석 요청 생성 중...', 10);
    const created = await api.createAnalysis({
      sourceType: 'manual',
      platform: input.platform,
      inferenceMode: 'server',
      inputText: input.text,
      imagePath: input.imageName,
    });
    activeAnalysisIdRef.current = created.id;

    if (analysisAbortedRef.current) {
      await api.cancelAnalysis(created.id).catch(() => undefined);
      return;
    }

    updateStage('PII 탐지', 'done', '요청 등록 완료');
    updateStage('컨텍스트 분석', 'running', 'Gemma4 26B 서버 추론 실행 중...', 35);
    await api.runAnalysis(created.id, {
      chatUrl: settings.serverLlm.chatUrl,
      apiKey: settings.serverLlm.apiKey || undefined,
      model: settings.serverLlm.model,
    });

    if (analysisAbortedRef.current) {
      await api.cancelAnalysis(created.id).catch(() => undefined);
      return;
    }

    updateStage('컨텍스트 분석', 'done', '서버 추론 완료');
    updateStage('이미지 분석', 'running', '분석 결과 조회 중...', 55);
    const record = await api.getAnalysis(created.id);
    updateStage('리라이트 제안', 'running', '리라이트·위험 요약 반영 중...', 60);

    const recordAiRisks = (record.result?.imageRisks as Array<Record<string, unknown>>) ?? [];
    const gemmaCategories = input.imageFile
      ? inferMaskCategoriesFromContext(recordAiRisks, input.text)
      : new Set<MaskCategory>();

    let detections: Awaited<ReturnType<typeof detectMaskRegionsFromFile>> = [];
    if (input.imageFile) {
      updateStage('이미지 분석', 'running', '마스킹 영역 자동 탐지(OwlViT) 시작...', 68);
      detections = await resolveImageDetections(input.imageFile, gemmaCategories);
    }

    ANALYSIS_STAGE_TITLES.forEach((title) => updateStage(title, 'done', `${title} 완료`));
    setAnalysisProgress(100);

    const result = mapRecordToReport(record, input.platform, input.imageName, detections);
    finishReport(result, record.summary ?? result.contextSummary, input.imageFile);
  };

  const runAnalysis = async () => {
    if (!canStartAnalysis) return;
    setAnalysisError('');
    analysisAbortedRef.current = false;
    activeAnalysisIdRef.current = null;
    setViewMode('analysis-running');
    setStages(createInitialStages());
    setCurrentStageTitle('시작');
    setAnalysisProgress(2);
    updateStage('PII 탐지', 'running', '', 4);

    const imageFile = files[0] ?? undefined;
    if (imageFile) {
      analysisImageFileRef.current = imageFile;
    }

    const input: AnalysisInput = {
      text,
      platform,
      imageName: imageFile?.name,
      imageFile,
    };

    try {
      if (settings.inferenceMode === 'local') {
        await runLocalAnalysisFlow(input);
      } else {
        await runServerAnalysisFlow(input);
      }
    } catch (error) {
      if (!analysisAbortedRef.current) {
        setAnalysisError((error as Error).message);
        setViewMode('home');
      }
    }
  };

  const cancelAnalysis = async () => {
    analysisAbortedRef.current = true;
    setShowCancelDialog(false);
    if (activeAnalysisIdRef.current) {
      await api.cancelAnalysis(activeAnalysisIdRef.current).catch(() => undefined);
      activeAnalysisIdRef.current = null;
    }
    setViewMode('home');
    setCurrentStageTitle('취소됨');
  };

  const clearHistory = async () => {
    try {
      await api.deleteAllHistory();
    } catch {
      /* local only */
    }
    setHistory([]);
    setShowDeleteDialog(false);
  };

  const toggleMask = (id: string) => {
    setMaskError('');
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        maskRegions: prev.maskRegions.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)),
      };
    });
  };

  const applyImageMask = async () => {
    const file = analysisImageFileRef.current ?? files[0] ?? null;
    if (!report || !file) {
      setMaskError('마스킹할 원본 이미지가 없습니다. 이미지를 첨부한 뒤 다시 분석해 주세요.');
      return;
    }
    analysisImageFileRef.current = file;
    const selected = report.maskRegions.filter((r) => r.checked);
    if (selected.length === 0) {
      setMaskError('마스킹할 항목을 하나 이상 선택하세요.');
      return;
    }

    setIsMaskApplying(true);
    setMaskError('');
    try {
      await commitMaskedPreview(file, report.maskRegions);
      setMaskPreviewApplied(true);
    } catch (error) {
      setMaskError((error as Error).message);
    } finally {
      setIsMaskApplying(false);
    }
  };

  const downloadMaskedImage = () => {
    const url = report?.maskedImagePreviewUrl;
    if (!url) {
      setMaskError('먼저 「마스킹 적용」을 실행하세요.');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = suggestedMaskedFileName(analysisImageFileRef.current?.name);
    anchor.click();
  };

  const checkBackendHealth = async () => {
    try {
      setHealthStatus('연결 확인 중...');
      const data = await api.checkHealth();
      setHealthStatus(`성공: status=${data.status ?? 'unknown'}, mode=${data.appMode ?? 'unknown'}`);
    } catch (error) {
      setHealthStatus(`실패: ${(error as Error).message}`);
    }
  };

  const handleInferenceModeChange = (mode: InferenceMode) => {
    const next = { ...settings, inferenceMode: mode };
    setSettings(next);
    void persistSettings(next);
    if (mode === 'local' && !isLocalModelReady()) {
      setModelStatus('not-loaded');
    }
  };

  const handleBack = () => {
    if (viewMode === 'image-masking' || viewMode === 'rewrite') {
      setViewMode('report');
    } else if (viewMode === 'report') {
      setViewMode('home');
    }
  };

  const showBackButton =
    tab === 'home' && (viewMode === 'report' || viewMode === 'rewrite' || viewMode === 'image-masking');

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
      <header
        className="panel-header"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40px',
        }}
      >
        {showBackButton && (
          <button
            onClick={handleBack}
            className="back-btn"
            style={{
              position: 'absolute',
              left: 10,
              height: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
            }}
          >
            <TbArrowLeft size={20} />
          </button>
        )}
        <h1 className="logo-title" style={{ margin: 0 }}>
          AI PRIVACY GUARD
        </h1>
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
                  <p className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                    API: {API_BASE_URL}
                  </p>
                  {healthStatus && <p className="muted" style={{ marginTop: '4px' }}>{healthStatus}</p>}
                </section>

                <InferenceModeSelector value={settings.inferenceMode} onChange={handleInferenceModeChange} />

                {settings.inferenceMode === 'local' ? (
                  <ModelStatusBanner
                    status={modelStatus}
                    progress={modelProgress}
                    errorMessage={modelError}
                    onLoadModel={loadModel}
                    onRetry={loadModel}
                  />
                ) : (
                  <section className="card model-banner">
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>서버 AI 모드 (Gemma4 26B)</h3>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      Nest API → Chat Completions ({settings.serverLlm.model}). URL·API 키는 설정 탭에서
                      변경할 수 있습니다.
                    </p>
                  </section>
                )}

                <TextInputCard value={text} onChange={setText} />
                <PlatformSelector value={platform} onChange={setPlatform} />
                <ImageUploadBox files={files} onFilesChange={setFiles} />

                {analysisError && <p className="muted" style={{ color: '#c81e1e' }}>{analysisError}</p>}

                <button className="btn primary" type="button" onClick={runAnalysis} disabled={!canStartAnalysis}>
                  개인정보 분석 시작
                </button>
              </>
            )}

            {viewMode === 'analysis-running' && (
              <AgentProgress
                stages={stages}
                currentStageTitle={currentStageTitle}
                progress={analysisProgress}
                onRequestCancel={() => setShowCancelDialog(true)}
              />
            )}

            {viewMode === 'report' && report && (
              <RiskReport
                report={report}
                onOpenDetail={setSelectedRiskId}
                onOpenRewrite={() => setViewMode('rewrite')}
                onOpenImageMasking={openImageMasking}
              />
            )}

            {viewMode === 'rewrite' && report && <RewriteSuggestion report={report} />}
            {viewMode === 'image-masking' && report && (
              <ImageMaskingPanel
                report={report}
                hasSourceImage={Boolean(analysisImageFileRef.current)}
                showMaskedPreview={maskPreviewApplied}
                isApplying={isMaskApplying}
                maskError={maskError}
                onToggleMask={toggleMask}
                onApplyMask={() => void applyImageMask()}
                onDownload={downloadMaskedImage}
              />
            )}
          </>
        )}

        {tab === 'history' && (
          <HistoryList items={filteredHistory} filter={historyFilter} onFilter={setHistoryFilter} />
        )}

        {tab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onInferenceMode={handleInferenceModeChange}
            onTogglePlatform={(p) => {
              const next = { ...settings, platforms: { ...settings.platforms, [p]: !settings.platforms[p] } };
              setSettings(next);
              void persistSettings(next);
            }}
            onSensitivity={(value) => {
              const next = { ...settings, sensitivity: value };
              setSettings(next);
              void persistSettings(next);
            }}
            onRetention={(value) => {
              const next = { ...settings, retentionDays: value };
              setSettings(next);
              void persistSettings(next);
            }}
            onToggleNotification={() => {
              const next = { ...settings, notifications: !settings.notifications };
              setSettings(next);
              void persistSettings(next);
            }}
            onServerLlmChange={(patch) => {
              const next = {
                ...settings,
                serverLlm: { ...settings.serverLlm, ...patch },
              };
              setSettings(next);
            }}
            onClearAll={() => setShowDeleteDialog(true)}
          />
        )}
      </main>

      <BottomTabNav current={tab} onChange={setTab} />

      {selectedRiskId && report && (
        <ConfirmDialog2
          title="위험 상세 보기"
          description={`${report.piiItems.find((r) => r.id === selectedRiskId)?.description} / 위치: ${report.piiItems.find((r) => r.id === selectedRiskId)?.location} / 정책: ${report.piiItems.find((r) => r.id === selectedRiskId)?.policyRef}`}
          confirmText="닫기"
          onConfirm={() => setSelectedRiskId(null)}
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
