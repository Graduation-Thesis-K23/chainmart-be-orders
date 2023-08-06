import { IsNotEmpty, IsString } from 'class-validator';

import { OrderStatus } from '~/shared';

export class FindAllByEmployeeDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  status: OrderStatus | 'all';

  @IsString()
  @IsNotEmpty()
  branch_id: string;
}
