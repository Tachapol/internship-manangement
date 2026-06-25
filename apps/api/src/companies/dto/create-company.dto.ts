import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, IsEnum } from 'class-validator';
import { CompanyStatus } from 'database';

export class CreateCompanyDto {
  @ApiProperty({ description: 'The name of the company', example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'The logo image URL of the company', example: 'https://logo.com/acme.png' })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'A description of the company', example: 'Internship hosting company' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Official email domain of the company', example: 'acme.com' })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({ enum: CompanyStatus, default: CompanyStatus.ACTIVE, description: 'The current activation status' })
  @IsEnum(CompanyStatus)
  @IsOptional()
  status?: CompanyStatus;
}
