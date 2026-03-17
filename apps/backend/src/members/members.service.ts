import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member } from './member.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const member = this.membersRepository.create(createMemberDto);

    try {
      return await this.membersRepository.save(member);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        error.driverError !== null &&
        'code' in error.driverError &&
        error.driverError.code === '23505'
      ) {
        throw new ConflictException(
          `A member with UNI code "${createMemberDto.uniCode}" already exists.`,
        );
      }

      throw error;
    }
  }

  findAll(): Promise<Member[]> {
    return this.membersRepository.find({
      order: {
        lastNames: 'ASC',
        firstNames: 'ASC',
        createdAt: 'ASC',
      },
    });
  }
}
