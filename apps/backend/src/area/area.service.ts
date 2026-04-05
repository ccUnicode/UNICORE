import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { Area } from './entities/area.entity';

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  async create(createAreaDto: CreateAreaDto): Promise<Area> {
    const existingArea = await this.areaRepository.findOne({
      where: { name: createAreaDto.name },
    });
    if (existingArea) {
      throw new ConflictException(`Area with name "${createAreaDto.name}" already exists`);
    }

    const area = this.areaRepository.create(createAreaDto);
    return this.areaRepository.save(area);
  }

  async findAll(): Promise<Area[]> {
    return this.areaRepository.find({
      where: { isArchived: false },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Area> {
    const area = await this.areaRepository.findOne({ 
      where: { id, isArchived: false } 
    });
    if (!area) {
      throw new NotFoundException(`Area with ID "${id}" not found`);
    }
    return area;
  }

  async update(id: number, updateAreaDto: UpdateAreaDto): Promise<Area> {
    const area = await this.findOne(id);
    
    // Merge the updates into the existing area
    Object.assign(area, updateAreaDto);
    
    return this.areaRepository.save(area);
  }

  async archive(id: number): Promise<Area> {
    const area = await this.findOne(id);
    area.isArchived = true;
    return this.areaRepository.save(area);
  }
}
