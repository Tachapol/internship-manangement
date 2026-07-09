import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'database';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // POST /events — Create a new event (Staff only)
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  async create(
    @GetUser() creator: { id: string; role: UserRole; companyId?: string },
    @Body()
    body: {
      name: string;
      dateTime: string;
      location: string;
      description: string;
      audienceType: 'ALL' | 'COMPANY';
      companyId?: string;
    },
  ) {
    return this.eventsService.createEvent(creator, body);
  }

  // GET /events — List events visible to user
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  async findAll(
    @GetUser() user: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.eventsService.listEvents(user);
  }

  // GET /events/:id — Get details of a specific event
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.eventsService.getEvent(id, user);
  }

  // PATCH /events/:id — Edit a specific event
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() editor: { id: string; role: UserRole; companyId?: string },
    @Body()
    body: {
      name?: string;
      dateTime?: string;
      location?: string;
      description?: string;
      audienceType?: 'ALL' | 'COMPANY';
      companyId?: string;
    },
  ) {
    return this.eventsService.updateEvent(id, editor, body);
  }
}
