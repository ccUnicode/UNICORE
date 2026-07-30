import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { MemberActivityStatus } from '../members/enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from '../members/enums/member-availability-status.enum';
import { Member } from '../members/member.entity';
import { MembersService } from '../members/members.service';
import { MemberResponse } from '../members/dto/member-response.dto';
import { toMemberResponse } from '../members/utils/member-response.util';
import { AuthTokenService } from './auth-token.service';
import { BootstrapAuthDto } from './dto/bootstrap-auth.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './password.service';

const AUTH_BOOTSTRAP_LOCK_ID = 1_973_111_041;
const DUMMY_PASSWORD_HASH = [
  'scrypt',
  '16384',
  '8',
  '1',
  Buffer.alloc(16).toString('base64url'),
  Buffer.alloc(64).toString('base64url'),
].join('$');

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  member: MemberResponse;
}

@Injectable()
export class AuthService {
  private readonly bootstrapSecret: string;

  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly membersService: MembersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: AuthTokenService,
    config: ConfigService,
  ) {
    this.bootstrapSecret = config.get<string>('AUTH_BOOTSTRAP_SECRET') ?? '';

    if (this.bootstrapSecret.length < 32) {
      throw new Error(
        'AUTH_BOOTSTRAP_SECRET must contain at least 32 characters',
      );
    }
  }

  async bootstrap(bootstrapDto: BootstrapAuthDto): Promise<AuthResponse> {
    if (!this.isValidBootstrapSecret(bootstrapDto.bootstrapSecret)) {
      throw new UnauthorizedException('Invalid bootstrap secret');
    }

    return this.membersRepository.manager.transaction(async (entityManager) => {
      await entityManager.query('SELECT pg_advisory_xact_lock($1::bigint)', [
        AUTH_BOOTSTRAP_LOCK_ID,
      ]);
      const membersRepository = entityManager.getRepository(Member);
      const accountsWithPasswords = await membersRepository
        .createQueryBuilder('member')
        .where('member.passwordHash IS NOT NULL')
        .getCount();

      if (accountsWithPasswords > 0) {
        throw new ConflictException(
          'Authentication bootstrap is disabled after the first password is configured',
        );
      }

      if (bootstrapDto.memberId !== undefined) {
        if (bootstrapDto.member) {
          throw new BadRequestException(
            'Provide either memberId or member, not both',
          );
        }

        const member = await membersRepository.findOne({
          where: { id: bootstrapDto.memberId },
          relations: ['memberships'],
        });

        if (!member) {
          throw new ForbiddenException('The bootstrap member must exist');
        }

        this.assertBootstrapMemberCanAuthenticate(member);
        member.sessionVersion = await this.setPassword(
          member.id,
          bootstrapDto.password,
          membersRepository,
        );
        return this.createAuthResponse(member);
      }

      if (!bootstrapDto.member) {
        throw new BadRequestException('member or memberId is required');
      }

      if ((await membersRepository.count()) > 0) {
        throw new ConflictException(
          'Use memberId to bootstrap an existing Presidencia member',
        );
      }

      this.assertBootstrapMemberCanAuthenticate(bootstrapDto.member);

      const member = await this.membersService.create(
        bootstrapDto.member,
        entityManager,
      );
      member.sessionVersion = await this.setPassword(
        member.id,
        bootstrapDto.password,
        membersRepository,
      );

      return this.createAuthResponse(member);
    });
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const member = await this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.memberships', 'memberships')
      .addSelect(['member.passwordHash', 'member.sessionVersion'])
      .where('member.institution = :institution', {
        institution: 'UNI',
      })
      .andWhere('member.studentCode = :studentCode', {
        studentCode: loginDto.studentCode,
      })
      .getOne();

    const credentialsAreValid = await this.passwordService.verify(
      loginDto.password,
      member?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (
      !member ||
      !member.passwordHash ||
      !credentialsAreValid ||
      member.activityStatus !== MemberActivityStatus.ACTIVE ||
      member.availabilityStatus === MemberAvailabilityStatus.DISABLED
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    delete member.passwordHash;

    return this.createAuthResponse(member);
  }

  async setPassword(
    memberId: number,
    password: string,
    membersRepository?: Repository<Member>,
  ): Promise<number> {
    if (!membersRepository) {
      return this.membersRepository.manager.transaction(async (entityManager) =>
        this.setPassword(
          memberId,
          password,
          entityManager.getRepository(Member),
        ),
      );
    }

    const member = await membersRepository.findOne({
      where: { id: memberId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    const sessionVersion = (member.sessionVersion ?? 0) + 1;
    await membersRepository.update(memberId, {
      passwordHash: await this.passwordService.hash(password),
      sessionVersion,
    });

    return sessionVersion;
  }

  private createAuthResponse(member: Member): AuthResponse {
    return {
      accessToken: this.tokenService.sign(
        member.id,
        member.sessionVersion ?? 0,
      ),
      tokenType: 'Bearer',
      member: toMemberResponse(member, AreaRole.PRESIDENCIA),
    };
  }

  private assertBootstrapMemberCanAuthenticate(member: {
    role: AreaRole;
    institution: string;
    studentCode?: string | null;
    activityStatus?: MemberActivityStatus;
    availabilityStatus?: MemberAvailabilityStatus;
  }): void {
    const activityStatus = member.activityStatus ?? MemberActivityStatus.ACTIVE;
    const availabilityStatus =
      member.availabilityStatus ?? MemberAvailabilityStatus.AVAILABLE;

    if (
      member.role !== AreaRole.PRESIDENCIA ||
      member.institution.trim().toUpperCase() !== 'UNI' ||
      activityStatus !== MemberActivityStatus.ACTIVE ||
      availabilityStatus === MemberAvailabilityStatus.DISABLED ||
      !member.studentCode?.trim()
    ) {
      throw new ForbiddenException(
        'The bootstrap member must be an active UNI Presidencia member with a student code',
      );
    }
  }

  private isValidBootstrapSecret(secret: string): boolean {
    const expected = createHash('sha256').update(this.bootstrapSecret).digest();
    const received = createHash('sha256').update(secret).digest();

    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }
}
