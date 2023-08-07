import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { instanceToPlain } from 'class-transformer';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { OrderStatus } from '~/shared';
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

@Injectable()
export class OrdersService {
  constructor(
    @Inject('ORCHESTRATION_SERVICE')
    private readonly orchestrationClient: ClientKafka,

    @Inject('CART_SERVICE')
    private readonly cartClient: ClientKafka,

    @Inject('RATE_SERVICE')
    private readonly rateClient: ClientKafka,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    console.log('createOrderDto', createOrderDto);
    try {
      const order = this.orderRepository.create({
        ...createOrderDto,
      });

      console.log('newOrder', order);

      await this.orderRepository.save(order);

      this.orchestrationClient.emit(
        'orchestration.orders.created',
        instanceToPlain(order),
      );

      this.cartClient.emit('carts.orders.clean', createOrderDto.username);

      return order;
    } catch (err) {
      console.error(err);
      throw new RpcException(err.message);
    }
  }

  async findAll(findAllOrderDto: FindAllOrderDto) {
    console.log('findAllOrderDto', findAllOrderDto);
    try {
      const { user_id, status } = findAllOrderDto;

      if (status === 'all') {
        const orders = await this.orderRepository.find({
          relations: {
            order_details: {
              product: true,
            },
            address: true,
          },
          where: {
            user_id,
          },
          order: {
            created_at: 'DESC',
          },
        });

        return instanceToPlain(orders);
      }

      const orders = await this.orderRepository.find({
        relations: {
          order_details: {
            product: true,
          },
          address: true,
        },
        where: {
          user_id,
          status,
        },
        order: {
          created_at: 'DESC',
        },
      });

      return instanceToPlain(orders);
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot find orders');
    }
  }

  async findAllByUserId(userId: string) {
    try {
      return await this.orderRepository.find({
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
    const order = await this.orderRepository.findOne({
      where: {
        id: cancelOrderDto.order_id,
        user_id: cancelOrderDto.user_id,
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
      !(
        order.status === OrderStatus.Created ||
        order.status === OrderStatus.Approved
      )
    ) {
      throw new RpcException('Cannot cancel order');
    }

    try {
      order.status = OrderStatus.Cancelled;
      order.cancelled_date = new Date();
      order.cancelled_by = cancelOrderDto.user_id;

      await this.orderRepository.save(order);

      return instanceToPlain(order);
    } catch (error) {
      console.error(error);
      throw new RpcException('Failed to cancel order');
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

      console.log('order', order);

      // should be transaction update stock

      await this.orderRepository.save(order);

      // update stock
      this.orchestrationClient.emit(
        'orchestration.orders.approved_by_employee',
        {
          order_id: order.id,
          order_details: order.order_details.map((order_detail) => ({
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
    console.log('getOrdersByShipperDto', getOrdersByShipperDto);

    const { status, phone, branch_id } = getOrdersByShipperDto;

    try {
      const orders = await this.orderRepository.find({
        where: {
          status,
          branch_id,
          ...(getOrdersByShipperDto.status !== OrderStatus.Packaged && {
            started_by: phone,
          }),
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
        skip: (getOrdersByShipperDto.page - 1) * 6,
        take: 6,
      });
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

      const newOrder = {
        ...order,
        status: OrderStatus.Packaged,
        packaged_date: new Date(),
        packaged_by: 'BOT',
        approved_date: order.approved_date ? order.approved_date : new Date(),
        approved_by: order.approved_by ? order.approved_by : 'BOT',
      };

      return await this.orderRepository.save(newOrder);
    } catch (error) {
      console.error(error);
      console.error('Cannot update order to Packaged');
    }
  }

  async updateOrderToCancelled(id: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: {
          id,
        },
      });

      if (!order) {
        throw new RpcException(`Cannot find order with id(${id})`);
      }

      return await this.orderRepository.save({
        ...order,
        status: OrderStatus.Cancelled,
        cancelled_date: new Date(),
        cancelled_by: 'BOT',
      });
    } catch (error) {
      console.error(error);
      console.error('Cannot update order to Cancelled');
    }
  }

  // dashboard
  async getNumberOrdersPerDay(dashboardDto: DashboardDto) {
    /* 
      SELECT COUNT(id) as value, to_char(created_at, 'yyyy-mm-dd') as label
      FROM public.orders
      WHERE created_at >= '2023-01-01 00:00:00' AND created_at <= '2023-12-31 23:59:59'
      GROUP BY label
      ORDER BY label ASC;
    */

    const { startDate, endDate } = dashboardDto;

    try {
      return await this.orderRepository
        .createQueryBuilder('order')
        .select('COUNT(order.id)', 'value')
        .addSelect("to_char(order.created_at, 'yyyy-mm-dd')", 'label')
        .where('order.created_at >= :startDate', { startDate })
        .andWhere('order.created_at <= :endDate', { endDate })
        .groupBy('label')
        .orderBy('label', 'ASC')
        .limit(30)
        .getRawMany();
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot get number orders per day');
    }
  }

  async getRevenuePerDay(dashboardDto: DashboardDto) {
    /*
    SELECT to_char(created_at, 'yyyy-mm-dd') as created, order_details.product_id, SUM(order_details.quantity) as total 
    FROM public.orders
    LEFT JOIN public.order_details
    ON "orders".id="order_details"."order_id"
    WHERE created_at >= '2023-01-01 00:00:00' AND created_at <= '2023-08-29 23:59:59'
    GROUP BY created, order_details.product_id
    */
    const { startDate, endDate } = dashboardDto;

    try {
      const rawData = await this.orderRepository
        .createQueryBuilder('order')
        .select('order_details.product_id', 'product_id')
        .addSelect('SUM(order_details.quantity)', 'value')
        .addSelect("to_char(order.created_at, 'yyyy-mm-dd')", 'label')
        .leftJoin('order.order_details', 'order_details')
        .where('order.created_at >= :startDate', { startDate })
        .andWhere('order.created_at <= :endDate', { endDate })
        .groupBy('label, order_details.product_id')
        .orderBy('value', 'ASC')
        .limit(30)
        .getRawMany();

      return rawData;
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot get hot selling product');
    }
  }
  async getHotSellingProduct(dashboardDto: DashboardDto) {
    /*
    SELECT order_details.product_id, SUM(order_details.quantity) as total_quantity 
    FROM public.orders
    LEFT JOIN public.order_details
    ON "orders".id="order_details"."order_id"
    WHERE created_at >= '2023-01-01 00:00:00' AND created_at <= '2023-08-29 23:59:59'
    GROUP BY order_details.product_id
    */

    const { startDate, endDate } = dashboardDto;

    try {
      const rawData = await this.orderRepository
        .createQueryBuilder('order')
        .select('order_details.product_id', 'label')
        .addSelect('SUM(order_details.quantity)', 'value')
        .leftJoin('order.order_details', 'order_details')
        .where('order.created_at >= :startDate', { startDate })
        .andWhere('order.created_at <= :endDate', { endDate })
        .groupBy('order_details.product_id')
        .orderBy('value', 'DESC')
        .limit(30)
        .getRawMany();

      return rawData;
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot get hot selling product');
    }
  }
}
