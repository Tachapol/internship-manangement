import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  token: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
