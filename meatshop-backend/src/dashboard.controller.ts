import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(@InjectRepository(Order) private readonly orders: Repository<Order>) {}

  @Get()
  async getDashboard() {
    const count = await this.orders.count();
    if (count === 0) {
      const seed = Array.from({ length: 12 }).map((_, i) => this.orders.create({
        cliente: `Cliente ${i + 1}`,
        status: i % 3 === 0 ? 'Entregue' : i % 3 === 1 ? 'Pendente' : 'Cancelado',
        valor: 50 + i * 10,
      }));
      await this.orders.save(seed);
    }
    const recent = await this.orders.find({ order: { id: 'DESC' }, take: 10 });
    const vendasSemana = [10, 25, 18, 32, 27, 40, 35];
    const porStatus = {
      Entregue: await this.orders.count({ where: { status: 'Entregue' } }),
      Pendente: await this.orders.count({ where: { status: 'Pendente' } }),
      Cancelado: await this.orders.count({ where: { status: 'Cancelado' } }),
    };
    return {
      vendasSemana,
      pedidosRecentes: recent.map(o => ({ id: o.id, cliente: o.cliente, status: o.status, valor: o.valor, criadoEm: o.criadoEm })),
      porStatus,
    };
  }
}
