import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { instanceToPlain } from 'class-transformer';
import { Cache } from 'cache-manager';
import * as moment from 'moment-timezone';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { OrderStatus, Payment, PaymentStatus } from '~/shared';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { FindAllOrderDto } from './dto/find-all-order.dto';
import { CommentOrderDto } from './dto/comment-order.dto';
import { ReturnOrderDto } from './dto/return-order.dto';
import { ResellOrderDto } from './dto/resell-order.dto';
import { MarkAsReceivedDto } from './dto/mark-as-received.dto';
import { FindAllByEmployeeDto } from './dto/find-all-by-employee.dto';
import { ApproveOrderByEmployeeDto } from './dto/approve-order-by-employee.dto';
import { RejectOrderByEmployeeDto } from './dto/reject-order-by-employee.dto';
import { StartShipmentByEmployeeDto } from './dto/start-shipment-by-employee.dto';
import { GetOrderByShipperDto as GetOrdersByShipperDto } from './dto/get-orders-by-shipper.dto';
import { StartShipmentByShipperDto } from './dto/start-shipment-by-shipper.dto';
import { CompleteOrderByShipperDto } from './dto/complete-order-by-shipper.dto';
import { CancelOrderByShipperDto } from './dto/cancel-order-by-shipper.dto';
import { DashboardDto } from './dto/dashboard.to';
import { ProductService } from '~/product/product.service';
import { AddressService } from '~/address/address.service';

@Injectable()
export class OrdersService {
  private readonly ORDER_DURATION_MS = 3 * 60 * 1000; // 3 minutes

  constructor(
    @Inject('ORCHESTRATION_SERVICE')
    private readonly orchestrationClient: ClientKafka,

    @Inject('CART_SERVICE')
    private readonly cartClient: ClientKafka,

    @Inject('RATE_SERVICE')
    private readonly rateClient: ClientKafka,

    @Inject('SEARCH_SERVICE')
    private readonly searchClient: ClientKafka,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly dataSource: DataSource,

    private readonly productService: ProductService,

    private readonly addressService: AddressService,

    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    console.log('createOrderDto', createOrderDto);
    try {
      const order = this.orderRepository.create({
        ...createOrderDto,
      });

      if (createOrderDto.payment === Payment.Banking) {
        order.payment_status = PaymentStatus.Unpaid;
        order.expiration_timestamp = moment()
          .tz('Asia/Ho_Chi_Minh')
          .add(this.ORDER_DURATION_MS, 'ms')
          .toDate();
        console.log('Banking order', order);
      }

      const newOrder = await this.orderRepository.save(order);

      console.log('New order', newOrder);

      if (createOrderDto.payment === Payment.Banking) {
        await this.cacheManager.set(
          newOrder.id,
          instanceToPlain(order),
          this.ORDER_DURATION_MS,
        );
      }

      const ids = newOrder.order_details.map(
        (order_detail) => order_detail.product_id,
      );

      // get name of ids
      const slugs: string[] = await this.productService.getProductsByIds(ids);
      const phone: string = await this.addressService.getAddressNameById(
        newOrder.address_id,
      );

      console.log('phone', phone);

      console.log('slugs', slugs);

      this.cartClient.emit('carts.orders.clean', createOrderDto.username);
      this.searchClient.emit('search.order.index', {
        id: newOrder.id,
        order_code: newOrder.order_code,
        user_id: newOrder.user_id,
        slugs,
        phone,
      });

      return order;
    } catch (err) {
      console.error(err);
      throw new RpcException(err.message);
    }
  }

  async findAllByIds(ids: string[]) {
    console.log('findAllByIds', ids);

    try {
      const orders = await this.orderRepository.find({
        where: {
          id: In(ids),
        },
        relations: {
          order_details: {
            product: true,
          },
          address: true,
        },
      });

      await this.checkOrdersNeedToCancel(orders);

      return instanceToPlain(orders);
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot find orders');
    }
  }

  async findAll(findAllOrderDto: FindAllOrderDto) {
    console.log('findAllOrderDto', findAllOrderDto);
    try {
      const whereClause: Record<string, any> = {
        user_id: findAllOrderDto.user_id,
      };

      if (findAllOrderDto.status !== 'all') {
        whereClause.status = findAllOrderDto.status;
      }

      const orders = await this.orderRepository.find({
        relations: {
          order_details: {
            product: true,
          },
          address: true,
        },
        where: whereClause,
        order: {
          created_at: 'DESC',
        },
      });

      await this.checkOrdersNeedToCancel(orders);

      return instanceToPlain(orders);
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot find orders');
    }
  }

