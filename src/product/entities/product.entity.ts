import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  price: number;

  @Column()
  slug: string;

  @Column()
  image: string;

  @Column({
    nullable: true,
  })
  sale: number;
}
