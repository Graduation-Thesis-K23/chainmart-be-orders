import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductService } from './product.service';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern('orders.product.created')
  create(@Payload() createProductDto: any) {
    return this.productService.create(createProductDto);
  }
}
