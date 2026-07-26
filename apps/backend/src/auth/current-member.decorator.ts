import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessControlledRequest } from '../common/interfaces/access-controlled-request.interface';
import { Member } from '../members/member.entity';

export const CurrentMember = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Member | undefined =>
    context.switchToHttp().getRequest<AccessControlledRequest>()
      .authenticatedMember,
);
