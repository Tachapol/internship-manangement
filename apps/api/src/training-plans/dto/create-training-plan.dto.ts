import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTrainingPlanDto {
  @ApiProperty({ description: 'Target team UUID assigned to this plan', example: 'team-uuid' })
  @IsUUID()
  @IsNotEmpty()
  teamId: string;

  @ApiProperty({ description: 'The title of the training plan', example: 'Web Dev Curriculum' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'A description of training topics/tasks', example: 'Build a Next.js fullstack application' })
  @IsString()
  @IsOptional()
  description?: string;
}
