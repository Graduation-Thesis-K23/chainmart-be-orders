import { Injectable } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';

@Injectable()
export class AddressService {
  @InjectRepository(Address)
  private readonly addressRepository: Repository<Address>;

  async create(createAddressDto: CreateAddressDto) {
    try {
      const newAddress = this.addressRepository.create(createAddressDto);
      await this.addressRepository.save(newAddress);
      console.log('new address', newAddress);
    } catch (error) {
      console.error(error);
    }
  }

  async getAddressNameById(id: string) {
    try {
      const address = await this.addressRepository.findOneBy({ id });
      if (!address) {
        throw new Error('Address not found');
      }
      return address.phone;
    } catch (error) {
      console.error(error);
    }
  }
}
