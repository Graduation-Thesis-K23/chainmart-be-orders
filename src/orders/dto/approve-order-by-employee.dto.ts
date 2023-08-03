import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ApproveOrderByEmployeeDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsUUID(4)
  @IsNotEmpty()
  order_id: string;
}
