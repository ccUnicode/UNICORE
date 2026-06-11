import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersFilterDto } from './dto/get-members-filter.dto';
import { Member } from './member.entity';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  create(@Body() createMemberDto: CreateMemberDto): Promise<Member> {
    return this.membersService.create(createMemberDto);
  }

  @Get()
  findAll(@Query() filterDto: GetMembersFilterDto): Promise<Member[]> {
    return this.membersService.findAll(filterDto);
  }
}
