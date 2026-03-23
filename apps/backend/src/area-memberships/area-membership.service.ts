import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaMembership } from './area-membership.entity';
import { AreaRole } from '../common/enums/area-role.enum';

@Injectable()
export class AreaMembershipService {
  constructor(
    @InjectRepository(AreaMembership)
    private readonly membershipRepo: Repository<AreaMembership>,
  ) {}

  assign(userId: string, areaId: string, role: AreaRole): Promise<AreaMembership> {
    const membership = this.membershipRepo.create({ userId, areaId, role });
    return this.membershipRepo.save(membership);
  }

  findByArea(areaId: string): Promise<AreaMembership[]> {
    return this.membershipRepo.find({
      where: { areaId },
      relations: ['user'],
    });
  }

  findByUser(userId: string): Promise<AreaMembership[]> {
    return this.membershipRepo.find({
      where: { userId },
      relations: ['area'],
    });
  }

  async revoke(id: string): Promise<void> {
    const membership = await this.membershipRepo.findOneBy({ id });
    if (!membership) throw new NotFoundException(`Membership ${id} not found`);
    await this.membershipRepo.remove(membership);
  }
}
