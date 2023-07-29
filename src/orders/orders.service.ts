import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import * as moment from 'moment';
import { instanceToPlain } from 'class-transformer';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { OrderStatus } from 'src/shared';

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
}
