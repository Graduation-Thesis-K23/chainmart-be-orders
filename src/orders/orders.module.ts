import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { AddressModule } from '~/address/address.module';
import { ProductModule } from '~/product/product.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderDetail]),
    CacheModule.register(),
    ClientsModule.registerAsync([
      {
        name: 'SEARCH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'orders-search',
              brokers: configService.get('KAFKA_BROKERS').split(','),
            },
            consumer: {
              groupId: 'search-consumer',
            },
          },
        }),
      },
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: 'ORCHESTRATION_SERVICE',
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'orders-orchestration',
              brokers: configService.get('KAFKA_BROKERS').split(','),
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
              brokers: configService.get('KAFKA_BROKERS').split(','),
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
                brokers: configService.get('KAFKA_BROKERS').split(','),
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
