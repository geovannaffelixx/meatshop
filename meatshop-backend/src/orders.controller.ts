import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Order } from './entities/order.entity';

type ListOrdersResponse = {
  data: Array<{
    id: number;
    cliente: string;
    cpfCnpj?: string;
    status: string;
    valor: number;
    desconto?: number;
    valorPago?: number;
    formaPagamento?: string | null;
    criadoEm: string;
    dataAgendada?: string | null;
    dataEntrega?: string | null;
    observacoes?: string | null;
  }>;
};

/** Ajusta data final para 23:59:59 */
function endOfDay(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

@Controller('orders')
export class OrdersController {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
  ) {}

  // ================================
  // GET /orders
  // ================================
  @Get()
  async list(
    // filtros enviados pelo frontend
    @Query('status') status?: string,
    @Query('clienteNome') clienteNome?: string,
    @Query('clienteCpf') clienteCpf?: string,
    @Query('dataPedidoDe') dataPedidoDe?: string,
    @Query('dataPedidoAte') dataPedidoAte?: string,
    @Query('dataAgendadaDe') dataAgendadaDe?: string,
    @Query('dataAgendadaAte') dataAgendadaAte?: string,
    @Query('dataEntregaDe') dataEntregaDe?: string,
    @Query('dataEntregaAte') dataEntregaAte?: string,
  ): Promise<ListOrdersResponse> {
    const where: any = {};

    // filtros de texto
    if (status) where.status = status;
    if (clienteNome) where.cliente = Like(`%${clienteNome}%`);
    if (clienteCpf) where.cpfCnpj = Like(`%${clienteCpf}%`);

    // filtros de data do pedido (criadoEm)
    if (dataPedidoDe && dataPedidoAte) {
      where.criadoEm = Between(new Date(dataPedidoDe), endOfDay(dataPedidoAte));
    } else if (dataPedidoDe) {
      where.criadoEm = MoreThanOrEqual(new Date(dataPedidoDe));
    } else if (dataPedidoAte) {
      where.criadoEm = LessThanOrEqual(endOfDay(dataPedidoAte));
    }

    // filtros de data agendada
    if (dataAgendadaDe && dataAgendadaAte) {
      where.dataAgendada = Between(new Date(dataAgendadaDe), endOfDay(dataAgendadaAte));
    } else if (dataAgendadaDe) {
      where.dataAgendada = MoreThanOrEqual(new Date(dataAgendadaDe));
    } else if (dataAgendadaAte) {
      where.dataAgendada = LessThanOrEqual(endOfDay(dataAgendadaAte));
    }

    // filtros de data entrega
    if (dataEntregaDe && dataEntregaAte) {
      where.dataEntrega = Between(new Date(dataEntregaDe), endOfDay(dataEntregaAte));
    } else if (dataEntregaDe) {
      where.dataEntrega = MoreThanOrEqual(new Date(dataEntregaDe));
    } else if (dataEntregaAte) {
      where.dataEntrega = LessThanOrEqual(endOfDay(dataEntregaAte));
    }

    // ⚠ Sem paginação — frontend faz sozinho
    const rows = await this.ordersRepo.find({
      where,
      order: {
        criadoEm: 'DESC',
      },
    });

    return {
      data: rows.map((o) => ({
        id: o.id,
        cliente: o.cliente,
        cpfCnpj: o.cpfCnpj ?? '',
        status: o.status,
        valor: Number(o.valor),
        desconto: o.desconto != null ? Number(o.desconto) : undefined,
        valorPago: o.valorPago != null ? Number(o.valorPago) : undefined,
        formaPagamento: o.paymentMethod ?? null,
        criadoEm: o.criadoEm?.toISOString() ?? '',
        dataAgendada: o.dataAgendada?.toISOString() ?? null,
        dataEntrega: o.dataEntrega?.toISOString() ?? null,
        observacoes: o.observacoes ?? null,
      })),
    };
  }

  // ================================
  // GET /orders/:id
  // ================================
  @Get(':id')
  async byId(@Param('id', ParseIntPipe) id: number) {
    const o = await this.ordersRepo.findOne({ where: { id } });
    if (!o) {
      return { ok: false, message: 'Pedido não encontrado' };
    }

    return {
      ok: true,
      data: {
        id: o.id,
        cliente: o.cliente,
        cpfCnpj: o.cpfCnpj ?? '',
        status: o.status,
        valor: Number(o.valor),
        desconto: o.desconto ? Number(o.desconto) : undefined,
        valorPago: o.valorPago ? Number(o.valorPago) : undefined,
        formaPagamento: o.paymentMethod ?? null,
        criadoEm: o.criadoEm?.toISOString() ?? '',
        dataAgendada: o.dataAgendada?.toISOString() ?? null,
        dataEntrega: o.dataEntrega?.toISOString() ?? null,
        observacoes: o.observacoes ?? null,
      },
    };
  }
}
