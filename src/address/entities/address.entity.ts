import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('address')
export class Address {
  @PrimaryColumn()
  id: string;

  @Column()
  phone: string;

  @Column()
  name: string;

  @Column()
  district: string;

  @Column()
  city: string;

  @Column()
  ward: string;

  @Column()
  street: string;
}
