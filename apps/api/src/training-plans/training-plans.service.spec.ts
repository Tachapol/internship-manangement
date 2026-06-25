import { Test, TestingModule } from '@nestjs/testing';
import { TrainingPlansService } from './training-plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole, TrainingPlanStatus } from 'database';

describe('TrainingPlansService', () => {
  let service: TrainingPlansService;
  let prisma: jest.Mocked<PrismaService>;
  let storage: jest.Mocked<StorageService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
      },
      trainingPlan: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const mockStorage = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingPlansService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<TrainingPlansService>(TrainingPlansService);
    prisma = module.get(PrismaService) as any;
    storage = module.get(StorageService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPlan', () => {
    it('should create plan successfully', async () => {
      const dto = {
        studentId: 'student-uuid',
        title: 'Week 1: Foundations',
        weekNumber: 1,
        externalLink: 'https://link.com',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'student-uuid', role: UserRole.STUDENT });
      (prisma.trainingPlan.create as jest.Mock).mockResolvedValue({ id: 'plan-uuid', ...dto });

      const result = await service.createPlan(dto, 'mentor-uuid');

      expect(result).toBeDefined();
      expect(prisma.user.findUnique).toHaveBeenCalled();
      expect(prisma.trainingPlan.create).toHaveBeenCalled();
    });

    it('should upload PDF if file is provided', async () => {
      const dto = {
        studentId: 'student-uuid',
        title: 'Week 1: Foundations',
        weekNumber: 1,
      };

      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('hello'),
        mimetype: 'application/pdf',
      } as any;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'student-uuid', role: UserRole.STUDENT });
      storage.uploadFile.mockResolvedValue('https://supabase.url/test.pdf');
      (prisma.trainingPlan.create as jest.Mock).mockResolvedValue({ id: 'plan-uuid', ...dto, fileUrl: 'https://supabase.url/test.pdf' });

      const result = await service.createPlan(dto, 'mentor-uuid', mockFile);

      expect(result.fileUrl).toBe('https://supabase.url/test.pdf');
      expect(storage.uploadFile).toHaveBeenCalledWith(mockFile, 'training-plans');
    });

    it('should throw NotFoundException if student does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createPlan({ studentId: 'invalid', title: 'Week 1', weekNumber: 1 }, 'mentor-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProgress', () => {
    it('should update progress successfully', async () => {
      (prisma.trainingPlan.findUnique as jest.Mock).mockResolvedValue({ id: 'plan-uuid', status: TrainingPlanStatus.ACTIVE });
      (prisma.trainingPlan.update as jest.Mock).mockResolvedValue({ id: 'plan-uuid', status: TrainingPlanStatus.COMPLETED });

      const result = await service.updateProgress('plan-uuid', TrainingPlanStatus.COMPLETED);

      expect(result.status).toBe(TrainingPlanStatus.COMPLETED);
    });
  });

  describe('getPlanDetails', () => {
    it('should throw ForbiddenException if student tries to view another students plan', async () => {
      (prisma.trainingPlan.findUnique as jest.Mock).mockResolvedValue({ id: 'plan-uuid', studentId: 'student-a' });

      await expect(
        service.getPlanDetails('plan-uuid', { id: 'student-b', role: UserRole.STUDENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow mentor to view student plan', async () => {
      (prisma.trainingPlan.findUnique as jest.Mock).mockResolvedValue({ id: 'plan-uuid', studentId: 'student-a' });

      const result = await service.getPlanDetails('plan-uuid', { id: 'mentor-uuid', role: UserRole.MENTOR });

      expect(result).toBeDefined();
    });
  });
});
