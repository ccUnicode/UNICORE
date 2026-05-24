import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AccessScope } from '../common/decorators/access-scope.decorator';
import { CurrentAccessActor } from '../common/decorators/current-access-actor.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestAccessActor } from '../common/interfaces/request-access-actor.interface';
import { AreaService } from './area.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Controller('areas')
@UseGuards(RolesGuard)
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @Roles(AreaRole.PRESIDENCIA)
  create(@Body() createAreaDto: CreateAreaDto) {
    return this.areaService.create(createAreaDto);
  }

  @Get()
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  findAll(@CurrentAccessActor() accessActor: RequestAccessActor) {
    return this.areaService.findAccessible(accessActor);
  }

  // Route-id access is enforced by AccessScope + RolesGuard; list filtering
  // stays in findAccessible so controllers keep one authorization convention.
  @Get(':id')
  @Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)
  @AccessScope({ areaIdParam: 'id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.areaService.findOne(id);
  }

  @Patch(':id')
  @Roles(AreaRole.PRESIDENCIA)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAreaDto: UpdateAreaDto,
  ) {
    return this.areaService.update(id, updateAreaDto);
  }

  @Patch(':id/archive')
  @Roles(AreaRole.PRESIDENCIA)
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.areaService.archive(id);
  }
}
