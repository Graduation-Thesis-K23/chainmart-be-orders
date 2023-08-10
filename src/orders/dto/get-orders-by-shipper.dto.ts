import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { OrderStatus } from '~/shared';

export class GetOrderByShipperDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsNotEmpty()
  page: number;

  @IsString()
  @IsNotEmpty()
  branch_id: string;
}
