import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { configValidationSchema } from './config/validate-env';
import { PostgresModule } from './database/postgres.module';
// import { RedisModule } from './database/redis.module';
import { OrdersModule } from './orders/orders.module';
import { AddressModule } from './address/address.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', `.env.${process.env.STAGE}`],
      validationSchema: configValidationSchema,
      isGlobal: true,
    }),
    PostgresModule,
    // RedisModule,
    OrdersModule,
    AddressModule,
    ProductModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
