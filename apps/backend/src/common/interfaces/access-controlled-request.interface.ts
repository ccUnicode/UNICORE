import { Request } from 'express';
import { Member } from '../../members/member.entity';
import { RequestAccessActor } from './request-access-actor.interface';

export interface AccessControlledRequest extends Request {
  accessActor?: RequestAccessActor;
  authenticatedMember?: Member;
}
