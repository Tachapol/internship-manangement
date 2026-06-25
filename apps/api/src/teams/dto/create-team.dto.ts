import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ description: 'The name of the team', example: 'Web Front-End Team' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Company ID this team belongs to', example: 'company-uuid' })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;
}
