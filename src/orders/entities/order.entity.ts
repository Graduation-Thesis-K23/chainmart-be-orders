import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { Type } from 'class-transformer';
import { customAlphabet } from 'nanoid';

import { BaseEntity } from 'src/common/base.entity';
import { OrderStatus, Payment, PaymentStatus } from 'src/shared';
import { OrderDetail } from './order-detail.entity';
import { Address } from '~/address/entities/address.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Column()
  user_id: string;

  @Column()
  address_id: string;

  @Column({
    unique: true,
  })
  order_code: string;

  @ManyToOne(() => Address, (address) => address.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    referencedColumnName: 'id',
    name: 'address_id',
  })
  address: Address;

  @Column({ type: 'timestamptz', nullable: true })
  approved_date?: Date;

  @Column({ nullable: true })
  approved_by?: string;

  @Column({ type: 'timestamptz', nullable: true })
  packaged_date?: Date;

  @Column({ nullable: true })
  packaged_by?: string;

  @Column({ type: 'timestamptz', nullable: true })
  started_date?: Date;

  @Column({ nullable: true })
  started_by?: string;

  @Column({ nullable: true })
  branch_id?: string;

  @Column({ type: 'timestamptz', nullable: true })
  received_date?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_date?: Date;

  @Column({ nullable: true })
  completed_by?: string;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_date?: Date;

  @Column({ nullable: true })
  cancelled_by?: string;

  @Column({ type: 'timestamptz', nullable: true })
  returned_date?: Date;

  @Column({ nullable: true })
  returned_by?: string;

  @Column({ type: 'timestamptz', nullable: true })
  rating_date?: Date;

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

  @Column({
    nullable: true,
  })
  payment_status?: PaymentStatus;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  expiration_timestamp?: Date;

  @BeforeInsert()
  async hashPassword(): Promise<void> {
    try {
      const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 11);

      this.order_code = nanoid();
    } catch (error) {
      console.error(error);
    }
  }
}
