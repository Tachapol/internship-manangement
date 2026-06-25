import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { CompaniesRepository } from './companies.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CompanyStatus } from 'database';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let repository: jest.Mocked<CompaniesRepository>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByDomain: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: CompaniesRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    repository = module.get(CompaniesRepository) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCompany', () => {
    it('should create a company successfully', async () => {
      const dto = {
        name: 'Acme Corp',
        domain: 'acme.com',
        description: 'Mock company',
        logoUrl: 'logo.png',
        status: CompanyStatus.ACTIVE,
      };

      repository.findByDomain.mockResolvedValue(null);
      repository.create.mockResolvedValue({ id: 'uuid', ...dto, createdAt: new Date(), updatedAt: new Date() });

      const result = await service.createCompany(dto);

      expect(result).toBeDefined();
      expect(result.id).toBe('uuid');
      expect(repository.findByDomain).toHaveBeenCalledWith('acme.com');
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if domain already exists', async () => {
      repository.findByDomain.mockResolvedValue({ id: 'existing-uuid' } as any);

      await expect(
        service.createCompany({ name: 'Duplicate', domain: 'acme.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCompany', () => {
    it('should update a company successfully', async () => {
      const existingCompany = {
        id: 'uuid',
        name: 'Old Name',
        domain: 'old.com',
        description: 'desc',
        logoUrl: 'logo.png',
        status: CompanyStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findById.mockResolvedValue(existingCompany);
      repository.findByDomain.mockResolvedValue(null);
      repository.update.mockResolvedValue({ ...existingCompany, name: 'New Name' });

      const result = await service.updateCompany('uuid', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if company not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateCompany('uuid', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update company status successfully', async () => {
      const company = {
        id: 'uuid',
        name: 'Acme',
        domain: 'acme.com',
        description: 'desc',
        logoUrl: 'logo.png',
        status: CompanyStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findById.mockResolvedValue(company);
      repository.update.mockResolvedValue({ ...company, status: CompanyStatus.INACTIVE });

      const result = await service.updateStatus('uuid', CompanyStatus.INACTIVE);

      expect(result.status).toBe(CompanyStatus.INACTIVE);
    });
  });
});
