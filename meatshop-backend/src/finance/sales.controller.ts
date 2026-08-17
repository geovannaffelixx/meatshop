import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Sale } from './entities/sale.entity';

@ApiTags('Sales')
@Controller('sales')
export class SalesController {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Lista as promoções (sales) ativas no momento' })
  @ApiQuery({ name: 'now', required: false, description: 'Data de referência ISO 8601 (default: agora)' })
  @ApiResponse({ status: 200, description: 'Lista de sales ativas retornada com sucesso' })
  @Get()
  async listActive(@Query('now') nowISO?: string) {
    const now = nowISO ? new Date(nowISO) : new Date();

    const rows = await this.saleRepo.find({
      where: [
        // Ativas sem datas definidas
        { active: true, startsAt: undefined, endsAt: undefined },
        // Ativas com apenas data final futura
        { active: true, startsAt: undefined, endsAt: MoreThanOrEqual(now) },
        // Ativas com apenas data inicial passada
        { active: true, startsAt: LessThanOrEqual(now), endsAt: undefined },
        // Ativas dentro de um intervalo de datas
        { active: true, startsAt: LessThanOrEqual(now), endsAt: MoreThanOrEqual(now) },
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
  @ApiOperation({ summary: 'Cria uma nova sale (promoção de vitrine)' })
  @ApiResponse({ status: 201, description: 'Sale criada com sucesso' })
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
