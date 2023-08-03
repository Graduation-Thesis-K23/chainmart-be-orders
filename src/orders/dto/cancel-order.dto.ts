import { IsNotEmpty, IsUUID } from 'class-validator';

export class CancelOrderDto {
  @IsUUID(4)
  @IsNotEmpty()
  user_id: string;

  @IsUUID(4)
  @IsNotEmpty()
  order_id: string;
}
