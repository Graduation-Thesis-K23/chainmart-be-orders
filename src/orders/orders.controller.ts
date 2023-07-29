import { Controller, UseFilters } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';

import { OrdersService } from './orders.service';
import { ExceptionFilter } from 'src/filters/rpc-exception.filter';

@Controller()
@UseFilters(new ExceptionFilter())
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('orders.create')
  create(@Payload() createOrderDto: any) {
    return this.ordersService.create(createOrderDto);
  }

  @MessagePattern('orders.findall')
  findAll() {
    return this.ordersService.findAll();
  }

  @MessagePattern('orders.findallbyuserid')
  findAllByUserId(@Payload() userId: string) {
    return this.ordersService.findAllByUserId(userId);
  }

  @MessagePattern('orders.findbyid')
  findById(@Payload() id: string) {
    return this.ordersService.findById(id);
  }

  @MessagePattern('orders.update')
  update(@Payload() updateOrderDto: any) {
    const { id, ...rest } = updateOrderDto;
    return this.ordersService.update(id, rest);
  }

  @MessagePattern('orders.delete')
  remove(@Payload() id: string) {
    return this.ordersService.remove(id);
  }

  @EventPattern('orders.packaged')
  packageOrder(id: string) {
    this.ordersService.updateOrderToPackaged(id);
  }

  @EventPattern('orders.cancelled')
  cancelOrder(id: string) {
    this.ordersService.updateOrderToCancelled(id);
  }
}
