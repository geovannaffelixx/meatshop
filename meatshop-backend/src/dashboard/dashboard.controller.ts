import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { PaymentStatus } from '../orders/enums/payment-status.enum';

@Controller('dashboard')
export class DashboardController {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
  ) {}

  @Get()
  async getDashboard() {
    const recent = await this.ordersRepo.find({
      relations: ['client'],
      order: { id: 'DESC' },
      take: 50,
    });

    const vendasSemana = await this.buildWeeklySales();
    const porStatus = {
      Pendente: await this.ordersRepo.count({ where: { status: OrderStatus.PENDING } }),
      Entregue: await this.ordersRepo.count({ where: { status: OrderStatus.DELIVERED } }),
      Cancelado: await this.ordersRepo.count({ where: { status: OrderStatus.CANCELLED } }),
    };

    return {
      vendasSemana,
      pedidosRecentes: recent.map((o) => ({
        id: o.id,
        cliente: o.client?.name,
        status: o.status,
        valor: this.paidAmount(o),
        criadoEm: o.order_date,
      })),
      porStatus,
    };
  }

  private paidAmount(order: Order): number {
    return order.payment_status === PaymentStatus.PAID ? Number(order.total_amount) : 0;
  }

  private async buildWeeklySales() {
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    const vendasSemana = dias.map((d) => ({ day: d, vendas: 0 }));

    const { inicioSemana, fimSemana } = this.currentWeekRange();
    const pedidosSemana = await this.ordersRepo.find({
      where: { order_date: Between(inicioSemana, fimSemana) },
    });

    pedidosSemana.forEach((p) => {
      const idx = this.weekdayIndex(p.order_date);
      vendasSemana[idx].vendas += this.paidAmount(p);
    });

    return vendasSemana;
  }

  private currentWeekRange() {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    const diaSemana = hoje.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    inicioSemana.setDate(hoje.getDate() + diff);
    inicioSemana.setHours(0, 0, 0, 0);

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    return { inicioSemana, fimSemana };
  }

  private weekdayIndex(date: Date): number {
    const d = new Date(date).getDay();
    return d === 0 ? 6 : d - 1;
  }
}
