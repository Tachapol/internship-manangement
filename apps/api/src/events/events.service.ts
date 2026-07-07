import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole, NotificationType } from 'database';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createEvent(
    creator: { id: string; role: UserRole; companyId?: string },
    data: {
      name: string;
      dateTime: string;
      location: string;
      description: string;
      audienceType: 'ALL' | 'COMPANY';
      companyId?: string;
    },
  ) {
    // 1. Authorization check
    if (creator.role !== UserRole.SUPER_ADMIN && creator.role !== UserRole.BD_TEAM) {
      throw new ForbiddenException('Only staff can create events');
    }

    // 2. Validation
    if (!data.name?.trim()) throw new BadRequestException('Event name is required');
    if (!data.dateTime) throw new BadRequestException('Event date and time is required');
    if (!data.location?.trim()) throw new BadRequestException('Event location is required');
    if (!data.description?.trim()) throw new BadRequestException('Event description is required');

    const eventDate = new Date(data.dateTime);
    if (isNaN(eventDate.getTime())) {
      throw new BadRequestException('Invalid date and time format');
    }

    // 3. For BD_TEAM / MENTOR: restrict target audience to their own company if they belong to one
    let targetCompanyId = data.companyId || null;
    if (creator.role !== UserRole.SUPER_ADMIN && creator.companyId) {
      if (data.audienceType === 'COMPANY') {
        targetCompanyId = creator.companyId;
      }
    }

    // 4. Save to Database
    const event = await this.prisma.event.create({
      data: {
        name: data.name.trim(),
        dateTime: eventDate,
        location: data.location.trim(),
        description: data.description.trim(),
        audienceType: data.audienceType,
        companyId: data.audienceType === 'COMPANY' ? targetCompanyId : null,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    // 5. Query students in target audience to notify
    const studentWhere: any = {
      role: UserRole.STUDENT,
      deletedAt: null,
      status: 'ACTIVE',
    };

    if (event.audienceType === 'COMPANY' && event.companyId) {
      studentWhere.companyId = event.companyId;
    }

    const studentsToNotify = await this.prisma.user.findMany({
      where: studentWhere,
      select: { id: true },
    });

    // 6. Send notifications in background (don't block the request)
    const notificationTitle = `📅 New Event: ${event.name}`;
    const notificationMessage = `You are invited to: ${event.name} at ${event.location} on ${eventDate.toLocaleDateString('en-GB')} ${eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`;

    Promise.all(
      studentsToNotify.map((s) =>
        this.notificationsService.createNotification(
          s.id,
          notificationTitle,
          notificationMessage,
          NotificationType.INFO,
          { eventId: event.id },
        ).catch((err) => console.error(`Failed to send event notification to student ${s.id}:`, err)),
      ),
    ).catch(console.error);

    return event;
  }

  async listEvents(user: { id: string; role: UserRole; companyId?: string }) {
    const where: any = {
      deletedAt: null,
    };

    // Students only see events targeted at them
    if (user.role === UserRole.STUDENT) {
      where.OR = [
        { audienceType: 'ALL' },
        {
          AND: [
            { audienceType: 'COMPANY' },
            { companyId: user.companyId || '' },
          ],
        },
      ];
    } else if (user.role === UserRole.BD_TEAM && user.companyId) {
      // BD Team sees all events, but filter out events of other companies if BD Team has a specific company
      where.OR = [
        { audienceType: 'ALL' },
        { companyId: user.companyId },
      ];
    } else if (user.role === UserRole.MENTOR && user.companyId) {
      // Mentor sees all events, but filter out events of other companies if Mentor has a specific company
      where.OR = [
        { audienceType: 'ALL' },
        { companyId: user.companyId },
      ];
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { dateTime: 'asc' },
      include: {
        company: { select: { id: true, name: true } },
      },
    });
  }

  async getEvent(id: string, user: { id: string; role: UserRole; companyId?: string }) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    if (!event || event.deletedAt) {
      throw new NotFoundException('Event not found');
    }

    // Authorization check for Student
    if (user.role === UserRole.STUDENT) {
      const isTargeted =
        event.audienceType === 'ALL' ||
        (event.audienceType === 'COMPANY' && event.companyId === user.companyId);
      if (!isTargeted) {
        throw new ForbiddenException('You are not authorized to view this event');
      }
    }

    // Determine participating students if user is Staff
    let participants: any[] = [];
    const isStaff = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.BD_TEAM || user.role === UserRole.MENTOR;
    
    if (isStaff) {
      const studentWhere: any = {
        role: UserRole.STUDENT,
        deletedAt: null,
      };

      if (event.audienceType === 'COMPANY' && event.companyId) {
        studentWhere.companyId = event.companyId;
      }

      participants = await this.prisma.user.findMany({
        where: studentWhere,
        select: {
          id: true,
          name: true,
          email: true,
          company: { select: { name: true } },
          team: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      });
    }

    return {
      ...event,
      participants,
    };
  }

  async updateEvent(
    id: string,
    editor: { id: string; role: UserRole; companyId?: string },
    data: {
      name?: string;
      dateTime?: string;
      location?: string;
      description?: string;
      audienceType?: 'ALL' | 'COMPANY';
      companyId?: string;
    },
  ) {
    // 1. Authorization check
    if (editor.role !== UserRole.SUPER_ADMIN && editor.role !== UserRole.BD_TEAM && editor.role !== UserRole.MENTOR) {
      throw new ForbiddenException('Only staff can edit events');
    }

    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event || event.deletedAt) {
      throw new NotFoundException('Event not found');
    }

    // 2. Validate update data
    const updateData: any = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new BadRequestException('Event name cannot be empty');
      updateData.name = data.name.trim();
    }
    if (data.dateTime !== undefined) {
      if (!data.dateTime) throw new BadRequestException('Event date and time is required');
      const eventDate = new Date(data.dateTime);
      if (isNaN(eventDate.getTime())) throw new BadRequestException('Invalid date format');
      updateData.dateTime = eventDate;
    }
    if (data.location !== undefined) {
      if (!data.location.trim()) throw new BadRequestException('Event location cannot be empty');
      updateData.location = data.location.trim();
    }
    if (data.description !== undefined) {
      if (!data.description.trim()) throw new BadRequestException('Event description cannot be empty');
      updateData.description = data.description.trim();
    }
    if (data.audienceType !== undefined) {
      updateData.audienceType = data.audienceType;
      if (data.audienceType === 'COMPANY') {
        let targetCompanyId = data.companyId || null;
        if (editor.role !== UserRole.SUPER_ADMIN && editor.companyId) {
          targetCompanyId = editor.companyId;
        }
        updateData.companyId = targetCompanyId;
      } else {
        updateData.companyId = null;
      }
    }

    // 3. Update in Database
    return this.prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
      },
    });
  }
}
