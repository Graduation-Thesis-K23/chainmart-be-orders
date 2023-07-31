import { IsNotEmpty, IsString } from 'class-validator';

export class DashboardDto {
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  branch: string;
}
