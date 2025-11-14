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
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

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
    @Query('page') pageStr = '1',
    @Query('pageSize') pageSizeStr = '10',
    // filtros
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
    const page = Math.max(parseInt(pageStr, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(pageSizeStr, 10) || 10, 1), 100);

    const where: any = {};

    // filtros textuais
    if (status) where.status = status;
    if (clienteNome) where.cliente = Like(`%${clienteNome}%`);
    if (clienteCpf) where.cpfCnpj = Like(`%${clienteCpf}%`);

    // filtros de data do pedido
    if (dataPedidoDe && dataPedidoAte) {
      where.criadoEm = Between(new Date(dataPedidoDe), new Date(dataPedidoAte));
    } else if (dataPedidoDe) {
      where.criadoEm = MoreThanOrEqual(new Date(dataPedidoDe));
    } else if (dataPedidoAte) {
      where.criadoEm = LessThanOrEqual(new Date(dataPedidoAte));
    }

    // filtros de data agendada
    if (dataAgendadaDe && dataAgendadaAte) {
      where.dataAgendada = Between(new Date(dataAgendadaDe), new Date(dataAgendadaAte));
    } else if (dataAgendadaDe) {
      where.dataAgendada = MoreThanOrEqual(new Date(dataAgendadaDe));
    } else if (dataAgendadaAte) {
      where.dataAgendada = LessThanOrEqual(new Date(dataAgendadaAte));
    }

    // filtros de data de entrega
    if (dataEntregaDe && dataEntregaAte) {
      where.dataEntrega = Between(new Date(dataEntregaDe), new Date(dataEntregaAte));
    } else if (dataEntregaDe) {
      where.dataEntrega = MoreThanOrEqual(new Date(dataEntregaDe));
    } else if (dataEntregaAte) {
      where.dataEntrega = LessThanOrEqual(new Date(dataEntregaAte));
    }

    const [rows, total] = await this.ordersRepo.findAndCount({
      where,
      order: { criadoEm: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: rows.map((o) => ({
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
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
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
