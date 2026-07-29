import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AreaMembershipsService } from './area-memberships.service';
import { CreateAreaMembershipDto } from './dto/create-area-membership.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AreaMembership } from './entities/area-membership.entity';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('area-memberships')
@UseGuards(RolesGuard)
export class AreaMembershipsController {
  constructor(
    private readonly areaMembershipsService: AreaMembershipsService,
  ) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA)
  create(
    @Body() createAreaMembershipDto: CreateAreaMembershipDto,
  ): Promise<AreaMembership> {
    return this.areaMembershipsService.create(createAreaMembershipDto);
  }

  @Get()
  @Roles(AreaRole.PRESIDENCIA)
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<AreaMembership>> {
    return this.areaMembershipsService.findAll(paginationDto);
  }
}
