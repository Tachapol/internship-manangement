import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TrainingPlanStatus } from 'database';

export class UpdateProgressDto {
  @ApiProperty({ enum: [TrainingPlanStatus.ACTIVE, TrainingPlanStatus.COMPLETED], description: 'Update status of the training plan' })
  @IsEnum(TrainingPlanStatus)
  @IsNotEmpty()
  status: TrainingPlanStatus;
}
