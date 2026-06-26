import { Controller, Post, Body, UseGuards, Get, Query, BadRequestException } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'database';

@Controller('invitations')
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  async create(
    @Body() createInvitationDto: CreateInvitationDto,
    @GetUser('id') userId: string,
  ) {
    return this.invitationsService.createInvitation(createInvitationDto, userId);
  }

  @Get('verify')
  async verify(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.invitationsService.verifyInvitation(token);
  }

  @Get('link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  async getLink(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.invitationsService.getPendingTokenByEmail(email);
  }

  @Post('accept')
  async accept(@Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(acceptInvitationDto);
  }
}
