import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AreaRole } from '../common/enums/area-role.enum';
import { AccessControlledRequest } from '../common/interfaces/access-controlled-request.interface';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
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
      relations: { projectMemberships: true, memberships: true },
    });

    if (!member) {
      throw new UnauthorizedException('Authenticated member is disabled');
    }

    if (payload.ver !== (member.sessionVersion ?? 0)) {
      throw new UnauthorizedException('Authentication token has been revoked');
    }

    const isDisabled =
      member.availabilityStatus === MemberAvailabilityStatus.DISABLED;
    const disabledSnapshot = member.disabledAccessSnapshot;
    if (isDisabled && (!member.disabledAt || !disabledSnapshot)) {
      throw new UnauthorizedException(
        'Disabled member access snapshot is unavailable',
      );
    }
    if (isDisabled && (request.method ?? 'GET') !== 'GET') {
      throw new ForbiddenException(
        'DISABLED_READ_ONLY: Disabled members cannot modify resources',
      );
    }

    const effectiveRole = isDisabled
      ? (disabledSnapshot as NonNullable<typeof disabledSnapshot>).role
      : member.role;
    const effectiveAreaId = isDisabled
      ? (disabledSnapshot as NonNullable<typeof disabledSnapshot>).areaId
      : member.areaId;
    const effectiveProjectIds = isDisabled
      ? (disabledSnapshot as NonNullable<typeof disabledSnapshot>).projectIds
      : (member.projectMemberships ?? []).map(({ projectId }) => projectId);

    if (effectiveRole === AreaRole.DIRECTIVA_DE_AREA && !effectiveAreaId) {
      throw new UnauthorizedException(
        'Authenticated member has no assigned area',
      );
    }

    request.accessActor = {
      role: effectiveRole,
      memberId: String(member.id),
      areaId: effectiveAreaId ? String(effectiveAreaId) : undefined,
      member:
        member.firstNames && member.lastNames
          ? {
              firstNames: member.firstNames,
              lastNames: member.lastNames,
            }
          : undefined,
      projectIds:
        effectiveRole === AreaRole.MIEMBRO
          ? effectiveProjectIds.map((projectId) => String(projectId))
          : undefined,
      ...(isDisabled && {
        status: member.availabilityStatus,
        readOnly: true,
        snapshotAt: member.disabledAt as Date,
      }),
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
