import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
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

  @Post('search')
  @HttpCode(200)
  search(@Body() filterDto: GetMembersFilterDto): Promise<Member[]> {
    return this.membersService.findAll(filterDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMemberDto: any,
  ): Promise<Member> {
    return this.membersService.update(id, updateMemberDto);
  }
}
