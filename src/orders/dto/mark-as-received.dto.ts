import { IsNotEmpty, IsUUID } from 'class-validator';

export class MarkAsReceivedDto {
  @IsUUID(4)
  @IsNotEmpty()
  user_id: string;

  @IsUUID(4)
  @IsNotEmpty()
  order_id: string;
}
