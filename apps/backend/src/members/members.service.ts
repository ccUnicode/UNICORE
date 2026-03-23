import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateMemberDto } from './dto/create-member.dto';
import { Member } from './member.entity';

type DatabaseErrorWithCode = {
  code: string;
};

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
      const databaseError =
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        error.driverError !== null &&
        'code' in error.driverError
          ? (error.driverError as DatabaseErrorWithCode)
          : null;

      if (databaseError?.code === '23505') {
        const duplicateMessage = createMemberDto.studentCode
          ? `A member with institution "${createMemberDto.institution}" and student code "${createMemberDto.studentCode}" already exists.`
          : `A member with institution "${createMemberDto.institution}" already exists.`;

        throw new ConflictException(duplicateMessage);
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
