import { Controller, Inject, UseFilters } from '@nestjs/common';
import {
  ClientKafka,
  EventPattern,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';

import { OrdersService } from './orders.service';
import { ExceptionFilter } from 'src/filters/rpc-exception.filter';
import { DashboardDto } from './dto/dashboard.to';

@Controller()
@UseFilters(new ExceptionFilter())
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) /*  @Inject('PRODUCT_SERVICE')
    private readonly productClient: ClientKafka, */ {}

  /*  async onModuleInit() {
    const topics = [
      'create',
      'findall',
      'findbyids',
      'findbyid',
      'findbyslug',
      'update',
      'delete',
      'staticpaths',
    ];
    topics.forEach((topic) => {
      this.productClient.subscribeToResponseOf(`products.${topic}`);
    });
    await this.productClient.connect();
  } */

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

  // dashboard
  @MessagePattern('orders.getnumberordersperday')
  getNumberOrdersPerDay(@Payload() dashboardDto: DashboardDto) {
    return this.ordersService.getNumberOrdersPerDay(dashboardDto);
  }

  @MessagePattern('orders.gethotsellingproduct')
  getHotSellingProduct(@Payload() dashboardDto: DashboardDto) {
    return this.ordersService.getHotSellingProduct(dashboardDto);
  }

  @MessagePattern('orders.getrevenueperday')
  getRevenuePerDay(@Payload() dashboardDto: DashboardDto) {
    return this.ordersService.getRevenuePerDay(dashboardDto);
  }
}
