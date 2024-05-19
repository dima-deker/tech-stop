import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { UsersService } from 'modules/user/users.service';
import { ProductsService } from 'modules/products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderedProduct } from './types';
import { UniqueOTP } from 'unique-string-generator';
import { OrderDocument } from './schemas/order.shema';
import exceptionMessages from 'constants/exceptionMessages';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Types } from 'mongoose';

@Injectable()
export class OrdersService {
  constructor(
    private ordersRepository: OrdersRepository,
    private usersService: UsersService,
    private productsService: ProductsService,
  ) {}

  // #################### CREATE NEW ORDER ####################
  async create(dto: CreateOrderDto) {
    // generated order code with 7 characters
    const orderCode = await this.generateUniqueOrderCode();

    // filtered products in ProductDocument format
    const filteredProducts = (await this.productsService.getList({ _id: dto.products.map((p) => p.productId) })).map(
      ({ title, price, poster, _id }) => ({ title, price, poster, _id }),
    );

    // formated product to save in order table
    console.log(filteredProducts)

    const products = filteredProducts.map((product) => {
      const quantity = dto.products.find(({ productId }) => {return product._id.equals(productId)}).quantity//new Types.ObjectId(productId) === product._id)//.quantity;
      return { ...product, quantity };
    });

    const order = await this.ordersRepository.create({ ...dto, orderCode, products });
    return order;
  }

  // #################### GET ORDER LIST ####################
  async getList(): Promise<OrderDocument[]> {
    return await this.ordersRepository.getList({});
  }

  // #################### DELETE ORDER BY ID ####################
  async delete(orderCode: number): Promise<OrderDocument> {
    return await this.ordersRepository.delete({ orderCode });
  }

  // #################### UPDATE PRODUCT BY ID ####################
  async update(orderCode: number, dto: UpdateOrderDto): Promise<OrderDocument> {
    return await this.ordersRepository.update({ orderCode }, dto);
  }

  // #################### GET ONE ORDER BY ORDERCODE ####################
  async getOneByOrderCode(orderCode: number): Promise<OrderDocument> {
    const order = await this.ordersRepository.getOne({ orderCode });
    if (!order) {
      throw new NotFoundException(exceptionMessages.NOT_FOUND_ORDER_MSG);
    }

    return order;
  }

  // #################### GENERATE UNIQUE ORDER CODE ####################
  private async generateUniqueOrderCode(): Promise<string> {
    let order: OrderDocument | null;
    let orderCode: string;

    do {
      orderCode = UniqueOTP(7);
      order = await this.ordersRepository.getOne({ orderCode });
    } while (order !== null);

    return orderCode.toString();
  }
}
