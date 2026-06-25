import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'The IP address used for check-out', example: '192.168.1.1' })
  @IsString()
  @IsOptional()
  checkOutIp?: string;

  @ApiPropertyOptional({ description: 'The coordinates/location used for check-out', example: '13.7563, 100.5018' })
  @IsString()
  @IsOptional()
  checkOutLocation?: string;
}
