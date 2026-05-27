import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { RunAnalysisDto } from './dto/run-analysis.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  create(@Body() dto: CreateAnalysisDto) {
    return this.analysisService.create(dto);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('image file required');
    }
    return this.analysisService.uploadImage(id, file);
  }

  @Post(':id/run')
  run(@Param('id') id: string, @Body() dto: RunAnalysisDto) {
    return this.analysisService.run(id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analysisService.findOne(id);
  }

  @Get(':id/status')
  findStatus(@Param('id') id: string) {
    return this.analysisService.findStatus(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.analysisService.cancel(id);
  }
}
