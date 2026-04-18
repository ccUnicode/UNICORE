import { Controller, Get, Post, Body } from '@nestjs/common';
import { AreaMembershipsService } from './area-memberships.service';
import { CreateAreaMembershipDto } from './dto/create-area-membership.dto';

@Controller('area-memberships')
export class AreaMembershipsController {
  constructor(private readonly areaMembershipsService: AreaMembershipsService) {}

  @Post()
  create(@Body() createAreaMembershipDto: CreateAreaMembershipDto) {
    return this.areaMembershipsService.create(createAreaMembershipDto);
  }

  @Get()
  findAll() {
    return this.areaMembershipsService.findAll();
  }
}
