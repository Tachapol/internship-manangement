import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Company, Prisma } from 'database';

@Injectable()
export class CompaniesRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  async update(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { id },
    });
  }

  async findByDomain(domain: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { domain },
    });
  }

  async findAndCount(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CompanyWhereInput;
    orderBy?: Prisma.CompanyOrderByWithRelationInput;
  }): Promise<{ items: Company[]; total: number }> {
    const { skip, take, where, orderBy } = params;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        skip,
        take,
        where,
        orderBy,
      }),
      this.prisma.company.count({ where }),
    ]);
    return { items, total };
  }
}
