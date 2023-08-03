import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AddressService } from './address.service';

@Controller()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @EventPattern('orders.address.created')
  create(@Payload() createAddressDto: any) {
    return this.addressService.create(createAddressDto);
  }
}
