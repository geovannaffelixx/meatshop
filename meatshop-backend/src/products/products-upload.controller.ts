import type { Express } from 'express';
import {
  BadRequestException,
  Controller,
  Delete,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UnitPermission } from '../common/enums/unit-permission.enum';
import { User } from '../users/entities/user.entity';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { UnitAuthorizationService } from '../units/services/unit-authorization.service';
import { MediaStorageService } from '../storage/media-storage.service';

const MAX_FILES_PER_UPLOAD = 10;

function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
    return cb(new BadRequestException('Invalid image type'), false);
  }
  cb(null, true);
}

@ApiTags('Products')
@Controller('products')
export class ProductsUploadController {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImages: Repository<ProductImage>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
    private readonly storage: MediaStorageService,
  ) {}

  @Post(':id/images')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Uploads one or more images to the product gallery',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Images uploaded successfully' })
  @ApiResponse({ status: 400, description: 'No valid file provided' })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the product unit',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No file provided');
    }

    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      product.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );

    const uploadedUrls: string[] = [];
    try {
      for (const file of files) uploadedUrls.push(await this.storage.upload(file, 'products'));
    } catch (error) {
      await Promise.all(uploadedUrls.map((url) => this.storage.delete(url)));
      throw error;
    }
    const created = await this.productImages.save(
      uploadedUrls.map((imageUrl) =>
        this.productImages.create({
          product_id: product.id,
          image_url: imageUrl,
        }),
      ),
    );

    await this.syncCoverImage(product.id);

    return { ok: true, images: created };
  }

  @Delete(':id/images/:imageId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Removes an image from the product gallery' })
  @ApiResponse({ status: 200, description: 'Image removed successfully' })
  @ApiResponse({
    status: 403,
    description: 'User does not manage the product unit',
  })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() currentUser: User,
  ) {
    const image = await this.productImages.findOne({
      where: { id: imageId, product_id: id },
    });
    if (!image) throw new NotFoundException('Image not found');

    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      product.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );

    await this.productImages.remove(image);
    await this.syncCoverImage(id);

    await this.storage.delete(image.image_url);
    return { ok: true };
  }

  private async syncCoverImage(productId: number): Promise<void> {
    const [firstImage] = await this.productImages.find({
      where: { product_id: productId },
      order: { id: 'ASC' },
      take: 1,
    });
    await this.products.update({ id: productId }, { image_url: firstImage?.image_url ?? null });
  }
}
