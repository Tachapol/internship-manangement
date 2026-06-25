import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTeamDto {
  @ApiProperty({ description: 'The updated name of the team', example: 'Web Development Team' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
