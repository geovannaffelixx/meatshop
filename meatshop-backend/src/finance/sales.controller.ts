import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';

@Controller('sales')
export class SalesController {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
  ) {}

  // Lista as promoções ativas (sales ativas)
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

  // (Opcional) criar promoções rapidamente
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
