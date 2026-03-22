import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/members.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ActivityState } from './entities/members.entity';
import { AvailabilityState } from './entities/members.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  create(createMemberDto: CreateMemberDto) {
    const user = this.usersRepository.create(createMemberDto);
    return this.usersRepository.save(user);
  }

  findAll() {
    return this.usersRepository.find();
  }

  findOne(id: number) {
    return this.usersRepository.findOneBy({ UserId: id });
  }

  update(id: number, updateMemberDto: UpdateMemberDto) {
    return this.usersRepository.update(id, updateMemberDto).then(() =>
      this.usersRepository.findOneBy({ UserId: id })
    );
  }

  updateActivityStatus(id: number, status: ActivityState) { 
    return this.usersRepository.update(id, { Activity: status }).then(() =>
      this.usersRepository.findOneBy({ UserId: id })
    );
  }

  updateDisponibilityStatus(id: number, status: AvailabilityState) {
    return this.usersRepository.update(id, { Disponibility: status }).then(() =>
      this.usersRepository.findOneBy({ UserId: id })
    );
  }
}
