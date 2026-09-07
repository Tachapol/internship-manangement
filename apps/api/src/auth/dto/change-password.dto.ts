import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;
}
