import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessControlledRequest } from '../interfaces/access-controlled-request.interface';
import { RequestAccessActor } from '../interfaces/request-access-actor.interface';

export const CurrentAccessActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestAccessActor | undefined => {
    const request = context.switchToHttp().getRequest<AccessControlledRequest>();
    return request.accessActor;
  },
);
