import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AreaMembershipsService } from './area-memberships.service';
import { CreateAreaMembershipDto } from './dto/create-area-membership.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AreaMembership } from './entities/area-membership.entity';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

// TODO: Add auth guard (tracked in #18)
@Controller('area-memberships')
export class AreaMembershipsController {
  constructor(private readonly areaMembershipsService: AreaMembershipsService) {}

  @Post()
  create(
    @Body() createAreaMembershipDto: CreateAreaMembershipDto,
  ): Promise<AreaMembership> {
    return this.areaMembershipsService.create(createAreaMembershipDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<AreaMembership>> {
    return this.areaMembershipsService.findAll(paginationDto);
  }
}
