import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
  ) {}

  @Get()
  async getDashboard() {
    const recent = await this.ordersRepo.find({
      order: { id: 'DESC' },
      take: 50,
    });

    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    const vendasSemana = dias.map((d) => ({ day: d, vendas: 0 }));

    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    const diaSemana = hoje.getDay(); // 0=Dom...6=Sab

    // Ajusta para segunda
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    inicioSemana.setDate(hoje.getDate() + diff);
    inicioSemana.setHours(0, 0, 0, 0);

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    const pedidosSemana = await this.ordersRepo.find({
      where: {
        criadoEm: Between(inicioSemana, fimSemana),
      },
    });

    pedidosSemana.forEach((p) => {
      const d = new Date(p.criadoEm);
      let idx = d.getDay(); // 0=Dom

      idx = idx === 0 ? 6 : idx - 1; // converte para Seg=0
      vendasSemana[idx].vendas += Number(p.valorPago);
    });

    const porStatus = {
      Pendente: await this.ordersRepo.count({ where: { status: 'Pendente' } }),
      Entregue: await this.ordersRepo.count({ where: { status: 'Entregue' } }),
      Cancelado: await this.ordersRepo.count({ where: { status: 'Cancelado' } }),
    };

    return {
      vendasSemana,
      pedidosRecentes: recent.map((o) => ({
        id: o.id,
        cliente: o.cliente,
        status: o.status,
        valor: Number(o.valorPago),
        criadoEm: o.criadoEm,
      })),
      porStatus,
    };
  }
}
