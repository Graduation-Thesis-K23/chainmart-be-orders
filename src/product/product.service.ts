import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    console.log('orders.product.created', createProductDto);
    const newProduct = this.productRepository.create(createProductDto);

    await this.productRepository.save(newProduct);
  }

  async getProductsByIds(ids: string[]) {
    console.log('orders.product.getProductsByIds', ids);

    const products = await this.productRepository.find({
      where: {
        id: In(ids),
      },
    });

    if (!products) {
      throw new Error('Products not found');
    }

    // return name list
    return products.map((product) => product.slug.replace(/-/g, ' '));
  }
}
