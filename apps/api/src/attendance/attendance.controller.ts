import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, AttendanceStatus } from 'database';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles(UserRole.STUDENT)
  async checkIn(
    @GetUser('id') studentId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(studentId, dto);
  }

  @Post('check-out')
  @Roles(UserRole.STUDENT)
  async checkOut(
    @GetUser('id') studentId: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(studentId, dto);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.BD_TEAM, UserRole.SUPER_ADMIN)
  async findAll(
    @GetUser() user: { id: string; role: string; companyId?: string },
    @Query('studentId') studentId?: string,
    @Query('companyId') companyId?: string,
    @Query('mentorId') mentorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: AttendanceStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      studentId,
      companyId,
      mentorId,
      startDate,
      endDate,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };
    return this.attendanceService.getAttendanceList(user, filters);
  }

  @Get('today')
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.SUPER_ADMIN)
  async today(
    @GetUser() currentUser: { id: string; role: UserRole },
    @Query('studentId') studentId?: string,
  ) {
    let targetStudentId = currentUser.id;

    if (currentUser.role !== UserRole.STUDENT) {
      if (!studentId) {
        throw new ForbiddenException('studentId query parameter is required for mentors/admins');
      }
      targetStudentId = studentId;
    }

    return this.attendanceService.getTodayStatus(targetStudentId);
  }

  @Get('report')
  @Roles(UserRole.STUDENT, UserRole.MENTOR, UserRole.BD_TEAM, UserRole.SUPER_ADMIN)
  async report(
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
    @Query('studentId') studentId?: string,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    const now = new Date();
    const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;

    return this.attendanceService.getCohortMonthlyReport(currentUser, studentId, year, month);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  async override(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: AttendanceStatus; note?: string },
  ) {
    return this.attendanceService.overrideAttendance(id, body.status, body.note);
  }
}
