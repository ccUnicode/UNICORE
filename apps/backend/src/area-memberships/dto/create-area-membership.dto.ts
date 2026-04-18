import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateAreaMembershipDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  memberId: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  areaId: number;

  @IsString()
  @IsNotEmpty()
  role: string;
}
