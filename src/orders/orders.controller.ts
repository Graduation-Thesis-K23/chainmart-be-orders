import { Controller, UseFilters } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';

import { OrdersService } from './orders.service';
import { ExceptionFilter } from 'src/filters/rpc-exception.filter';
import { DashboardDto } from './dto/dashboard.to';

@Controller()
@UseFilters(new ExceptionFilter())
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('orders.health-check')
  async healthCheck() {
    console.log('orders.health-check received');
    return 'orders service is working';
  }

  @MessagePattern('orders.create')
  create(@Payload() createOrderDto: any) {
    return this.ordersService.create(createOrderDto);
  }

  @MessagePattern('orders.findall')
  findAll(@Payload() findAllOrderDto: any) {
    return this.ordersService.findAll(findAllOrderDto);
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

  @MessagePattern('orders.cancel')
  cancel(@Payload() cancelOrderDto: any) {
    return this.ordersService.cancel(cancelOrderDto);
  }

  @MessagePattern('orders.return')
  return(@Payload() returnOrderDto: any) {
    return this.ordersService.return(returnOrderDto);
  }

  @MessagePattern('orders.resell')
  resell(@Payload() resellOrderDto: any) {
    return this.ordersService.resell(resellOrderDto);
  }

  @MessagePattern('orders.markasreceived')
  markAsReceived(@Payload() markAsReceivedDto: any) {
    return this.ordersService.markAsReceived(markAsReceivedDto);
  }

  @MessagePattern('orders.findallbyemployee')
  findAllByEmployee(@Payload() findAllByEmployeeDto: any) {
    return this.ordersService.findAllByEmployee(findAllByEmployeeDto);
  }

  @MessagePattern('orders.findallbyadmin')
  getAllOrdersByAdmin(@Payload() status: any) {
    return this.ordersService.getAllOrdersByAdmin(status);
  }

  @MessagePattern('orders.approveorderbyemployee')
  approveOrderByEmployee(@Payload() approveOrderByEmployeeDto: any) {
    return this.ordersService.approveOrderByEmployee(approveOrderByEmployeeDto);
  }

  @MessagePattern('orders.rejectorderbyemployee')
  rejectOrderByEmployee(@Payload() rejectOrderByEmployeeDto: any) {
    return this.ordersService.rejectOrderByEmployee(rejectOrderByEmployeeDto);
  }

  @MessagePattern('orders.startshipmentbyemployee')
  startShipmentByEmployee(@Payload() startShipmentByEmployee: any) {
    return this.ordersService.startShipmentByEmployee(startShipmentByEmployee);
  }

  @MessagePattern('orders.getordersbyshipper')
  getOrdersByShipper(@Payload() getOrdersByShipperDto: any) {
    return this.ordersService.getOrdersByShipper(getOrdersByShipperDto);
  }

  @MessagePattern('orders.startshipmentbyshipper')
  startShipmentByShipper(@Payload() startShipmentByShipperDto: any) {
    return this.ordersService.startShipmentByShipper(startShipmentByShipperDto);
  }

  @MessagePattern('orders.completeorderbyshipper')
  completeOrderByShipper(@Payload() completeOrderByShipperDto: any) {
    return this.ordersService.completeOrderByShipper(completeOrderByShipperDto);
  }

  @MessagePattern('orders.cancellorderbyshipper')
  cancelOrderByShipper(@Payload() cancelOrderByShipperDto: any) {
    return this.ordersService.cancelOrderByShipper(cancelOrderByShipperDto);
  }

  @MessagePattern('orders.commented')
  orderCommented(@Payload() cancelOrderByShipperDto: any) {
    return this.ordersService.comment(cancelOrderByShipperDto);
  }

  @EventPattern('orders.packaged')
  packageOrder(id: string) {
    this.ordersService.updateOrderToPackaged(id);
  }

  @EventPattern('orders.cancelled')
  cancelOrder(id: string) {
    this.ordersService.updateOrderToCancelled(id);
  }

  /**
   * @deprecated The method should not be used
   */
  @MessagePattern('orders.findbankingorderbyuserid')
  findBankingOrderByUserId(@Payload() user_id: string) {
    return this.ordersService.findBankingOrderByUserId(user_id);
  }

  @MessagePattern('orders.findbankingorderbyid')
  findBankingOrderById(@Payload() id: string) {
    return this.ordersService.findBankingOrderById(id);
  }

  @EventPattern('orders.makepayment')
  makePayment(@Payload() id: string) {
    return this.ordersService.makePayment(id);
  }

  @EventPattern('orders.cancelbankingorderbyid')
  cancelBankingOrderById(id: string) {
    return this.ordersService.updateOrderToCancelled(id);
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

  @MessagePattern('orders.getordersbyphone')
  getOrdersByPhone(@Payload() phone: string) {
    return this.ordersService.getOrdersByPhone(phone);
  }

  @MessagePattern('orders.findallbyids')
  findAllByIds(@Payload() ids: any) {
    return this.ordersService.findAllByIds(ids);
  }
}
