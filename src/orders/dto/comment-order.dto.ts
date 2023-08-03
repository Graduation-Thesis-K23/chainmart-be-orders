import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CommentOrderDto {
  @IsString()
  @IsUUID(4)
  user_id: string;

  @IsString()
  @IsNotEmpty()
  product_id: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  star: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsNotEmpty()
  order_id: string;
}
