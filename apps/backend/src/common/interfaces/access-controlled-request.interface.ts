import { Request } from 'express';
import { RequestAccessActor } from './request-access-actor.interface';

export interface AccessControlledRequest extends Request {
  accessActor?: RequestAccessActor;
}
