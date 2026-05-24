import { IsOptional, IsString } from 'class-validator';

export class LlmConfigDto {
  @IsOptional()
  @IsString()
  chatUrl?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
