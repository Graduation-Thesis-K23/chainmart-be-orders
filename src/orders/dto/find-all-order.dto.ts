import { IsNotEmpty, IsUUID } from 'class-validator';

import { OrderStatus } from '~/shared';

export class FindAllOrderDto {
  @IsUUID(4)
  @IsNotEmpty()
  user_id: string;

  @IsNotEmpty()
  status: OrderStatus | 'all';
}
