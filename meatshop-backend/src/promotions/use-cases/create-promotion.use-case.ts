import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitPermission } from '../../common/enums/unit-permission.enum';
import { Product } from '../../products/entities/product.entity';
import { Unit } from '../../units/entities/unit.entity';
import { UnitAuthorizationService } from '../../units/services/unit-authorization.service';
import { User } from '../../users/entities/user.entity';
import { CreatePromotionDto } from '../dtos/create-promotion.dto';
import { Promotion } from '../entities/promotion.entity';

@Injectable()
export class CreatePromotionUseCase {
  private readonly logger = new Logger(CreatePromotionUseCase.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly unitAuthorizationService: UnitAuthorizationService,
  ) {}

  async execute(dto: CreatePromotionDto, currentUser: User): Promise<Promotion> {
    const unit = await this.unitRepository.findOne({ where: { id: dto.unit_id } });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    await this.unitAuthorizationService.assertHasPermission(
      currentUser,
      unit.id,
      UnitPermission.MANAGE_PRODUCTS,
    );
    await this.ensureProductBelongsToUnit(dto.product_id, dto.unit_id);
    this.assertValidPeriod(dto.starts_at, dto.ends_at);

    const promotion = this.promotionRepository.create({
      ...dto,
      starts_at: new Date(dto.starts_at),
      ends_at: new Date(dto.ends_at),
      created_by: currentUser.id,
    });
    await this.promotionRepository.save(promotion);

    this.logger.log(`Promotion ${promotion.id} created by user ${currentUser.id}`);

    return promotion;
  }

  private async ensureProductBelongsToUnit(productId: number, unitId: number): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product || product.unit_id !== unitId) {
      throw new NotFoundException('Product not found for this unit');
    }
  }

  private assertValidPeriod(startsAt: string, endsAt: string): void {
    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new BadRequestException('ends_at must be after starts_at');
    }
  }
}
