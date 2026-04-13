import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentAccessActor } from '../common/decorators/current-access-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member } from './member.entity';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA)
  create(@Body() createMemberDto: CreateMemberDto): Promise<Member> {
    return this.membersService.create(createMemberDto);
  }

  @Get()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  findAll(
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ): Promise<Member[]> {
    return this.membersService.findAccessible(accessActor);
  }
}
