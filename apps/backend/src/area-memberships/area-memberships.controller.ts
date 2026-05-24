import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AreaMembershipsService } from './area-memberships.service';
import { CreateAreaMembershipDto } from './dto/create-area-membership.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

// TODO: Add auth guard (tracked in #18)
@Controller('area-memberships')
export class AreaMembershipsController {
  constructor(private readonly areaMembershipsService: AreaMembershipsService) {}

  @Post()
  create(@Body() createAreaMembershipDto: CreateAreaMembershipDto) {
    return this.areaMembershipsService.create(createAreaMembershipDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.areaMembershipsService.findAll(paginationDto);
  }
}
