import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SupportTicketStatus,
  SupportTicketPriority,
  UserRole,
} from 'database';

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.BD_TEAM,
  UserRole.MENTOR,
] as const;

function isStaffRole(role: UserRole): boolean {
  return (STAFF_ROLES as readonly UserRole[]).includes(role);
}

@Injectable()
export class SupportTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Ticket ──────────────────────────────────────────
  async createTicket(
    authorId: string,
    data: {
      subject: string;
      description: string;
      category?: string;
      priority?: SupportTicketPriority;
    },
  ) {
    return this.prisma.supportTicket.create({
      data: {
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority ?? SupportTicketPriority.MEDIUM,
        authorId,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  // ─── List Tickets ────────────────────────────────────────────
  async getTickets(
    user: { id: string; role: UserRole },
    filters: {
      status?: SupportTicketStatus;
      category?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const isStaff = isStaffRole(user.role);

    const where: any = { deletedAt: null };

    // Students only see their own tickets
    if (!isStaff) {
      where.authorId = user.id;
    }

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;

    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
          assignedTo: { select: { id: true, name: true, role: true } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ─── Get Single Ticket ────────────────────────────────────────
  async getTicket(id: string, user: { id: string; role: UserRole }) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Support ticket not found');
    }

    const isStaff = isStaffRole(user.role);

    if (!isStaff && ticket.authorId !== user.id) {
      throw new ForbiddenException('You are not authorized to view this ticket');
    }

    return ticket;
  }

  // ─── Add Reply ────────────────────────────────────────────────
  async addReply(
    ticketId: string,
    user: { id: string; role: UserRole },
    message: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Support ticket not found');
    }

    const isStaff = isStaffRole(user.role);

    if (!isStaff && ticket.authorId !== user.id) {
      throw new ForbiddenException('You are not authorized to reply to this ticket');
    }

    // If a staff member replies and ticket is OPEN, auto-move to IN_REVIEW
    if (isStaff && ticket.status === SupportTicketStatus.OPEN) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: SupportTicketStatus.IN_REVIEW },
      });
    }

    return this.prisma.supportTicketReply.create({
      data: {
        message,
        isStaff,
        ticketId,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }

  // ─── Update Status ────────────────────────────────────────────
  async updateStatus(
    id: string,
    user: { id: string; role: UserRole },
    status: SupportTicketStatus,
  ) {
    const isStaff = isStaffRole(user.role);

    if (!isStaff) {
      throw new ForbiddenException('Only staff can update ticket status');
    }

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Support ticket not found');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status,
        resolvedAt:
          status === SupportTicketStatus.RESOLVED ? new Date() : ticket.resolvedAt,
      },
    });
  }

  // ─── Assign Ticket ────────────────────────────────────────────
  async assignTicket(
    id: string,
    user: { id: string; role: UserRole },
    assignedToId?: string,
  ) {
    const isStaff = isStaffRole(user.role);

    if (!isStaff) {
      throw new ForbiddenException('Only staff can assign tickets');
    }

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.deletedAt) {
      throw new NotFoundException('Support ticket not found');
    }

    const targetAssigneeId = assignedToId || user.id;

    return this.prisma.supportTicket.update({
      where: { id },
      data: { assignedToId: targetAssigneeId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
