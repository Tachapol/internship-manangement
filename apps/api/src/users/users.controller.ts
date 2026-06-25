import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, UserStatus } from 'database';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitationsService: InvitationsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  async findAll(
    @GetUser() currentUser: { id: string; role: UserRole },
    @Query('role') role?: UserRole,
    @Query('companyId') companyId?: string,
    @Query('teamId') teamId?: string,
    @Query('mentorId') mentorId?: string,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {
      role,
      companyId,
      teamId,
      mentorId,
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };

    // If current user is a MENTOR, restrict them to viewing only their own students
    if (currentUser.role === UserRole.MENTOR) {
      filters.mentorId = currentUser.id;
      filters.role = UserRole.STUDENT;
    }

    return this.usersService.findAll(filters);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Role-based restrictions
    if (
      currentUser.role === UserRole.MENTOR &&
      (user.role !== UserRole.STUDENT || user.mentorId !== currentUser.id)
    ) {
      throw new ForbiddenException('You do not have permission to view this profile');
    }

    return user;
  }

  @Post('invite')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  async invite(
    @Body() body: { email: string; role: UserRole; companyId: string; mentorId?: string },
    @GetUser('id') invitedById: string,
  ) {
    return this.invitationsService.createInvitation(
      {
        email: body.email,
        role: body.role,
        companyId: body.companyId,
        mentorId: body.mentorId,
        name: body.email.split('@')[0], // Generate temporary name from email prefix
      },
      invitedById,
    );
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Permission checks: Admin can update anything. Own profile can update name and phone only.
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You do not have permission to modify this user');
    }

    const dataToUpdate: any = {};
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.BD_TEAM || currentUser.role === UserRole.MENTOR) {
      if (body.teamId !== undefined) dataToUpdate.teamId = body.teamId ? body.teamId : null;
    }
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // Admin fields
      if (body.role) dataToUpdate.role = body.role;
      if (body.status) dataToUpdate.status = body.status;
      if (body.companyId) dataToUpdate.companyId = body.companyId;
      if (body.mentorId) dataToUpdate.mentorId = body.mentorId;
    }

    // Self fields / generic fields
    if (body.name) dataToUpdate.name = body.name;
    if (body.phone) dataToUpdate.phone = body.phone;

    return this.usersService.update(id, dataToUpdate);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.softDelete(id);
  }

  @Patch(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() currentUser: { id: string; role: UserRole },
  ) {
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You do not have permission to upload an avatar for this user');
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const avatarUrl = await this.storageService.uploadFile(file, 'avatars');
    return this.usersService.update(id, { avatarUrl });
  }
}
