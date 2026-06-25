import { PrismaClient, UserRole, UserStatus, CompanyStatus, AttendanceStatus, TrainingPlanStatus, LeaveType, LeaveStatus, NotificationType, AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Company ───────────────────────────────────────────────
  const companyId = "c89280ab-1025-4bc6-8d14-ceb6cb9086c8";
  const company = await prisma.company.upsert({
    where: { id: companyId },
    update: {},
    create: {
      id: companyId,
      name: "DevPlus Co., Ltd.",
      description: "Leading software house in Thailand",
      domain: "devplus.co.th",
      status: CompanyStatus.ACTIVE,
    },
  });

  console.log("✅ Company:", company.name);

  // ─── Team ──────────────────────────────────────────────────
  const team = await prisma.team.upsert({
    where: { id: "d97c36a4-6725-4277-bc6b-31bf78544e99" },
    update: {},
    create: {
      id: "d97c36a4-6725-4277-bc6b-31bf78544e99",
      name: "Web Development Team",
      companyId: company.id,
    },
  });
  console.log("✅ Team:", team.name);

  // ─── Password hash ─────────────────────────────────────────
  const password = await bcrypt.hash("Password1234!", 10);

  // ─── SUPER_ADMIN ───────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@devplus.co.th" },
    update: {},
    create: {
      email: "admin@devplus.co.th",
      passwordHash: password,
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      companyId: company.id,
    },
  });
  console.log("✅ SUPER_ADMIN:", admin.email);

  // ─── BD_TEAM ───────────────────────────────────────────────
  const bd = await prisma.user.upsert({
    where: { email: "bd@devplus.co.th" },
    update: {},
    create: {
      email: "bd@devplus.co.th",
      passwordHash: password,
      name: "BD Manager",
      role: UserRole.BD_TEAM,
      status: UserStatus.ACTIVE,
      companyId: company.id,
    },
  });
  console.log("✅ BD_TEAM:", bd.email);

  // ─── MENTOR ────────────────────────────────────────────────
  const mentor = await prisma.user.upsert({
    where: { email: "mentor@devplus.co.th" },
    update: {},
    create: {
      email: "mentor@devplus.co.th",
      passwordHash: password,
      name: "Kovit Srichai",
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
      companyId: company.id,
    },
  });
  console.log("✅ MENTOR:", mentor.email);

  // ─── STUDENT ───────────────────────────────────────────────
  const student = await prisma.user.upsert({
    where: { email: "student@devplus.co.th" },
    update: {},
    create: {
      email: "student@devplus.co.th",
      passwordHash: password,
      name: "Somchai Jaidee",
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      companyId: company.id,
      mentorId: mentor.id,
      teamId: team.id,
    },
  });
  console.log("✅ STUDENT:", student.email);

  // ─── Seed Attendances ──────────────────────────────────────
  console.log("🌱 Seeding Attendance records...");
  const baseDate = new Date("2026-06-01");
  for (let i = 0; i < 15; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + i);

    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;

    const checkInTime = new Date(currentDate);
    checkInTime.setHours(7, 45 + Math.floor(Math.random() * 30), 0); // between 7:45 and 8:15 AM

    const checkOutTime = new Date(currentDate);
    checkOutTime.setHours(17, Math.floor(Math.random() * 30), 0); // between 5:00 and 5:30 PM

    const status = checkInTime.getHours() > 8 || (checkInTime.getHours() === 8 && checkInTime.getMinutes() > 0)
      ? AttendanceStatus.LATE
      : AttendanceStatus.PRESENT;

    await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId: student.id,
          date: currentDate,
        },
      },
      update: {},
      create: {
        userId: student.id,
        date: currentDate,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        checkInIp: "192.168.1.100",
        checkOutIp: "192.168.1.100",
        checkInLocation: "Main Office",
        checkOutLocation: "Main Office",
        status,
      },
    });
  }
  console.log("✅ Seeding Attendance complete.");

  // ─── Seed Leave Requests ───────────────────────────────────
  console.log("🌱 Seeding Leave Requests...");
  await prisma.leaveRequest.create({
    data: {
      type: LeaveType.SICK,
      startDate: new Date("2026-06-18"),
      endDate: new Date("2026-06-19"),
      reason: "High fever and medical rest advice",
      status: LeaveStatus.APPROVED,
      submittedAt: new Date("2026-06-17T08:30:00Z"),
      reviewedAt: new Date("2026-06-17T10:00:00Z"),
      studentId: student.id,
      approvedById: mentor.id,
      approverNote: "Get well soon. Recover fully.",
    },
  });

  await prisma.leaveRequest.create({
    data: {
      type: LeaveType.CASUAL,
      startDate: new Date("2026-06-25"),
      endDate: new Date("2026-06-26"),
      reason: "Urgent family event back home",
      status: LeaveStatus.PENDING,
      submittedAt: new Date("2026-06-19T09:00:00Z"),
      studentId: student.id,
    },
  });
  console.log("✅ Seeding Leave Requests complete.");

  // ─── Seed Training Plans ──────────────────────────────────
  console.log("🌱 Seeding Training Plans...");
  const plan = await prisma.trainingPlan.create({
    data: {
      title: "DevPlus Internship Training Program",
      description: "Core curriculum for fullstack developers.",
      teamId: team.id,
      createdById: mentor.id,
    },
  });

  const module1 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: plan.id,
      title: "Introduction to HTML, CSS and Git Flow",
      description: "Understand structural semantic HTML, CSS styling tokens, flexbox/grid models, and standard Git branch conventions.",
      weekNumber: 1,
      dueDate: new Date("2026-06-05T23:59:59Z"),
    },
  });

  const module2 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: plan.id,
      title: "Next.js Core Concepts & Tailwinds Styling",
      description: "Learn Next.js routing structures, Page/Layout concepts, Client vs Server components, and state synchronization.",
      weekNumber: 2,
      dueDate: new Date("2026-06-12T23:59:59Z"),
    },
  });

  const module3 = await prisma.trainingPlanModule.create({
    data: {
      trainingPlanId: plan.id,
      title: "Backend NestJS APIs & Prisma Integration",
      description: "Build a structured backend using NestJS, configure routing prefixes, guard controllers with JWT, and read/write PostgreSQL data via Prisma.",
      weekNumber: 3,
      dueDate: new Date("2026-06-26T23:59:59Z"),
    },
  });

  // Seed Student Progress for Somchai
  await prisma.studentModuleProgress.create({
    data: {
      studentId: student.id,
      moduleId: module1.id,
      status: TrainingPlanStatus.COMPLETED,
      completedAt: new Date("2026-06-08T16:00:00Z"),
    },
  });

  await prisma.studentModuleProgress.create({
    data: {
      studentId: student.id,
      moduleId: module2.id,
      status: TrainingPlanStatus.COMPLETED,
      completedAt: new Date("2026-06-15T15:00:00Z"),
    },
  });

  await prisma.studentModuleProgress.create({
    data: {
      studentId: student.id,
      moduleId: module3.id,
      status: TrainingPlanStatus.ACTIVE,
    },
  });
  console.log("✅ Seeding Training Plans complete.");

  // ─── Seed Notifications ────────────────────────────────────
  console.log("🌱 Seeding Notifications...");
  await prisma.notification.create({
    data: {
      userId: student.id,
      title: "Leave Request Approved",
      message: "Your sick leave request for 18-19 Jun has been approved by your mentor.",
      type: NotificationType.SUCCESS,
      read: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: student.id,
      title: "New Training Plan Assigned",
      message: "Mentor Kovit assigned 'Backend NestJS APIs & Prisma Integration' plan for Week 3.",
      type: NotificationType.TRAINING,
      read: true,
      readAt: new Date("2026-06-19T09:15:00Z"),
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "New User Invited",
      message: "Invitation token generated for newmentor@acme.com.",
      type: NotificationType.INFO,
      read: false,
    },
  });
  console.log("✅ Seeding Notifications complete.");

  // ─── Seed Audit Logs ───────────────────────────────────────
  console.log("🌱 Seeding Audit Logs...");
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityName: "Company",
      entityId: company.id,
      newValues: { name: company.name, domain: company.domain, status: company.status },
      ipAddress: "127.0.0.1",
      actorId: admin.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityName: "User",
      entityId: mentor.id,
      newValues: { name: mentor.name, email: mentor.email, role: mentor.role },
      ipAddress: "192.168.1.15",
      actorId: admin.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.LOGIN,
      entityName: "Session",
      entityId: admin.id,
      newValues: { email: admin.email, role: admin.role },
      ipAddress: "192.168.1.15",
      actorId: admin.id,
    },
  });
  console.log("✅ Seeding Audit Logs complete.");

  console.log("\n🎉 Seed complete!\n");
  console.log("─────────────────────────────────────────");
  console.log("Test accounts (password: Password1234!)");
  console.log("─────────────────────────────────────────");
  console.log("SUPER_ADMIN  → admin@devplus.co.th");
  console.log("BD_TEAM      → bd@devplus.co.th");
  console.log("MENTOR       → mentor@devplus.co.th");
  console.log("STUDENT      → student@devplus.co.th");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
