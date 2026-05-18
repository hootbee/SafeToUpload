import { RiskLevel } from '../../common/enums/risk-level.enum';

export interface AiAnalysisResponse {
  riskScore: number;
  riskLevel: RiskLevel;
  piiItems: unknown[];
  exifItems: unknown[];
  imageRisks: unknown[];
  contextResult: Record<string, unknown>;
  rewriteSuggestion: string;
  rawAiResponse: Record<string, unknown>;
}
