import {
  Body,
  Controller,
  Get,
  Ip,
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
import type { MemberResponse } from '../members/dto/member-response.dto';
import { toMemberResponse } from '../members/utils/member-response.util';
import { AuthResponse, AuthService } from './auth.service';
import { CurrentMember } from './current-member.decorator';
import { BootstrapAuthDto } from './dto/bootstrap-auth.dto';
import { LoginDto } from './dto/login.dto';
import { LoginRateLimitService } from './login-rate-limit.service';
import { SetPasswordDto } from './dto/set-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginRateLimit: LoginRateLimitService,
  ) {}

  @Public()
  @Post('bootstrap')
  bootstrap(@Body() bootstrapDto: BootstrapAuthDto): Promise<AuthResponse> {
    return this.authService.bootstrap(bootstrapDto);
  }

  @Public()
  @Post('login')
  async login(
    @Ip() clientIp: string,
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponse> {
    const attempt = this.loginRateLimit.beginAttempt(
      clientIp,
      loginDto.studentCode,
    );

    try {
      return await this.authService.login(loginDto);
    } finally {
      attempt.release();
    }
  }

  @Get('me')
  me(@CurrentMember() member: Member): MemberResponse {
    return toMemberResponse(member, member.role);
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
