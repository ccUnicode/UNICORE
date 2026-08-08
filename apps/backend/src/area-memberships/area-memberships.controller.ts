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
import { ApiBearerAuth } from '@nestjs/swagger';
import { AreaMembershipsService } from './area-memberships.service';
import { CreateAreaMembershipDto } from './dto/create-area-membership.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AreaMembership } from './entities/area-membership.entity';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateAreaMembershipDto } from './dto/update-area-membership.dto';

@ApiBearerAuth('bearer')
@Controller('area-memberships')
@UseGuards(RolesGuard)
export class AreaMembershipsController {
  constructor(
    private readonly areaMembershipsService: AreaMembershipsService,
  ) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA)
  create(
    @Body() createAreaMembershipDto: CreateAreaMembershipDto,
  ): Promise<AreaMembership> {
    return this.areaMembershipsService.create(createAreaMembershipDto);
  }

  @Patch(':id')
  @Roles(AreaRole.PRESIDENCIA)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAreaMembershipDto: UpdateAreaMembershipDto,
  ): Promise<AreaMembership> {
    return this.areaMembershipsService.update(id, updateAreaMembershipDto);
  }

  @Delete(':id')
  @Roles(AreaRole.PRESIDENCIA)
  remove(@Param('id', ParseIntPipe) id: number): Promise<AreaMembership> {
    return this.areaMembershipsService.remove(id);
  }

  @Get()
  @Roles(AreaRole.PRESIDENCIA)
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<AreaMembership>> {
    return this.areaMembershipsService.findAll(paginationDto);
  }
}
