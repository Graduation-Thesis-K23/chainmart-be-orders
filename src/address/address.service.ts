import { Injectable } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';

@Injectable()
export class AddressService {
  @InjectRepository(Address)
  private readonly addressRepository: Repository<Address>;

  create(createAddressDto: CreateAddressDto) {
    console.log('orders.address.created', createAddressDto);
    const newAddress = this.addressRepository.create(createAddressDto);
    return this.addressRepository.save(newAddress);
  }
}
