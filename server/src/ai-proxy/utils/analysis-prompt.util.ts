import {
  buildExtensionAnalysisPrompt,
  buildOpenWebUiImagePrompt,
  buildRewriteOnlyPrompt,
  resolveLlmPromptProfile,
  type ResolvedLlmPromptProfile,
} from '../../_shared/prompts/index';

export interface AnalysisPromptInput {
  platform: string;
  inputText?: string;
  imagePath?: string;
  /** true면 요청에 이미지 픽셀이 포함됨 (멀티모달) */
  visionAttached?: boolean;
}

export type { ResolvedLlmPromptProfile };

export function buildServerAnalysisPrompt(
  input: AnalysisPromptInput,
  promptProfileSetting?: string,
): { prompt: string; profile: ResolvedLlmPromptProfile } {
  const profile = resolveLlmPromptProfile(promptProfileSetting, Boolean(input.visionAttached));

  if (profile === 'openwebui') {
    return {
      profile,
      prompt: buildOpenWebUiImagePrompt({
        inputText: input.inputText,
        imagePath: input.imagePath,
      }),
    };
  }

  return {
    profile,
    prompt: buildExtensionAnalysisPrompt({
      platform: input.platform,
      inputText: input.inputText,
      imagePath: input.imagePath,
      visionAttached: input.visionAttached,
    }),
  };
}

/** Open WebUI UI에 복사·붙여넣기용 (이미지는 채팅에 직접 첨부) */
export function buildOpenWebUiPromptForCopy(input: AnalysisPromptInput): string {
  return buildOpenWebUiImagePrompt({
    inputText: input.inputText,
    imagePath: input.imagePath,
  });
}

export function buildRewriteRefinePrompt(input: {
  platform: string;
  originalText?: string;
  draftRewrite?: string;
}): string {
  return buildRewriteOnlyPrompt({
    platform: input.platform,
    originalText: input.originalText,
    draftRewrite: input.draftRewrite,
  });
}
