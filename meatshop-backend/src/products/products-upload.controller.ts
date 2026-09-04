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
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
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

const PRODUCT_IMAGES_DIR = path.join(process.cwd(), 'uploads', 'products');
const MAX_FILES_PER_UPLOAD = 10;

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}
ensureDir(PRODUCT_IMAGES_DIR);

function safeFileName(originalName: string) {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const base = originalName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-_]/g, '');
  return `${timestamp}-${random}-${base}`;
}

function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
    return cb(new BadRequestException('Tipo de imagem inválido'), false);
  }
  cb(null, true);
}

@ApiTags('Products')
@Controller('products')
export class ProductsUploadController {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductImage) private readonly productImages: Repository<ProductImage>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  @Post(':id/images')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Envia uma ou mais imagens para a galeria do produto' })
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
  @ApiResponse({ status: 201, description: 'Imagens enviadas com sucesso' })
  @ApiResponse({ status: 400, description: 'Nenhum arquivo válido enviado' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade do produto' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, PRODUCT_IMAGES_DIR),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB por arquivo
    }),
  )
  async uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produto não encontrado');

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      product.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );

    const created = await this.productImages.save(
      files.map((file) =>
        this.productImages.create({
          product_id: product.id,
          image_url: `/uploads/products/${file.filename}`,
        }),
      ),
    );

    await this.syncCoverImage(product.id);

    return { ok: true, images: created };
  }

  @Delete(':id/images/:imageId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove uma imagem da galeria do produto' })
  @ApiResponse({ status: 200, description: 'Imagem removida com sucesso' })
  @ApiResponse({ status: 403, description: 'Usuário não administra a unidade do produto' })
  @ApiResponse({ status: 404, description: 'Imagem não encontrada' })
  async deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() currentUser: User,
  ) {
    const image = await this.productImages.findOne({ where: { id: imageId, product_id: id } });
    if (!image) throw new NotFoundException('Imagem não encontrada');

    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produto não encontrado');

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      product.unit_id,
      UnitPermission.MANAGE_PRODUCTS,
    );

    await this.productImages.remove(image);
    await this.syncCoverImage(id);

    const filePath = path.join(PRODUCT_IMAGES_DIR, path.basename(image.image_url));
    fs.promises.unlink(filePath).catch(() => {
      // Arquivo já pode ter sido removido; a linha do banco é a fonte da verdade.
    });

    return { ok: true };
  }

  /** Mantém `Product.image_url` (capa, usada por telas/consumidores fora da galeria) sincronizada com a primeira imagem. */
  private async syncCoverImage(productId: number): Promise<void> {
    const [firstImage] = await this.productImages.find({
      where: { product_id: productId },
      order: { id: 'ASC' },
      take: 1,
    });
    await this.products.update({ id: productId }, { image_url: firstImage?.image_url ?? null });
  }
}
