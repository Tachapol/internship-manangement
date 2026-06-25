import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeaveRequestsService } from './leave-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, LeaveType, LeaveStatus } from 'database';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() body: { type: LeaveType; startDate: string; endDate: string; reason: string },
    @GetUser('id') studentId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.leaveRequestsService.createRequest(studentId, body, file);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.BD_TEAM, UserRole.SUPER_ADMIN)
  async findAll(
    @GetUser() user: { id: string; role: UserRole },
    @Query('studentId') studentId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      studentId,
      status,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };
    return this.leaveRequestsService.getRequestsList(user, filters);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.BD_TEAM, UserRole.SUPER_ADMIN)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: UserRole },
  ) {
    return this.leaveRequestsService.getRequestDetails(id, user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { approverNote?: string },
    @GetUser('id') approverId: string,
  ) {
    return this.leaveRequestsService.approveRequest(id, approverId, body.approverNote);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { approverNote: string },
    @GetUser('id') approverId: string,
  ) {
    return this.leaveRequestsService.rejectRequest(id, approverId, body.approverNote);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.STUDENT)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') studentId: string,
  ) {
    return this.leaveRequestsService.cancelRequest(id, studentId);
  }
}
