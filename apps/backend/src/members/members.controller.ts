import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentAccessActor } from '../common/decorators/current-access-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ConfirmNameDto } from '../common/dto/confirm-name.dto';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersFilterDto } from './dto/get-members-filter.dto';
import type { MemberResponse } from './dto/member-response.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';
import { toMemberResponse } from './utils/member-response.util';

@ApiBearerAuth('bearer')
@Controller('members')
@UseGuards(RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA)
  async create(
    @Body() createMemberDto: CreateMemberDto,
    @CurrentAccessActor() accessActor?: RequestAccessActor,
  ): Promise<MemberResponse> {
    const member = await this.membersService.create(
      createMemberDto,
      undefined,
      accessActor,
    );
    return toMemberResponse(member, AreaRole.PRESIDENCIA);
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMemberDto: UpdateMemberDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ): Promise<MemberResponse> {
    const member = await this.membersService.update(
      id,
      updateMemberDto,
      undefined,
      accessActor,
    );
    return toMemberResponse(member, AreaRole.PRESIDENCIA);
  }

  @Patch(':id/deactivate')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Body() confirmNameDto: ConfirmNameDto,
    @CurrentAccessActor() accessActor: RequestAccessActor,
  ): Promise<MemberResponse> {
    const member = await this.membersService.deactivate(
      id,
      confirmNameDto.confirmName,
      accessActor,
    );
    return toMemberResponse(member, accessActor.role);
  }
}
