import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAccessActor } from '../common/decorators/current-access-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ConfirmDeletionDto } from '../common/dto/confirm-deletion.dto';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersFilterDto } from './dto/get-members-filter.dto';
import { MemberResponse } from './dto/member-response.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
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
    @Query() filterDto: GetMembersFilterDto,
  ): Promise<MemberResponse[]> {
    return this.membersService.findAccessible(accessActor, filterDto);
  }

  @Patch(':id')
  @Roles(AreaRole.PRESIDENCIA)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMemberDto: UpdateMemberDto,
  ): Promise<Member> {
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() confirmDeletionDto: ConfirmDeletionDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ): Promise<Member> {
    return this.membersService.remove(
      id,
      confirmDeletionDto.confirmName,
      accessActor,
    );
  }
}