  private async checkOrdersNeedToCancel(orders: Order[]) {
    try {
      for (let order of orders) {
        if (order.payment === Payment.Banking) {
          const currentTime = moment().tz('Asia/Ho_Chi_Minh');
          console.log(order.id, moment(order.expiration_timestamp));

          if (
            order.status === OrderStatus.Created &&
            moment(order.expiration_timestamp).isBefore(currentTime)
          ) {
            order = await this.updateOrderToCancelled(order.id);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async findAllByUserId(userId: string) {
    try {
      const orders = await this.orderRepository.find({
        relations: {
          order_details: {
            product: true,
          },
          address: true,
        },
        where: {
          user_id: userId,
        },
      });

      await this.checkOrdersNeedToCancel(orders);

      return instanceToPlain(orders);
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot find orders by user_id');
    }
  }

  async findById(id: string) {
    try {
      return await this.orderRepository.findOne({
        where: {
          id,
        },
        relations: {
          order_details: {
            product: true,
          },
          address: true,
        },
      });
    } catch (error) {
      console.error(error);
      throw new RpcException(`Cannot find order with id(${id})`);
    }
  }

  async getAllOrdersByAdmin(status: OrderStatus | 'all') {
    console.log('status', status);
    // status = 'all' => get all orders

    try {
      const orders = await this.orderRepository.find({
        where: {
          ...{
            status: status !== 'all' ? status : undefined,
          },
        },
        relations: {
          order_details: {
            product: true,
          },
          address: true,
        },
        order: {
          created_at: 'DESC',
        },
      });

      await this.checkOrdersNeedToCancel(orders);

      return instanceToPlain(orders);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to get all orders by admin');
    }
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    try {
      const order = await this.orderRepository.findOneBy({ id });
      if (!order) {
        throw new RpcException(`Cannot find order with id(${id})`);
      }

      // save and return relation
      const result = await this.orderRepository.save({
        ...order,
        ...updateOrderDto,
      });

      return instanceToPlain(result);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to update order');
    }
  }

  async remove(id: string) {
    try {
      const result = await this.orderRepository.softDelete(id);

      if (result.affected === 0) {
        throw new RpcException(`Order with id(${id}) not found`);
      }

      return `Order with id(${id}) have been deleted`;
    } catch (error) {
      console.error(error);
      throw new RpcException(`Cannot delete order with id(${id})`);
    }
  }

  async cancel(cancelOrderDto: CancelOrderDto) {
    console.log('cancelOrderDto', cancelOrderDto);
    const order = await this.orderRepository.findOne({
      where: {
        id: cancelOrderDto.order_id,
      },
    });
    if (!order) {
      throw new RpcException('Order not found');
    }

    if (
      !(
        order.status === OrderStatus.Created ||
        order.status === OrderStatus.Approved
      )
    ) {
      throw new RpcException('Cannot cancel order');
    }

    try {
      const cancelledOrder = await this.orderRepository.save({
        ...order,
        status: OrderStatus.Cancelled,
        cancelled_date: new Date(),
        cancelled_by: cancelOrderDto.user_id,
      });

      return instanceToPlain(cancelledOrder);
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot cancel order');
    }
  }

  async return(returnOrderDto: ReturnOrderDto) {
    const order = await this.orderRepository.findOne({
      where: {
        id: returnOrderDto.order_id,
        user_id: returnOrderDto.user_id,
      },
      relations: {
        order_details: {
          product: true,
        },
        address: true,
      },
    });
    if (!order) {
      throw new RpcException('Order not found');
    }

    if (order.status !== OrderStatus.Completed) {
      throw new RpcException('Cannot return order');
    }

    try {
      order.status = OrderStatus.Returned;
      order.returned_date = new Date();
      order.returned_by = returnOrderDto.user_id;

      await this.orderRepository.save(order);

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to return order');
    }
  }

  async resell(resellOrderDto: ResellOrderDto) {
    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: resellOrderDto.order_id,
          user_id: resellOrderDto.user_id,
        },
        relations: {
          order_details: {
            product: true,
          },
          address: true,
        },
      });
      if (!order) {
        throw new RpcException('Order not found');
      }

      if (
        order.status !== OrderStatus.Completed &&
        order.status !== OrderStatus.Cancelled
      ) {
        throw new RpcException('Cannot resell order');
      }

      const { order_details, payment, address_id, user_id } = order;
      const newOrder = this.orderRepository.create({
        order_details,
        payment,
        address_id,
        user_id,
      });

      await this.orderRepository.save(newOrder);

      return instanceToPlain(newOrder);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to resell order');
    }
  }

  async markAsReceived(markAsReceivedDto: MarkAsReceivedDto) {
    console.log(markAsReceivedDto);

    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: markAsReceivedDto.order_id,
          user_id: markAsReceivedDto.user_id,
        },
      });

      if (!order) {
        throw new RpcException('Order not found');
      }

      if (order.status !== OrderStatus.Started) {
        throw new RpcException('Cannot completed order');
      }

      order.status = OrderStatus.Completed;
      order.completed_date = new Date();

      await this.orderRepository.save(order);

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to mark as received order');
    }
  }

  async findAllByEmployee(findAllByEmployeeDto: FindAllByEmployeeDto) {
    const { status, branch_id } = findAllByEmployeeDto;

    console.log(findAllByEmployeeDto);

    try {
      if (status === 'all') {
        const orders = await this.orderRepository.find({
          where: [
            {
              branch_id,
            },
            {
              status: OrderStatus.Created,
            },
          ],
          relations: {
            order_details: {
              product: true,
            },
            address: true,
          },
          order: {
            created_at: 'DESC',
          },
        });

        await this.checkOrdersNeedToCancel(orders);

        return instanceToPlain(orders);
      } else {
        if (status === OrderStatus.Created) {
          const orders = await this.orderRepository.find({
            where: {
              status,
            },
            relations: {
              order_details: {
                product: true,
              },
              address: true,
            },
            order: {
              created_at: 'DESC',
            },
          });

          return instanceToPlain(orders);
        } else {
          const orders = await this.orderRepository.find({
            where: {
              status,
              branch_id,
            },
            relations: {
              order_details: {
                product: true,
              },
              address: true,
            },
            order: {
              created_at: 'DESC',
            },
          });

          await this.checkOrdersNeedToCancel(orders);

          return instanceToPlain(orders);
        }
      }
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to find all by employee');
    }
  }

  async approveOrderByEmployee(
    approveOrderByEmployeeDto: ApproveOrderByEmployeeDto,
  ) {
    console.log('approveOrderByEmployeeDto', approveOrderByEmployeeDto);
    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: approveOrderByEmployeeDto.order_id,
        },
      });

      if (!order) {
        throw new RpcException('Order not found');
      }

      if (order.status !== OrderStatus.Created) {
        throw new RpcException('Cannot approve order');
      }

      order.status = OrderStatus.Approved;
      order.approved_date = new Date();
      order.approved_by = approveOrderByEmployeeDto.phone;
      order.branch_id = approveOrderByEmployeeDto.branch_id;
      order.payment_status =
        order.payment === Payment.Banking ? PaymentStatus.Paid : null;

      console.log('order', order);

      // should be transaction update stock

      await this.orderRepository.save(order);

      const orderTemp = await this.orderRepository.findOne({
        where: {
          id: approveOrderByEmployeeDto.order_id,
        },
        relations: {
          order_details: {
            product: true,
          },
        },
      });

      // update stock
      this.orchestrationClient.emit(
        'orchestration.orders.approved_by_employee',
        {
          order_id: order.id,
          order_details: orderTemp.order_details.map((order_detail) => ({
            product_id: order_detail.product_id,
            quantity: order_detail.quantity,
          })),
          branch_id: order.branch_id,
        },
      );

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to approve order by employee');
    }
  }

  async rejectOrderByEmployee(
    rejectOrderByEmployeeDto: RejectOrderByEmployeeDto,
  ) {
    console.log('rejectOrderByEmployeeDto', rejectOrderByEmployeeDto);

    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: rejectOrderByEmployeeDto.order_id,
        },
      });

      if (!order) {
        throw new RpcException('Order not found');
      }

      if (
        order.status !== OrderStatus.Created &&
        order.status !== OrderStatus.Approved
      ) {
        throw new RpcException('Cannot reject order');
      }

      order.status = OrderStatus.Cancelled;
      order.cancelled_date = new Date();
      order.cancelled_by = rejectOrderByEmployeeDto.phone;
      order.branch_id = rejectOrderByEmployeeDto.branch_id;

      console.log(order);

      await this.orderRepository.save(order);

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to reject order by employee');
    }
  }

  async startShipmentByEmployee(
    startShipmentByEmployeeDto: StartShipmentByEmployeeDto,
  ) {
    console.log('startShipmentByEmployeeDto', startShipmentByEmployeeDto);

    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: startShipmentByEmployeeDto.order_id,
        },
      });

      if (!order) {
        throw new RpcException('Order not found');
      }

      if (order.status !== OrderStatus.Approved) {
        throw new RpcException('Cannot start shipment');
      }

      order.status = OrderStatus.Packaged;
      order.packaged_date = new Date();
      order.packaged_by = startShipmentByEmployeeDto.phone;

      console.log(order);

      await this.orderRepository.save(order);

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to start shipment by employee');
    }
  }

  async getOrdersByShipper(getOrdersByShipperDto: GetOrdersByShipperDto) {
    console.log('shipper-get-orders', getOrdersByShipperDto);

    const { status, phone, branch_id } = getOrdersByShipperDto;

    try {
      let orders: Order[];

      switch (status) {
        case OrderStatus.Packaged:
          orders = await this.orderRepository.find({
            where: {
              status: OrderStatus.Packaged,
              branch_id,
            },
            relations: {
              order_details: {
                product: true,
              },
              address: true,
            },
            order: {
              packaged_date: 'DESC',
            },
            skip: (getOrdersByShipperDto.page - 1) * 6,
            take: 6,
          });
          break;
        case OrderStatus.Started:
          orders = await this.orderRepository.find({
            where: {
              status: OrderStatus.Started,
              branch_id,
              completed_by: IsNull(),
            },
            relations: {
              order_details: {
                product: true,
              },
              address: true,
            },
            order: {
              started_date: 'DESC',
            },
            skip: (getOrdersByShipperDto.page - 1) * 6,
            take: 6,
          });
          break;
        case OrderStatus.Completed:
          orders = await this.orderRepository.find({
            where: {
              completed_by: phone,
              branch_id,
            },
            relations: {
              order_details: {
                product: true,
              },
              address: true,
            },
            order: {
              completed_date: 'DESC',
            },
            skip: (getOrdersByShipperDto.page - 1) * 6,
            take: 6,
          });
          break;
        case OrderStatus.Cancelled:
          orders = await this.orderRepository.find({
            where: {
              status: OrderStatus.Cancelled,
              branch_id,
              cancelled_by: phone,
            },
            relations: {
              order_details: {
                product: true,
              },
              address: true,
            },
            order: {
              cancelled_date: 'DESC',
            },
            skip: (getOrdersByShipperDto.page - 1) * 6,
            take: 6,
          });
          break;
      }

      await this.checkOrdersNeedToCancel(orders);

      return instanceToPlain(orders);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to get orders by shipper');
    }
  }

  async startShipmentByShipper(
    startShipmentByShipperDto: StartShipmentByShipperDto,
  ) {
    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: startShipmentByShipperDto.order_id,
        },
      });

      if (!order) {
        throw new RpcException('Order not found');
      }

      if (order.status !== OrderStatus.Packaged) {
        throw new RpcException('Cannot start shipment');
      }

      order.status = OrderStatus.Started;
      order.started_date = new Date();
      order.started_by = startShipmentByShipperDto.phone;

      await this.orderRepository.save(order);

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to start shipment by shipper');
    }
  }

  async completeOrderByShipper(
    completeOrderByShipperDto: CompleteOrderByShipperDto,
  ) {
    console.log('completeOrderByShipperDto', completeOrderByShipperDto);
    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: completeOrderByShipperDto.order_id,
        },
      });

      if (!order) {
        throw new RpcException('Order not found');
      }

      if (order.status !== OrderStatus.Started) {
        throw new RpcException('Cannot complete order');
      }

      order.received_date = new Date();
      order.completed_by = completeOrderByShipperDto.phone;

      await this.orderRepository.save(order);

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to complete order by shipper');
    }
  }

  async cancelOrderByShipper(cancelOrderByShipperDto: CancelOrderByShipperDto) {
    console.log('cancelOrderByShipperDto', cancelOrderByShipperDto);

    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: cancelOrderByShipperDto.order_id,
        },
      });

      if (!order) {
        throw new RpcException('Order not found');
      }

      if (order.status !== OrderStatus.Started) {
        throw new RpcException('Cannot cancel order');
      }

      order.status = OrderStatus.Cancelled;
      order.cancelled_date = new Date();
      order.cancelled_by = cancelOrderByShipperDto.phone;

      await this.orderRepository.save(order);

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to cancel order by shipper');
    }
  }

  async comment(commentOrderDto: CommentOrderDto) {
    const order = await this.orderRepository.findOne({
      where: {
        id: commentOrderDto.order_id,
      },
    });
    if (!order) {
      throw new RpcException('Order not found');
    }

    if (order.status !== OrderStatus.Completed) {
      throw new RpcException('Cannot comment order');
    }

    try {
      order.rating_date = new Date();
      await this.orderRepository.save(order);

      this.rateClient.emit('rates.rated', { ...commentOrderDto });

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to comment order');
    }
  }

  async updateOrderToPackaged(id: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: {
          id,
        },
      });
      if (!order) {
        throw new RpcException(`Cannot find order with id(${id})`);
      }

      const approvedOrder = await this.orderRepository.save({
        ...order,
        status: OrderStatus.Approved,
        approved_date: order.approved_date ? order.approved_date : new Date(),
        approved_by: order.approved_by ? order.approved_by : 'BOT',
        payment_status:
          order.payment === Payment.Banking ? PaymentStatus.Paid : null,
      });

      return approvedOrder;
    } catch (error) {
      console.error(error);
      console.error('Cannot update order to Packaged');
    }
  }

  async updateOrderToCancelled(id: string) {
    console.log('id to cancelled', id);
    try {
      const order = await this.orderRepository.findOne({
        where: {
          id,
        },
      });

      if (!order) {
        throw new RpcException(`Cannot find order with id(${id})`);
      }

      const cancelledOrder = await this.orderRepository.save({
        ...order,
        status: OrderStatus.Cancelled,
        cancelled_date: new Date(),
        cancelled_by: 'BOT',
        // Mark as FAILED if order has been PROCESSING, else keeps UNPAID
        payment_status:
          order.payment === Payment.Banking &&
          order.payment_status === PaymentStatus.Processing
            ? PaymentStatus.Failed
            : PaymentStatus.Unpaid,
      });

      console.log('Cancelled Order', cancelledOrder);

      return cancelledOrder;
    } catch (error) {
      console.error(error);
      console.error('Cannot update order to Cancelled');
    }
  }

  /**
   * @deprecated The method should not be used
   */
  async findBankingOrderByUserId(user_id: string) {
    try {
      const orderCached = await this.cacheManager.get(user_id);
      console.log('Order cached', orderCached);
      if (orderCached) {
        return orderCached;
      }

      const orderInDb = await this.orderRepository.findOne({
        where: {
          user_id,
          status: OrderStatus.Created,
          payment: Payment.Banking,
        },
      });

      if (!orderInDb) {
        console.log('No banking order found');
        throw new RpcException('No banking order available');
      }

      const updatedOrderInDb = await this.updateOrderToCancelled(orderInDb.id);

      return updatedOrderInDb;
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot to find banking order by user id');
    }
  }

  async findBankingOrderById(id: string) {
    try {
      const orderCached = await this.cacheManager.get(id);
      console.log('Order cached', orderCached);
      if (orderCached) {
        return orderCached;
      }

      const orderInDb = await this.orderRepository.findOne({
        where: {
          id: id,
          status: OrderStatus.Created,
          payment: Payment.Banking,
          payment_status: PaymentStatus.Unpaid,
        },
      });

      if (!orderInDb) {
        console.log('No banking order found');
        throw new RpcException('No banking order available');
      }

      const updatedOrderInDb = await this.updateOrderToCancelled(orderInDb.id);

      return updatedOrderInDb;
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot to find banking order by user id');
    }
  }

  async makePayment(id: string) {
    try {
      const orderCached: Order = await this.cacheManager.get(id);
      console.log('Payment - Order cached', orderCached);
      if (!orderCached) {
        throw new Error('There is no order available');
      }

      await this.orderRepository.save({
        ...orderCached,
        payment_status: PaymentStatus.Processing,
      });

      this.orchestrationClient.emit('orchestration.orders.paid', orderCached);
    } catch (error) {
      console.error(error);
    }
  }

  // dashboard
  async getNumberOrdersPerDay(dashboardDto: DashboardDto) {
    console.log('getNumberOrdersPerDay', dashboardDto);
    /* 
      SELECT COUNT(id) as value, to_char(created_at, 'yyyy-mm-dd') as label
      FROM public.orders
      WHERE created_at >= '2023-01-01 00:00:00' AND created_at <= '2023-12-31 23:59:59'
      GROUP BY label
      ORDER BY label ASC;
    */

    const { startDate, endDate, branch } = dashboardDto;

    try {
      const rawData = await this.orderRepository
        .createQueryBuilder('order')
        .select('COUNT(id)', 'value')
        .addSelect("to_char(created_at, 'yyyy-mm-dd')", 'label')
        .where('created_at >= :startDate', { startDate })
        .andWhere('created_at <= :endDate', { endDate })
        .andWhere(branch !== 'all' ? 'branch_id = :branch' : '1=1', { branch })
        .groupBy('label')
        .orderBy('label', 'ASC')
        .getRawMany();

      console.log('rawData', rawData);
      // print query
      // console.log('query', query.getQuery());

      return rawData;
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot get number orders per day');
    }
  }

  async getRevenuePerDay(dashboardDto: DashboardDto) {
    console.log('getRevenuePerDay', dashboardDto);
    /*
    SELECT to_char(created_at, 'yyyy-mm-dd') as label, SUM(order_details.quantity * products.price) as value
  FROM orders
	LEFT JOIN order_details
	ON "orders".id="order_details"."order_id"
	LEFT JOIN products
	ON "order_details".product_id=products.id
	WHERE created_at >= '2023-01-01 00:00:00' AND created_at <= '2023-08-29 23:59:59'
	GROUP BY label
    */
    const { startDate, endDate, branch } = dashboardDto;

    try {
      const rawData = await this.dataSource.query(
        `
        SELECT to_char(created_at, 'yyyy-mm-dd') as label, SUM(order_details.quantity * products.price) as value
        FROM orders
        LEFT JOIN order_details
        ON "orders".id="order_details"."order_id"
        LEFT JOIN products
        ON "order_details".product_id=products.id
        WHERE created_at >= '${startDate}' AND created_at <= '${endDate}'
        ${branch !== 'all' ? `AND branch_id = '${branch}'` : ''}
        GROUP BY label
        ORDER BY label ASC;
      `,
      );

      console.log('getRevenuePerDay', rawData);

      return rawData;
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot get hot selling product');
    }
  }
  async getHotSellingProduct(dashboardDto: DashboardDto) {
    console.log('getHotSellingProduct', dashboardDto);
    /*
    SELECT name as label, sum(quantity) as value
    FROM orders
    LEFT JOIN order_details
    ON "orders".id="order_details"."order_id"
	  LEFT JOIN products
    ON "products".id="order_details"."product_id"
    WHERE created_at >= '2023-01-01 00:00:00' AND created_at <= '2023-08-29 23:59:59'
    GROUP by name
    ORDER BY value desc
    */

    const { startDate, endDate, branch } = dashboardDto;

    try {
      const rawData = await this.dataSource.query(
        `
        SELECT name as label, sum(quantity) as value
        FROM orders
        LEFT JOIN order_details
        ON "orders".id="order_details"."order_id"
        LEFT JOIN products
        ON "products".id="order_details"."product_id"
        WHERE created_at >= '${startDate}' AND created_at <= '${endDate}'
        ${branch !== 'all' ? `AND branch_id = '${branch}'` : ''}
        GROUP by name
        ORDER BY value desc
      `,
      );

      return rawData;
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot get hot selling product');
    }
  }

  async getOrdersByPhone(phone: string) {
    console.log('getOrdersByPhone', phone);

    /*
    select status, sum(quantity * price) as total, CONCAT (street, ', ', ward, ', ', district, ', ', city) as address
    from orders
    left join order_details
    on orders.id = order_details.order_id
    left join address
    on orders.address_id = address.id
    left join products
    on order_details.product_id = products.id
    where phone = '0868738097'
    group by order_id, status, address, created_at
    order by created_at desc
    limit 5
    */

    try {
      const orders = await this.dataSource.query(
        `
        select status, sum(quantity * price) as total, CONCAT (street, ', ', ward, ', ', district, ', ', city) as address
        from orders
        left join order_details
        on orders.id = order_details.order_id
        left join address
        on orders.address_id = address.id
        left join products
        on order_details.product_id = products.id
        where phone = '${phone}'
        group by order_id, status, address, created_at
        order by created_at desc
        limit 5
      `,
      );

      return orders;
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot get orders by phone');
    }
  }
}
