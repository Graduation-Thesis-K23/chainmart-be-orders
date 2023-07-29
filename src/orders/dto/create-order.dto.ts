import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, Payment } from 'src/shared';

export class CreateOrderDto {
  @IsUUID(4)
  @IsNotEmpty()
  user_id: string;

  @IsUUID(4)
  @IsNotEmpty()
  address_id: string;

  @IsString()
  @IsOptional()
  estimated_shipped_date?: string;

  @IsString()
  @IsOptional()
  shipped_date?: string;

  @IsString()
  @IsOptional()
  approved_date?: string;

  @IsString()
  @IsOptional()
  return_date?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(Payment)
  @IsOptional()
  payment?: Payment;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @Type(() => OrderDetailParam)
  order_details: OrderDetailParam[];
}

class OrderDetailParam {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
