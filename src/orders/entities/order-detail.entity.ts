import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { Order } from './order.entity';
import { Product } from '~/product/entities/product.entity';

// Resources:
// https://github.com/typeorm/typeorm/issues/1224
// https://stackoverflow.com/questions/60978591

@Entity('order_details')
export class OrderDetail {
  @PrimaryColumn()
  order_id: string;

  @PrimaryColumn({ type: 'varchar', length: 24 })
  product_id: string;

  @ManyToOne(() => Product, (product) => product.id, {
    cascade: true,
  })
  @JoinColumn({
    referencedColumnName: 'id',
    name: 'product_id',
  })
  product: Product;

  @ManyToOne(() => Order, (order) => order.id)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column()
  quantity: number;
}
