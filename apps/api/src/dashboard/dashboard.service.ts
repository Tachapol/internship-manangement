import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from 'database';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async getDashboardStats(userId: string, role: UserRole) {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return this.getSuperAdminStats();
      case UserRole.BD_TEAM:
        return this.getBdTeamStats();
      case UserRole.MENTOR:
        return this.getMentorStats(userId);
      case UserRole.STUDENT:
        return this.getStudentStats(userId);
      default:
        throw new ForbiddenException('Invalid role for dashboard access');
    }
  }

  private async getSuperAdminStats() {
    const totalCompanies = await this.prisma.company.count();
    const totalStudents = await this.prisma.user.count({ where: { role: UserRole.STUDENT } });
    const totalMentors = await this.prisma.user.count({ where: { role: UserRole.MENTOR } });
    const activeStudents = await this.prisma.user.count({
      where: { role: UserRole.STUDENT, status: 'ACTIVE' },
    });

    const totalAttendances = await this.prisma.attendance.count();
    const activeAttendances = await this.prisma.attendance.count({
      where: { status: { in: ['PRESENT', 'LATE'] } },
    });
    const attendanceRate = totalAttendances > 0 ? Math.round((activeAttendances / totalAttendances) * 100) : 0;

    const pendingLeaves = await this.prisma.leaveRequest.count({
      where: { status: 'PENDING' },
    });

    const totalTrainingPlans = await this.prisma.trainingPlan.count();

    return {
      role: UserRole.SUPER_ADMIN,
      totalCompanies,
      totalStudents,
      totalMentors,
      activeStudents,
      attendanceRate,
      pendingLeaves,
      totalTrainingPlans,
    };
  }

  private async getBdTeamStats() {
    const companies = await this.prisma.company.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    const companyOverview = await Promise.all(
      companies.map(async (c) => {
        const studentCount = await this.prisma.user.count({
          where: { companyId: c.id, role: UserRole.STUDENT },
        });
        const mentorCount = await this.prisma.user.count({
          where: { companyId: c.id, role: UserRole.MENTOR },
        });
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          studentCount,
          mentorCount,
        };
      }),
    );

    const rawAttendanceStats = await this.prisma.attendance.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const attendanceStats = {
      PRESENT: 0,
      LATE: 0,
      ABSENT: 0,
      ON_LEAVE: 0,
    };
    rawAttendanceStats.forEach((stat) => {
      if (stat.status in attendanceStats) {
        attendanceStats[stat.status as keyof typeof attendanceStats] = stat._count._all;
      }
    });

    const mentors = await this.prisma.user.findMany({
      where: { role: UserRole.MENTOR },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const mentorPerformance = await Promise.all(
      mentors.map(async (m) => {
        const assignedStudents = await this.prisma.user.findMany({
          where: { mentorId: m.id },
          select: { id: true },
        });
        const studentIds = assignedStudents.map((s) => s.id);

        const totalChecks = await this.prisma.attendance.count({
          where: { userId: { in: studentIds } },
        });
        const positiveChecks = await this.prisma.attendance.count({
          where: { userId: { in: studentIds }, status: { in: ['PRESENT', 'LATE'] } },
        });

        return {
          id: m.id,
          name: m.name,
          email: m.email,
          studentCount: studentIds.length,
          checkInRate: totalChecks > 0 ? Math.round((positiveChecks / totalChecks) * 100) : 0,
        };
      }),
    );

    const rawLeaveByType = await this.prisma.leaveRequest.groupBy({
      by: ['type'],
      _count: { _all: true },
    });
    const rawLeaveByStatus = await this.prisma.leaveRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const leaveStats = {
      byType: { SICK: 0, CASUAL: 0, ANNUAL: 0, OTHER: 0 },
      byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 },
    };

    rawLeaveByType.forEach((item) => {
      if (item.type in leaveStats.byType) {
        leaveStats.byType[item.type as keyof typeof leaveStats.byType] = item._count._all;
      }
    });

    rawLeaveByStatus.forEach((item) => {
      if (item.status in leaveStats.byStatus) {
        leaveStats.byStatus[item.status as keyof typeof leaveStats.byStatus] = item._count._all;
      }
    });

    const totalStudents = await this.prisma.user.count({ where: { role: UserRole.STUDENT } });
    const totalMentors = await this.prisma.user.count({ where: { role: UserRole.MENTOR } });
    const totalTrainingPlans = await this.prisma.trainingPlan.count();

    return {
      role: UserRole.BD_TEAM,
      companyOverview,
      attendanceStats,
      mentorPerformance,
      leaveStats,
      totalStudents,
      totalMentors,
      totalTrainingPlans,
    };
  }

  private async getMentorStats(mentorId: string) {
    const assignedStudents = await this.prisma.user.findMany({
      where: { mentorId, role: UserRole.STUDENT },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    const studentIds = assignedStudents.map((s) => s.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendances = await this.prisma.attendance.findMany({
      where: {
        userId: { in: studentIds },
        date: today,
      },
      select: {
        userId: true,
        status: true,
        checkIn: true,
        checkOut: true,
      },
    });

    const attendanceSummary = {
      checkedIn: todayAttendances.length,
      totalExpected: studentIds.length,
      details: assignedStudents.map((s) => {
        const check = todayAttendances.find((a) => a.userId === s.id);
        return {
          studentName: s.name,
          studentId: s.id,
          status: check ? check.status : 'ABSENT',
          checkInTime: check ? check.checkIn : null,
          checkOutTime: check ? check.checkOut : null,
        };
      }),
    };

    const pendingRequests = await this.prisma.leaveRequest.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'PENDING',
      },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        reason: true,
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const pendingLeaveRequests = pendingRequests.map((r) => ({
      id: r.id,
      type: r.type,
      startDate: r.startDate.toISOString().split('T')[0],
      endDate: r.endDate.toISOString().split('T')[0],
      reason: r.reason,
      studentName: r.student.name,
      studentEmail: r.student.email,
    }));

    let totalModulesCount = 0;
    let completedModulesCount = 0;

    for (const student of assignedStudents) {
      const userObj = await this.prisma.user.findUnique({
        where: { id: student.id },
        select: { teamId: true },
      });
      if (userObj?.teamId) {
        const totalModules = await this.prisma.trainingPlanModule.count({
          where: {
            trainingPlan: { teamId: userObj.teamId, deletedAt: null },
            deletedAt: null,
          },
        });
        const completedModules = await this.prisma.studentModuleProgress.count({
          where: {
            studentId: student.id,
            status: 'COMPLETED',
            module: {
              trainingPlan: { teamId: userObj.teamId, deletedAt: null },
              deletedAt: null,
            },
          },
        });
        totalModulesCount += totalModules;
        completedModulesCount += completedModules;
      }
    }

    const trainingPlanProgress = {
      total: totalModulesCount,
      completed: completedModulesCount,
      rate: totalModulesCount > 0 ? Math.round((completedModulesCount / totalModulesCount) * 100) : 0,
    };

    return {
      role: UserRole.MENTOR,
      assignedStudents,
      attendanceSummary,
      pendingLeaveRequests,
      trainingPlanProgress,
    };
  }

  private async getStudentStats(studentId: string) {
    const attendanceHistory = await this.prisma.attendance.findMany({
      where: { userId: studentId },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        date: true,
        checkIn: true,
        checkOut: true,
        status: true,
      },
    });

    const rawStudentAttendanceCounts = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: { userId: studentId },
      _count: { _all: true },
    });

    const attendanceSummary = {
      PRESENT: 0,
      LATE: 0,
      ABSENT: 0,
      ON_LEAVE: 0,
    };
    rawStudentAttendanceCounts.forEach((item) => {
      if (item.status in attendanceSummary) {
        attendanceSummary[item.status as keyof typeof attendanceSummary] = item._count._all;
      }
    });

    const leaveStatus = await this.prisma.leaveRequest.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    const studentUserObj = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { teamId: true },
    });

    let totalModules = 0;
    let completedModules = 0;
    let mappedPlans: any[] = [];

    if (studentUserObj?.teamId) {
      const modules = await this.prisma.trainingPlanModule.findMany({
        where: {
          trainingPlan: { teamId: studentUserObj.teamId, deletedAt: null },
          deletedAt: null,
        },
        orderBy: { weekNumber: 'asc' },
        include: {
          progresses: {
            where: { studentId },
            select: { status: true },
          },
        },
      });

      totalModules = modules.length;
      completedModules = modules.filter(
        (m) => m.progresses[0]?.status === 'COMPLETED',
      ).length;

      mappedPlans = modules.map((m) => ({
        id: m.id,
        week: m.weekNumber,
        title: m.title,
        status: m.progresses[0]?.status || 'ACTIVE',
        dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      }));
    }

    const trainingPlanProgress = {
      total: totalModules,
      completed: completedModules,
      rate: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      plans: mappedPlans,
    };

    const notifications = await this.prisma.notification.findMany({
      where: { userId: studentId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        read: true,
      },
    });

    const recentNotifications = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      read: n.read,
    }));

    return {
      role: UserRole.STUDENT,
      attendanceHistory,
      attendanceSummary,
      leaveStatus,
      trainingPlanProgress,
      recentNotifications,
    };
  }
}
