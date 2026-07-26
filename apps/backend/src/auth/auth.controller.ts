import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { Member } from '../members/member.entity';
import { AuthResponse, AuthService } from './auth.service';
import { CurrentMember } from './current-member.decorator';
import { BootstrapAuthDto } from './dto/bootstrap-auth.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('bootstrap')
  bootstrap(@Body() bootstrapDto: BootstrapAuthDto): Promise<AuthResponse> {
    return this.authService.bootstrap(bootstrapDto);
  }

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  me(@CurrentMember() member: Member): Member {
    return member;
  }

  @Put('members/:memberId/password')
  @UseGuards(RolesGuard)
  @Roles(AreaRole.PRESIDENCIA)
  async setMemberPassword(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<void> {
    await this.authService.setPassword(memberId, setPasswordDto.password);
  }
}
