import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from 'database';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

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
    const [
      totalCompanies,
      totalStudents,
      totalMentors,
      activeStudents,
      totalAttendances,
      activeAttendances,
      pendingLeaves,
      totalTrainingPlans,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
      this.prisma.user.count({ where: { role: UserRole.MENTOR } }),
      this.prisma.user.count({ where: { role: UserRole.STUDENT, status: 'ACTIVE' } }),
      this.prisma.attendance.count(),
      this.prisma.attendance.count({ where: { status: { in: ['PRESENT', 'LATE'] } } }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.trainingPlan.count(),
    ]);

    const attendanceRate = totalAttendances > 0 ? Math.round((activeAttendances / totalAttendances) * 100) : 0;

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
    const [
      companies,
      rawAttendanceStats,
      mentors,
      rawLeaveByType,
      rawLeaveByStatus,
      totalStudents,
      totalMentors,
      totalTrainingPlans,
    ] = await Promise.all([
      this.prisma.company.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          users: {
            select: {
              role: true,
            },
          },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.MENTOR },
        select: {
          id: true,
          name: true,
          email: true,
          students: {
            select: {
              id: true,
              attendances: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.leaveRequest.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      this.prisma.leaveRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
      this.prisma.user.count({ where: { role: UserRole.MENTOR } }),
      this.prisma.trainingPlan.count(),
    ]);

    const companyOverview = companies.map((c) => {
      const studentCount = c.users.filter((u) => u.role === UserRole.STUDENT).length;
      const mentorCount = c.users.filter((u) => u.role === UserRole.MENTOR).length;
      return {
        id: c.id,
        companyId: c.id,
        name: c.name,
        status: c.status,
        studentCount,
        mentorCount,
      };
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

    const mentorPerformance = mentors.map((m) => {
      const studentCount = m.students.length;
      let totalChecks = 0;
      let positiveChecks = 0;

      for (const student of m.students) {
        for (const att of student.attendances) {
          totalChecks++;
          if (att.status === 'PRESENT' || att.status === 'LATE') {
            positiveChecks++;
          }
        }
      }

      return {
        id: m.id,
        mentorId: m.id,
        name: m.name,
        email: m.email,
        studentCount,
        checkInRate: totalChecks > 0 ? Math.round((positiveChecks / totalChecks) * 100) : 0,
      };
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
        teamId: true,
      },
    });

    const studentIds = assignedStudents.map((s) => s.id);
    const teamIds = Array.from(
      new Set(assignedStudents.map((s) => s.teamId).filter((t): t is string => Boolean(t))),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayAttendances, pendingRequests, totalModulesCount, completedModulesCount] = await Promise.all([
      studentIds.length > 0
        ? this.prisma.attendance.findMany({
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
          })
        : Promise.resolve([]),
      studentIds.length > 0
        ? this.prisma.leaveRequest.findMany({
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
          })
        : Promise.resolve([]),
      teamIds.length > 0
        ? this.prisma.trainingPlanModule.count({
            where: {
              trainingPlan: { teamId: { in: teamIds }, deletedAt: null },
              deletedAt: null,
            },
          })
        : Promise.resolve(0),
      teamIds.length > 0 && studentIds.length > 0
        ? this.prisma.studentModuleProgress.count({
            where: {
              studentId: { in: studentIds },
              status: 'COMPLETED',
              module: {
                trainingPlan: { teamId: { in: teamIds }, deletedAt: null },
                deletedAt: null,
              },
            },
          })
        : Promise.resolve(0),
    ]);

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

    const pendingLeaveRequests = pendingRequests.map((r) => ({
      id: r.id,
      type: r.type,
      startDate: r.startDate.toISOString().split('T')[0],
      endDate: r.endDate.toISOString().split('T')[0],
      reason: r.reason,
      studentName: r.student.name,
      studentEmail: r.student.email,
    }));

    const totalExpectedModules = totalModulesCount * studentIds.length;
    const trainingPlanProgress = {
      total: totalExpectedModules,
      completed: completedModulesCount,
      rate: totalExpectedModules > 0 ? Math.round((completedModulesCount / totalExpectedModules) * 100) : 0,
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
    const studentUserObj = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { teamId: true },
    });

    const [
      attendanceHistory,
      rawStudentAttendanceCounts,
      leaveStatus,
      notifications,
      modules,
    ] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { userId: studentId },
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          date: true,
          checkIn: true,
          checkOut: true,
          status: true,
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: { userId: studentId },
        _count: { _all: true },
      }),
      this.prisma.leaveRequest.findMany({
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
      }),
      this.prisma.notification.findMany({
        where: { userId: studentId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          read: true,
        },
      }),
      studentUserObj?.teamId
        ? this.prisma.trainingPlanModule.findMany({
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
          })
        : Promise.resolve([]),
    ]);

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

    const totalModules = modules.length;
    const completedModules = modules.filter((m) => m.progresses[0]?.status === 'COMPLETED').length;
    const mappedPlans = modules.map((m) => ({
      id: m.id,
      week: m.weekNumber,
      title: m.title,
      status: m.progresses[0]?.status || 'ACTIVE',
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    }));

    const trainingPlanProgress = {
      total: totalModules,
      completed: completedModules,
      rate: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      plans: mappedPlans,
    };

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
