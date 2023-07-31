import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { instanceToPlain } from 'class-transformer';
import { firstValueFrom, lastValueFrom, timeout } from 'rxjs';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { OrderStatus } from 'src/shared';
import { DashboardDto } from './dto/dashboard.to';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('ORCHESTRATION_SERVICE')
    private readonly orchestrationClient: ClientKafka,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    try {
      // Default ship day is the next day
      const estimated_shipped_date = moment()
        .add(1, 'days')
        .format('YYYY-MM-DD');

      const order = this.orderRepository.create({
        ...createOrderDto,
        estimated_shipped_date,
      });

      await this.orderRepository.save(order);

      this.orchestrationClient.emit(
        'orchestration.orders.created',
        instanceToPlain(order),
      );

      return order;
    } catch (err) {
      console.error(err);
      throw new RpcException(err.message);
    }
  }

  async findAll() {
    try {
      return await this.orderRepository.find({
        relations: {
          order_details: true,
        },
      });
    } catch (error) {
      console.error(error);
      throw new RpcException('Cannot find orders');
    }
  }

  async findAllByUserId(userId: string) {
    try {
      return await this.orderRepository.find({
        relations: {
          order_details: true,
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
          order_details: true,
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

      return await this.orderRepository.save({
        ...order,
        ...updateOrderDto,
      });
    } catch (error) {
      console.error(error);
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

  async updateOrderToPackaged(id: string) {
    try {
      await this.update(id, {
        status: OrderStatus.Packaged,
      });
    } catch (error) {
      console.error(error);
      console.error('Cannot update order to Packaged');
    }
  }

  async updateOrderToCancelled(id: string) {
    try {
      await this.update(id, {
        status: OrderStatus.Cancelled,
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
