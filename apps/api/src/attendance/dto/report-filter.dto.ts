import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReportFilterDto {
  @ApiProperty({ description: 'The report year', example: 2026 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'The report month (1-12)', example: 6 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({ description: 'Specify student UUID (required for mentors/admins viewing student reports)', example: 'student-uuid' })
  @IsUUID()
  @IsOptional()
  studentId?: string;
}
