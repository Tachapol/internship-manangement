import { UserRole } from 'database';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}
