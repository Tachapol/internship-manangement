import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from 'database';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async createTeam(dto: CreateTeamDto): Promise<Team> {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.team.create({
      data: {
        name: dto.name,
        companyId: dto.companyId,
      },
    });
  }

  async updateTeam(id: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.prisma.team.update({
      where: { id },
      data: {
        name: dto.name,
      },
    });
  }

  async deleteTeam(id: string): Promise<{ success: boolean }> {
    const team = await this.prisma.team.findUnique({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Soft delete team by setting deletedAt
    await this.prisma.team.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Also unassign team members
    await this.prisma.user.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    return { success: true };
  }

  async getTeamDetails(id: string): Promise<Team> {
    const team = await this.prisma.team.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: {
          select: { id: true, name: true },
        },
        users: {
          where: { deletedAt: null },
          select: { id: true, name: true, email: true, role: true, status: true },
        },
        trainingPlans: {
          where: { deletedAt: null },
          select: { id: true, title: true, description: true },
        },
      },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async getTeamsList(filters: {
    companyId?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const where: any = {
      deletedAt: null,
    };

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true },
          },
          _count: {
            select: { users: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.team.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
