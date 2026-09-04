import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { AddressLabel } from '../../common/enums/address-label.enum';
import { AppProfile } from '../../common/enums/app-profile.enum';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { LocalRole } from '../../common/enums/local-role.enum';
import { UserUnitStatus } from '../../common/enums/user-unit-status.enum';
import { DeliveryPerson } from '../../delivery/entities/delivery-person.entity';
import { Vehicle } from '../../delivery/entities/vehicle.entity';
import { DeliveryAffiliationType } from '../../delivery/enums/delivery-affiliation-type.enum';
import { DeliveryMode } from '../../delivery/enums/delivery-mode.enum';
import { DeliveryPersonStatus } from '../../delivery/enums/delivery-person-status.enum';
import { VehicleType } from '../../delivery/enums/vehicle-type.enum';
import { Product } from '../../products/entities/product.entity';
import { Stock } from '../../products/entities/stock.entity';
import { Coupon } from '../../promotions/entities/coupon.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { CouponDiscountType } from '../../promotions/enums/coupon-discount-type.enum';
import { CouponType } from '../../promotions/enums/coupon-type.enum';
import { BusinessHours } from '../../units/entities/business-hours.entity';
import { Unit } from '../../units/entities/unit.entity';
import { UserUnit } from '../../units/entities/user-unit.entity';
import { Weekday } from '../../units/enums/weekday.enum';
import { Address } from '../../users/entities/address.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Address) private readonly addresses: Repository<Address>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(UserUnit)
    private readonly memberships: Repository<UserUnit>,
    @InjectRepository(BusinessHours)
    private readonly hours: Repository<BusinessHours>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Stock) private readonly stocks: Repository<Stock>,
    @InjectRepository(Promotion)
    private readonly promotions: Repository<Promotion>,
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectRepository(DeliveryPerson)
    private readonly deliveryPeople: Repository<DeliveryPerson>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_ENABLED !== 'true') {
      this.logger.log('Development seed disabled');
      return;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Development seed cannot run with NODE_ENV=production');
    }
    await this.seed();
    this.logger.log('Idempotent development dataset is ready');
  }

  private async seed(): Promise<void> {
    const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD ?? 'MeatshopDev123!', 12);
    const admin = await this.ensureUser(
      'admin@meatshop.local',
      'Administrador MeatShop',
      '52998224725',
      '62999990001',
      passwordHash,
      AppProfile.BOTH,
      GlobalRole.SUPER_ADMIN,
      process.env.SEED_ADMIN_FIREBASE_UID,
    );
    const owner = await this.ensureUser(
      'owner@meatshop.local',
      'Proprietário Demonstração',
      '16899535009',
      '62999990002',
      passwordHash,
      AppProfile.BOTH,
      GlobalRole.USER,
      process.env.SEED_OWNER_FIREBASE_UID,
    );
    const client = await this.ensureUser(
      'client@meatshop.local',
      'Cliente Demonstração',
      '11144477735',
      '62999990003',
      passwordHash,
      AppProfile.CLIENT,
      GlobalRole.USER,
      process.env.SEED_CLIENT_FIREBASE_UID,
    );
    const courier = await this.ensureUser(
      'delivery@meatshop.local',
      'Entregador Demonstração',
      '12345678909',
      '62999990004',
      passwordHash,
      AppProfile.DELIVERY,
      GlobalRole.USER,
      process.env.SEED_DELIVERY_FIREBASE_UID,
    );
    const pendingCourier = await this.ensureUser(
      'delivery.pending@meatshop.local',
      'Entregador Pendente',
      '98765432100',
      '62999990005',
      passwordHash,
      AppProfile.DELIVERY,
      GlobalRole.USER,
      process.env.SEED_PENDING_DELIVERY_FIREBASE_UID,
    );
    await this.ensureAddress(client.id);
    const unit = await this.ensureUnit(owner.id);
    await this.ensureMembership(owner.id, unit.id, LocalRole.OWNER);
    await this.ensureMembership(admin.id, unit.id, LocalRole.MANAGER);
    await this.ensureHours(unit.id);
    const beef = await this.ensureCategory(unit.id, 'Bovinos');
    const poultry = await this.ensureCategory(unit.id, 'Aves');
    const sellable = await this.ensureProduct(unit.id, beef.id, 'Alcatra bovina', 49.9, true, 25);
    await this.ensureProduct(unit.id, beef.id, 'Produto sem estoque', 35, true, 0);
    await this.ensureProduct(unit.id, poultry.id, 'Peito de frango', 22.9, true, 18);
    await this.ensureProduct(unit.id, poultry.id, 'Produto inativo', 15, false, 10);
    await this.ensurePromotion(unit.id, sellable.id, owner.id);
    await this.ensureCoupons(unit.id, owner.id);
    await this.ensureCourier(courier.id, DeliveryPersonStatus.ACTIVE, 'DEV3A00');
    await this.ensureCourier(pendingCourier.id, DeliveryPersonStatus.PENDING, 'DEV3P00');
  }

  private async ensureUser(
    email: string,
    name: string,
    cpf: string,
    phone: string,
    passwordHash: string,
    profile: AppProfile,
    role: GlobalRole,
    firebaseUid?: string,
  ): Promise<User> {
    const existing = await this.users.findOne({ where: { email } });
    if (existing) return existing;
    return this.users.save(
      this.users.create({
        name,
        email,
        cpf,
        phone,
        password_hash: passwordHash,
        firebase_uid: firebaseUid || null,
        global_role: role,
        app_profile: profile,
        profile_complete: true,
        is_active: true,
        failed_login_attempts: 0,
        locked_until: null,
        email_verified: true,
        email_verification_token: null,
        password_reset_token: null,
        password_reset_expires_at: null,
        avatar_url: null,
      }),
    );
  }

  private async ensureAddress(userId: number): Promise<void> {
    if (
      await this.addresses.findOne({
        where: { user_id: userId, is_default: true },
      })
    )
      return;
    await this.addresses.save(
      this.addresses.create({
        user_id: userId,
        street: 'Rua de Desenvolvimento',
        number: '100',
        complement: null,
        neighborhood: 'Centro',
        city: 'Goiânia',
        state: 'GO',
        zip_code: '74000000',
        label: AddressLabel.HOME,
        is_default: true,
        latitude: -16.6869,
        longitude: -49.2648,
      }),
    );
  }

  private async ensureUnit(adminId: number): Promise<Unit> {
    const existing = await this.units.findOne({
      where: { cnpj: '11222333000181' },
    });
    if (existing) return existing;
    return this.units.save(
      this.units.create({
        name: 'Açougue Demonstração',
        cnpj: '11222333000181',
        city: 'Goiânia',
        zip_code: '74000000',
        state: 'GO',
        street: 'Avenida de Desenvolvimento',
        number: '200',
        complement: null,
        neighborhood: 'Centro',
        latitude: -16.6869,
        longitude: -49.2648,
        image_url: null,
        cover_url: null,
        admin_id: adminId,
      }),
    );
  }

  private async ensureMembership(
    userId: number,
    unitId: number,
    localRole: LocalRole,
  ): Promise<void> {
    if (
      await this.memberships.findOne({
        where: { user_id: userId, unit_id: unitId },
      })
    )
      return;
    await this.memberships.save(
      this.memberships.create({
        user_id: userId,
        unit_id: unitId,
        local_role: localRole,
        status: UserUnitStatus.ACTIVE,
      }),
    );
  }

  private async ensureHours(unitId: number): Promise<void> {
    for (const weekday of Object.values(Weekday)) {
      if (await this.hours.findOne({ where: { unit_id: unitId, weekday } })) continue;
      const sunday = weekday === Weekday.SUNDAY;
      await this.hours.save(
        this.hours.create({
          unit_id: unitId,
          weekday,
          opening_time: sunday ? null : '08:00:00',
          closing_time: sunday ? null : '18:00:00',
          is_open: !sunday,
        }),
      );
    }
  }

  private async ensureCategory(unitId: number, name: string): Promise<Category> {
    const existing = await this.categories.findOne({
      where: { unit_id: unitId, name },
    });
    return (
      existing ??
      this.categories.save(
        this.categories.create({
          unit_id: unitId,
          name,
          description: 'Dados sintéticos',
          active: true,
        }),
      )
    );
  }

  private async ensureProduct(
    unitId: number,
    categoryId: number,
    name: string,
    price: number,
    active: boolean,
    quantity: number,
  ): Promise<Product> {
    let product = await this.products.findOne({
      where: { unit_id: unitId, name },
    });
    product ??= await this.products.save(
      this.products.create({
        unit_id: unitId,
        category_id: categoryId,
        name,
        description: 'Produto sintético para homologação',
        price,
        unit_of_measure: 'kg',
        active,
        brand: 'MeatShop Dev',
        image_url: null,
      }),
    );
    if (!(await this.stocks.findOne({ where: { product_id: product.id } }))) {
      await this.stocks.save(
        this.stocks.create({
          product_id: product.id,
          quantity,
          min_quantity: 2,
        }),
      );
    }
    return product;
  }

  private async ensurePromotion(
    unitId: number,
    productId: number,
    createdBy: number,
  ): Promise<void> {
    if (
      await this.promotions.findOne({
        where: { unit_id: unitId, title: 'Oferta de desenvolvimento' },
      })
    )
      return;
    const now = Date.now();
    await this.promotions.save(
      this.promotions.create({
        unit_id: unitId,
        product_id: productId,
        created_by: createdBy,
        title: 'Oferta de desenvolvimento',
        description: 'Promoção sintética vigente',
        discount_percentage: 10,
        promotional_price: null,
        starts_at: new Date(now - 86400000),
        ends_at: new Date(now + 30 * 86400000),
        active: true,
      }),
    );
  }

  private async ensureCoupons(unitId: number, createdBy: number): Promise<void> {
    const now = Date.now();
    for (const item of [
      { code: 'DEV10', active: true, starts: -1, ends: 30 },
      { code: 'EXPIRADO10', active: false, starts: -30, ends: -1 },
    ]) {
      if (await this.coupons.findOne({ where: { code: item.code } })) continue;
      await this.coupons.save(
        this.coupons.create({
          code: item.code,
          name: `Cupom ${item.code}`,
          description: 'Cupom sintético',
          type: CouponType.UNIT,
          unit_id: unitId,
          discount_type: CouponDiscountType.PERCENTAGE,
          discount_amount: 10,
          maximum_discount: 25,
          minimum_order_value: 50,
          starts_at: new Date(now + item.starts * 86400000),
          expires_at: new Date(now + item.ends * 86400000),
          total_usage_limit: 100,
          usage_limit_per_user: 1,
          current_usage_count: 0,
          active: item.active,
          created_by: createdBy,
        }),
      );
    }
  }

  private async ensureCourier(
    userId: number,
    status: DeliveryPersonStatus,
    plate: string,
  ): Promise<void> {
    let profile = await this.deliveryPeople.findOne({
      where: { user_id: userId },
    });
    profile ??= await this.deliveryPeople.save(
      this.deliveryPeople.create({
        user_id: userId,
        vehicle: DeliveryMode.MOTORCYCLE,
        status,
        affiliation_type: DeliveryAffiliationType.AUTONOMOUS,
        average_rating: null,
        is_online: false,
        availability_updated_at: null,
      }),
    );
    if (await this.vehicles.findOne({ where: { delivery_person_id: profile.id } })) return;
    await this.vehicles.save(
      this.vehicles.create({
        delivery_person_id: profile.id,
        type: VehicleType.MOTORCYCLE,
        model: 'Moto de desenvolvimento',
        plate,
        color: 'Vermelha',
        year: 2026,
        is_active: true,
        is_enabled: true,
        photo_urls: [],
      }),
    );
  }
}
