import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { AccessControlledRequest } from '../common/interfaces/access-controlled-request.interface';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { Member } from '../members/member.entity';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: AuthTokenService,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AccessControlledRequest>();
    const payload = this.tokenService.verify(this.extractBearerToken(request));
    const member = await this.membersRepository.findOne({
      where: { id: payload.sub },
      relations: { projectMemberships: true },
    });

    if (!member || member.activityStatus !== MemberActivityStatus.ACTIVE) {
      throw new UnauthorizedException('Authenticated member is not active');
    }

    if (payload.ver !== (member.sessionVersion ?? 0)) {
      throw new UnauthorizedException('Authentication token has been revoked');
    }

    if (member.role === AreaRole.DIRECTIVA_DE_AREA && !member.areaId) {
      throw new UnauthorizedException(
        'Authenticated member has no assigned area',
      );
    }

    request.accessActor = {
      role: member.role,
      memberId: String(member.id),
      areaId: member.areaId ? String(member.areaId) : undefined,
      projectIds:
        member.role === AreaRole.MIEMBRO
          ? (member.projectMemberships ?? []).map(({ projectId }) =>
              String(projectId),
            )
          : undefined,
    };
    request.authenticatedMember = member;

    return true;
  }

  private extractBearerToken(request: AccessControlledRequest): string {
    const authorization = request.headers.authorization;

    if (typeof authorization !== 'string') {
      throw new UnauthorizedException('Missing Bearer authentication token');
    }

    const [scheme, token, extra] = authorization.trim().split(/\s+/);

    if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    return token;
  }
}
