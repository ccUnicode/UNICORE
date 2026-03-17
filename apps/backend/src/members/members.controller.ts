import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
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
  findAll(): Promise<Member[]> {
    return this.membersService.findAll();
  }
}
