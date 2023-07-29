import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from 'src/common/base.entity';

import { OrderStatus, Payment } from 'src/shared';
import { OrderDetail } from './order-detail.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Column()
  user_id: string;

  @Column()
  address_id: string;

  @Column({ type: 'date' })
  estimated_shipped_date: string;

  @Column({ type: 'date', nullable: true })
  shipped_date: string;

  @Column({ type: 'date', nullable: true })
  approved_date: string;

  @Column({ type: 'date', nullable: true })
  return_date: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.Created,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: Payment,
    default: Payment.Cash,
  })
  payment: Payment;

  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.order, {
    cascade: true,
  })
  order_details: OrderDetail[];
}
