import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { AreaMembershipService } from './area-membership.service';
import { AssignMembershipDto } from './dto/assign-membership.dto';

@Controller('area-memberships')
export class AreaMembershipController {
  constructor(private readonly service: AreaMembershipService) {}

  @Post()
  assign(@Body() dto: AssignMembershipDto) {
    return this.service.assign(dto.userId, dto.areaId, dto.role);
  }

  @Get('area/:areaId')
  findByArea(@Param('areaId', ParseUUIDPipe) areaId: string) {
    return this.service.findByArea(areaId);
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.service.findByUser(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.revoke(id);
  }
}
