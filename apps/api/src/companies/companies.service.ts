import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CompaniesRepository } from './companies.repository';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { GetCompaniesFilterDto } from './dto/get-companies-filter.dto';
import { Company, CompanyStatus, Prisma } from 'database';

@Injectable()
export class CompaniesService {
  constructor(private readonly companiesRepository: CompaniesRepository) {}

  async createCompany(dto: CreateCompanyDto): Promise<Company> {
    if (dto.domain) {
      const existing = await this.companiesRepository.findByDomain(dto.domain);
      if (existing) {
        throw new ConflictException('Company with this email domain already exists');
      }
    }

    return this.companiesRepository.create({
      name: dto.name,
      logoUrl: dto.logoUrl,
      description: dto.description,
      domain: dto.domain,
      status: dto.status,
    });
  }

  async updateCompany(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.companiesRepository.findById(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (dto.domain && dto.domain !== company.domain) {
      const existing = await this.companiesRepository.findByDomain(dto.domain);
      if (existing) {
        throw new ConflictException('Company with this email domain already exists');
      }
    }

    return this.companiesRepository.update(id, {
      name: dto.name,
      logoUrl: dto.logoUrl,
      description: dto.description,
      domain: dto.domain,
      status: dto.status,
    });
  }

  async updateStatus(id: string, status: CompanyStatus): Promise<Company> {
    const company = await this.companiesRepository.findById(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.companiesRepository.update(id, { status });
  }

  async getCompanyDetails(id: string): Promise<Company> {
    const company = await this.companiesRepository.findById(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async getCompaniesList(filter: GetCompaniesFilterDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CompanyWhereInput = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.status) {
      where.status = filter.status;
    }

    const { items, total } = await this.companiesRepository.findAndCount({
      skip,
      take: limit,
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
