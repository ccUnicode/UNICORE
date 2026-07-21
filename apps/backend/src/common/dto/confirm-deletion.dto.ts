import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfirmDeletionDto {
  @IsString({ message: 'confirmName must be a string' })
  @IsNotEmpty({ message: 'confirmName is required' })
  @MaxLength(255)
  confirmName: string;
}
