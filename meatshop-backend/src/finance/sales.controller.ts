import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GlobalRole } from '../common/enums/global-role.enum';
import { Sale } from './entities/sale.entity';

@ApiTags('Sales')
@Controller('sales')
export class SalesController {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Lists currently active sales' })
  @ApiQuery({
    name: 'now',
    required: false,
    description: 'ISO 8601 reference date (default: now)',
  })
  @ApiResponse({
    status: 200,
    description: 'Active sales list returned successfully',
  })
  @Get()
  async listActive(@Query('now') nowISO?: string) {
    const now = nowISO ? new Date(nowISO) : new Date();

    const rows = await this.saleRepo.find({
      where: [
        { active: true, startsAt: undefined, endsAt: undefined },
        { active: true, startsAt: undefined, endsAt: MoreThanOrEqual(now) },
        { active: true, startsAt: LessThanOrEqual(now), endsAt: undefined },
        {
          active: true,
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThanOrEqual(now),
        },
      ],
      order: { updatedAt: 'DESC' },
      take: 20,
    });

    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      imageUrl: s.imageUrl,
      discountValue: Number(s.discountValue),
    }));
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Creates a new storefront sale restricted to SUPER_ADMIN',
  })
  @ApiResponse({ status: 201, description: 'Sale created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Permission denied to create promotions de vitrine',
  })
  @Roles(GlobalRole.SUPER_ADMIN)
  @Post()
  async create(
    @Body()
    body: {
      name: string;
      imageUrl: string;
      discountValue?: number;
      startsAt?: string;
      endsAt?: string;
      active?: boolean;
    },
  ) {
    const sale = this.saleRepo.create({
      name: body.name,
      imageUrl: body.imageUrl,
      discountValue: body.discountValue ?? 0,
      active: body.active ?? true,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    });
    const saved = await this.saleRepo.save(sale);
    return { ok: true, id: saved.id };
  }
}
