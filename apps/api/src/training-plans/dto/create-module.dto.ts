import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, IsInt, Min, IsDateString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateModuleDto {
  @ApiProperty({ description: 'The training plan UUID this module belongs to', example: 'plan-uuid' })
  @IsUUID()
  @IsNotEmpty()
  trainingPlanId: string;

  @ApiProperty({ description: 'The title of the module', example: 'Module 1: Semantic HTML' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'A description of topics/tasks in this module', example: 'Practice HTML semantic structures' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'The week index number or order', example: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  weekNumber: number;

  @ApiPropertyOptional({ description: 'External reference link URL', example: 'https://developer.mozilla.org' })
  @IsUrl()
  @IsOptional()
  externalLink?: string;

  @ApiPropertyOptional({ description: 'Due date for this module', example: '2026-06-30T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
