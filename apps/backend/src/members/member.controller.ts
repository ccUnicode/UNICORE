import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ActivityState } from './entities/members.entity';
import { AvailabilityState } from './entities/members.entity';

@Controller('members')
export class MemberController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Get()
  findAll() {
    return this.membersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Patch(':id/status')
  updateActivity(@Param('id') id: number, @Body('status') status: ActivityState) {
    return this.membersService.updateActivityStatus(id, status);
  }

  @Patch(':id/disponibility')
  updateDisponibility(@Param('id') id: number, @Body('status') status: AvailabilityState) {
    return this.membersService.updateDisponibilityStatus(id, status);
  }
}
