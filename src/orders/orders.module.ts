import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { AddressModule } from '~/address/address.module';
import { ProductModule } from '~/product/product.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderDetail]),
    ClientsModule.registerAsync([
      /* {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: 'PRODUCT_SERVICE',
        useFactory: async (configService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'product',
              brokers: [
                `${configService.get('KAFKA_HOST')}:${configService.get(
                  'KAFKA_PORT',
                )}`,
              ],
            },
            consumer: {
              groupId: 'product-consumer',
            },
          },
        }),
      }, */
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: 'ORCHESTRATION_SERVICE',
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'orders-orchestration',
              brokers: [
                `${configService.get('KAFKA_HOST')}:${configService.get(
                  'KAFKA_PORT',
                )}`,
              ],
            },
            consumer: {
              groupId: 'orchestration-consumer-orders',
            },
          },
        }),
      },
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: 'RATE_SERVICE',
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'rate-orders',
              brokers: [
                `${configService.get('KAFKA_HOST')}:${configService.get(
                  'KAFKA_PORT',
                )}`,
              ],
            },
            consumer: {
              groupId: 'rate-consumer',
            },
          },
        }),
      },
      {
        name: 'CART_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService) => {
          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'carts-rate',
                brokers: [
                  `${configService.get('KAFKA_HOST')}:${configService.get(
                    'KAFKA_PORT',
                  )}`,
                ],
              },
              consumer: {
                groupId: 'carts-consumer',
              },
            },
          };
        },
      },
    ]),
    ProductModule,
    AddressModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
