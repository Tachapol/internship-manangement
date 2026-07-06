import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole, NotificationType } from 'database';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @GetUser('id') userId: string,
    @Query('read') readStr?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const read = readStr === 'true' ? true : readStr === 'false' ? false : undefined;
    const filters = {
      read,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.notificationsService.getNotifications(userId, filters);
  }

  @Patch('read-all')
  async readAll(@GetUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Post('broadcast')
  @Roles(UserRole.SUPER_ADMIN)
  async broadcast(
    @Body() body: { title: string; message: string; type?: NotificationType },
  ) {
    return this.notificationsService.broadcast(
      body.title,
      body.message,
      body.type || NotificationType.INFO,
    );
  }
}
