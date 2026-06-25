import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({ description: 'The IP address used for check-in', example: '192.168.1.1' })
  @IsString()
  @IsOptional()
  checkInIp?: string;

  @ApiPropertyOptional({ description: 'The coordinates/location used for check-in', example: '13.7563, 100.5018' })
  @IsString()
  @IsOptional()
  checkInLocation?: string;
}
