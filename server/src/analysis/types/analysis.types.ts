import { AnalysisStatus } from '../../common/enums/analysis-status.enum';
import { RiskLevel } from '../../common/enums/risk-level.enum';

export interface AnalysisRunResult {
  id: string;
  status: AnalysisStatus;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  summary: string | null;
  piiTypes: string[];
  piiCount: number;
}
