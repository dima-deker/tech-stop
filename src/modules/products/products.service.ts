import { Express } from 'express';
import { Injectable, NotFoundException } from '@nestjs/common';

import { ProductsRepository } from './products.repository';
import { CategoriesService } from './../categories/categories.service';
import { FileType, FilesService } from 'modules/files/files.service';

import { ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import exceptionMessages from 'constants/exceptionMessages';
import { Filter, Params, Rating } from './types';

@Injectable()
export class ProductsService {
  constructor(
    private productsRepository: ProductsRepository,
    private categoriesService: CategoriesService,
    private filesService: FilesService,
  ) {}

  // #################### CREATE NEW PRODUCT ####################
  async create(dto: CreateProductDto): Promise<ProductDocument> {
    await this.checkingCategories(dto.categories);
    return await this.productsRepository.create(dto);
  }

  // #################### UPDATE PRODUCT BY ID ####################
  async update(id: number, dto: UpdateProductDto): Promise<ProductDocument> {
    if (dto.hasOwnProperty('categories')) {
      await this.checkingCategories(dto.categories);
    }
    return await this.productsRepository.update({ id }, dto);
  }

  // #################### DELETE PRODUCT BY ID ####################
  async delete(id: number): Promise<ProductDocument> {
    return await this.productsRepository.delete({ id });
  }

  // #################### GET ONE PRODUCT BY ID ####################
  async getOneById(id: number): Promise<ProductDocument> {
    const product = await this.productsRepository.getOne({ id });
    if (!product) {
      throw new NotFoundException(exceptionMessages.NOT_FOUND_PRODUCT_MSG);
    }

    return product;
  }

  // #################### GET PRODUCT LIST ####################
  async getList(filter?: Filter): Promise<ProductDocument[]> {
    return await this.productsRepository.getList(filter);
  }

  // #################### SET FILTER ####################
  setFilter(params: Params): Filter {
    const filter = Object.entries(params).reduce((prev, [param, valueOfParam]) => {
      switch (param) {
        case 'id':
          prev[param] = { $in: valueOfParam.split(',').map((i) => Number(i)) };
          break;

        case 'category':
          prev['categories'] = valueOfParam;
          break;

        default:
          prev[param] = valueOfParam;
          break;
      }

      return prev;
    }, {});

    return filter;
  }

  // #################### UPLOAD POSTER TO PRODUCT ####################
  async uploadPoster(id: number, poster: Express.Multer.File): Promise<ProductDocument> {
    // check product exist
    const product = await this.getOneById(id);

    // check product already have poster
    if (product.poster) {
      // remove old poster from cloud service
      await this.filesService.removeFile(product.poster);
    }

    // upload new posetr to cloud service
    const filePath = await this.filesService.uploadFile(FileType.POSTERS, poster);

    // save path to poster in DB
    product.poster = filePath;
    return await product.save();
  }

  // #################### ADD CATEGORIES TO PRODUCT ####################
  // async addCategories(id: number, categorySlug: string): Promise<ProductDocument> {
  //   const product = await this.getOneById(id);
  //   // const category = await this.categoriesService.getOneBySlug(categorySlug);

  //   product.category = category;
  //   return await product.save();
  // }

  // #################### RATE PRODUCT ####################
  async updateRating(id: number, value: number): Promise<Rating> {
    const product = await this.getOneById(id);

    // change product rating by star value
    product.rating[value] += 1;
    await product.save();

    // count product rating
    let votes = 0;
    let sumOfValues = 0;
    for (let prop = 1; prop <= 5; prop += 1) {
      votes += product.rating[prop];
      sumOfValues += product.rating[prop] * prop;
    }
    const rating = sumOfValues / votes;

    return { rating };
  }

  // #################### CHECKING CATEGORY BY SLUG ####################
  private async checkingCategories(categories: string[]): Promise<void> {
    for (let i = 0; i < categories.length; i++) {
      await this.categoriesService.getOneBySlug(categories[i]);
    }
  }
}
