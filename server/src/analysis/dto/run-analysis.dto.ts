import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { LlmConfigDto } from '../../ai-proxy/dto/llm-config.dto';

export class RunAnalysisDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LlmConfigDto)
  llm?: LlmConfigDto;
}
