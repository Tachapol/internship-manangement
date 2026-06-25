import { IsEmail, IsNotEmpty, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { UserRole } from 'database';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  mentorId?: string;
}
