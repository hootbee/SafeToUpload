import { IsEnum } from 'class-validator';
import { AnalysisStatus } from '../../common/enums/analysis-status.enum';

export class UpdateAnalysisStatusDto {
  @IsEnum(AnalysisStatus)
  status!: AnalysisStatus;
}
