import { Column, Entity, OneToMany } from 'typeorm';
import { Type } from 'class-transformer';

import { BaseEntity } from 'src/common/base.entity';
import { OrderStatus, Payment } from 'src/shared';
import { OrderDetail } from './order-detail.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Column()
  user_id: string;

  @Column()
  address_id: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_date: Date;

  @Column({ nullable: true })
  approved_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  packaged_date: Date;

  @Column({ nullable: true })
  packaged_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  started_date: Date;

  @Column({ nullable: true })
  started_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  received_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_date: Date;

  @Column({ nullable: true })
  completed_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_date: Date;

  @Column({ nullable: true })
  cancelled_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  returned_date: Date;

  @Column({ nullable: true })
  returned_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  rating_date: Date;

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
  @Type(() => OrderDetail)
  order_details: OrderDetail[];
}
