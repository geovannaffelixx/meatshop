import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Order, PaymentMethod as OrderPaymentMethod } from '../entities/order.entity';
import { Expense, PaymentMethod as ExpensePaymentMethod, ExpenseType } from '../entities/expense.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Sale } from '../entities/sale.entity';
import { Product, ProductStatus } from '../entities/product.entity';

const SEED_PREFIX = '[SEED_MEATSHOP]';

type SeedUserInput = Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>;
type SeedProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
type SeedSaleInput = Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>;
type SeedOrderInput = Omit<Order, 'id' | 'criadoEm' | 'atualizadoEm'>;
type SeedExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,

    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,

    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,

    @InjectRepository(Expense)
    private readonly expensesRepo: Repository<Expense>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepo: Repository<RefreshToken>,
  ) {}

  async onApplicationBootstrap() {
    const enabled = (process.env.SEED_ENABLED ?? 'true').toLowerCase() === 'true';

    if (!enabled) {
      this.logger.log('Seeder desabilitado por SEED_ENABLED=false.');
      return;
    }

    try {
      await this.run();
      this.logger.log('Seed MeatShop finalizado com sucesso.');
    } catch (error) {
      this.logger.error('Erro ao executar seed MeatShop.', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  private async run() {
    const password = process.env.SEED_DEFAULT_PASSWORD ?? '1234567A';
    const senhaHash = await bcrypt.hash(password, 10);

    const users = await this.seedUsers(senhaHash);

    await this.seedProducts();
    await this.seedSales();
    await this.seedOrders();
    await this.seedExpenses();
    await this.seedRefreshTokens(users);
  }

  private async seedUsers(senhaHash: string) {
    const users: SeedUserInput[] = [
      {
        nomeFantasia: 'Master Carnes',
        razaoSocial: 'Master Carnes Comercio de Carnes LTDA',
        cnpj: '00000000000001',
        telefone: '(62) 3099-5601',
        celular: '(62) 98888-7701',
        logoUrl: '/uploads/avatars/seed-master-carnes.png',
        cep: '75083-350',
        logradouro: 'Avenida Universitaria',
        numero: '1522',
        complemento: 'Loja 01',
        bairro: 'Vila Santa Isabel',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'teste@meatshop.com',
        usuario: 'seed_master_carnes',
        senhaHash,
      },
      {
        nomeFantasia: 'Boi Nobre Carnes',
        razaoSocial: 'Boi Nobre Carnes LTDA',
        cnpj: '00000000000002',
        telefone: '(62) 3099-5602',
        celular: '(62) 98888-7702',
        logoUrl: '/uploads/avatars/seed-boi-nobre.png',
        cep: '75020-010',
        logradouro: 'Rua 7 de Setembro',
        numero: '245',
        complemento: 'Box 02',
        bairro: 'Centro',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed02@meatshop.com',
        usuario: 'seed_boi_nobre',
        senhaHash,
      },
      {
        nomeFantasia: 'Casa da Picanha',
        razaoSocial: 'Casa da Picanha Alimentos LTDA',
        cnpj: '00000000000003',
        telefone: '(62) 3099-5603',
        celular: '(62) 98888-7703',
        logoUrl: '/uploads/avatars/seed-casa-picanha.png',
        cep: '75044-020',
        logradouro: 'Avenida Brasil Norte',
        numero: '880',
        complemento: 'Sala 03',
        bairro: 'Jundiai',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed03@meatshop.com',
        usuario: 'seed_casa_picanha',
        senhaHash,
      },
      {
        nomeFantasia: 'Acougue Bom Corte',
        razaoSocial: 'Bom Corte Distribuidora de Carnes LTDA',
        cnpj: '00000000000004',
        telefone: '(62) 3099-5604',
        celular: '(62) 98888-7704',
        logoUrl: '/uploads/avatars/seed-bom-corte.png',
        cep: '75110-390',
        logradouro: 'Rua Goias',
        numero: '74',
        complemento: 'Quadra B',
        bairro: 'Maracana',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed04@meatshop.com',
        usuario: 'seed_bom_corte',
        senhaHash,
      },
      {
        nomeFantasia: 'Frigo Premium',
        razaoSocial: 'Frigo Premium Carnes Especiais LTDA',
        cnpj: '00000000000005',
        telefone: '(62) 3099-5605',
        celular: '(62) 98888-7705',
        logoUrl: '/uploads/avatars/seed-frigo-premium.png',
        cep: '75075-010',
        logradouro: 'Avenida Sao Francisco',
        numero: '1100',
        complemento: 'Loja A',
        bairro: 'Cidade Jardim',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed05@meatshop.com',
        usuario: 'seed_frigo_premium',
        senhaHash,
      },
      {
        nomeFantasia: 'Rei do Churrasco',
        razaoSocial: 'Rei do Churrasco Comercio de Carnes LTDA',
        cnpj: '00000000000006',
        telefone: '(62) 3099-5606',
        celular: '(62) 98888-7706',
        logoUrl: '/uploads/avatars/seed-rei-churrasco.png',
        cep: '75095-110',
        logradouro: 'Rua Anhanguera',
        numero: '310',
        complemento: 'Loja 06',
        bairro: 'Jardim America',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed06@meatshop.com',
        usuario: 'seed_rei_churrasco',
        senhaHash,
      },
      {
        nomeFantasia: 'Prime MeatShop',
        razaoSocial: 'Prime MeatShop Carnes LTDA',
        cnpj: '00000000000007',
        telefone: '(62) 3099-5607',
        celular: '(62) 98888-7707',
        logoUrl: '/uploads/avatars/seed-prime-meatshop.png',
        cep: '75113-160',
        logradouro: 'Avenida Pedro Ludovico',
        numero: '720',
        complemento: 'Setor Sul',
        bairro: 'Vila Jaiara',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed07@meatshop.com',
        usuario: 'seed_prime_meatshop',
        senhaHash,
      },
      {
        nomeFantasia: 'Butcher Express',
        razaoSocial: 'Butcher Express Alimentos LTDA',
        cnpj: '00000000000008',
        telefone: '(62) 3099-5608',
        celular: '(62) 98888-7708',
        logoUrl: '/uploads/avatars/seed-butcher-express.png',
        cep: '75093-520',
        logradouro: 'Rua Dona Elvira',
        numero: '455',
        complemento: 'Loja 08',
        bairro: 'Bairro de Lourdes',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed08@meatshop.com',
        usuario: 'seed_butcher_express',
        senhaHash,
      },
      {
        nomeFantasia: 'Emporio das Carnes',
        razaoSocial: 'Emporio das Carnes Anapolis LTDA',
        cnpj: '00000000000009',
        telefone: '(62) 3099-5609',
        celular: '(62) 98888-7709',
        logoUrl: '/uploads/avatars/seed-emporio-carnes.png',
        cep: '75124-030',
        logradouro: 'Avenida Comercial',
        numero: '99',
        complemento: 'Galeria 09',
        bairro: 'Sao Joaquim',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed09@meatshop.com',
        usuario: 'seed_emporio_carnes',
        senhaHash,
      },
      {
        nomeFantasia: 'Acougue Vila Carnes',
        razaoSocial: 'Vila Carnes Comercio Alimenticio LTDA',
        cnpj: '00000000000010',
        telefone: '(62) 3099-5610',
        celular: '(62) 98888-7710',
        logoUrl: '/uploads/avatars/seed-vila-carnes.png',
        cep: '75115-220',
        logradouro: 'Rua das Palmeiras',
        numero: '610',
        complemento: 'Loja 10',
        bairro: 'Vila Formosa',
        cidade: 'Anapolis',
        estado: 'GO',
        pais: 'Brasil',
        email: 'seed10@meatshop.com',
        usuario: 'seed_vila_carnes',
        senhaHash,
      },
    ];

    const savedUsers: User[] = [];

    for (const data of users) {
      const existing = await this.usersRepo.findOne({
        where: [{ email: data.email }, { usuario: data.usuario }, { cnpj: data.cnpj }],
      });

      if (existing) {
        const merged = this.usersRepo.merge(existing, data);
        savedUsers.push(await this.usersRepo.save(merged));
      } else {
        savedUsers.push(await this.usersRepo.save(this.usersRepo.create(data)));
      }
    }

    this.logger.log(`Tabela users populada/atualizada com ${savedUsers.length} registros de seed.`);
    return savedUsers;
  }

  private async seedProducts() {
    await this.productsRepo.delete({ notes: Like(`${SEED_PREFIX}%`) });

    const products: SeedProductInput[] = [
      {
        name: 'Picanha Bovina Premium',
        description: 'Picanha bovina selecionada para churrasco, com capa de gordura uniforme.',
        category: 'Bovinos',
        cut: 'Picanha',
        brand: 'MeatShop Selection',
        notes: `${SEED_PREFIX} Produto promocional para vitrine inicial.`,
        quantity: '25,00 KG',
        price: 79.9,
        promotionalPrice: 67.9,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Alcatra Bovina',
        description: 'Corte macio e versatil para bifes, assados e preparo do dia a dia.',
        category: 'Bovinos',
        cut: 'Alcatra',
        brand: 'MeatShop Selection',
        notes: `${SEED_PREFIX} Corte bovino cadastrado para testes de estoque.`,
        quantity: '32,50 KG',
        price: 49.9,
        promotionalPrice: 42.4,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Contrafile Bovino',
        description: 'Contrafile com boa marmorizacao, indicado para grelha e chapa.',
        category: 'Bovinos',
        cut: 'Contrafile',
        brand: 'Boi Nobre',
        notes: `${SEED_PREFIX} Produto com imagem promocional.`,
        quantity: '18,00 KG',
        price: 64.9,
        promotionalPrice: 54.9,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Fraldinha Bovina',
        description: 'Fraldinha fresca com fibras aparentes, ideal para churrasco e grelhados.',
        category: 'Bovinos',
        cut: 'Fraldinha',
        brand: 'Boi Nobre',
        notes: `${SEED_PREFIX} Corte usado na area de promocoes do app.`,
        quantity: '20,00 KG',
        price: 35.2,
        promotionalPrice: 29.9,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Maminha Bovina',
        description: 'Maminha suculenta e macia para assar, grelhar ou preparar em tiras.',
        category: 'Bovinos',
        cut: 'Maminha',
        brand: 'Prime Meat',
        notes: `${SEED_PREFIX} Produto ativo para catalogo.`,
        quantity: '16,75 KG',
        price: 59.9,
        promotionalPrice: 53.9,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Costela Bovina Janela',
        description: 'Costela bovina com osso, indicada para cozimento lento e churrasqueira.',
        category: 'Bovinos',
        cut: 'Costela',
        brand: 'Frigo Premium',
        notes: `${SEED_PREFIX} Produto com estoque controlado.`,
        quantity: '40,00 KG',
        price: 35.2,
        promotionalPrice: 29.9,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Coxao Mole Bovino',
        description: 'Corte macio e limpo, recomendado para bifes, refogados e milanesa.',
        category: 'Bovinos',
        cut: 'Coxao Mole',
        brand: 'MeatShop Selection',
        notes: `${SEED_PREFIX} Produto para testes de listagem.`,
        quantity: '28,00 KG',
        price: 39.9,
        promotionalPrice: 34.9,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Coxao Duro Bovino',
        description: 'Corte firme para assar, cozinhar, fatiar e preparar carnes de panela.',
        category: 'Bovinos',
        cut: 'Coxao Duro',
        brand: 'Frigo Premium',
        notes: `${SEED_PREFIX} Produto usado para testar filtros de categoria.`,
        quantity: '30,00 KG',
        price: 36.9,
        promotionalPrice: 31.36,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Acem Bovino',
        description: 'Acem bovino ideal para cozidos, ensopados e receitas com muito sabor.',
        category: 'Bovinos',
        cut: 'Acem',
        brand: 'Boi Nobre',
        notes: `${SEED_PREFIX} Produto popular para compra recorrente.`,
        quantity: '45,00 KG',
        price: 29.9,
        promotionalPrice: 26.9,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
      {
        name: 'Linguica Toscana',
        description: 'Linguica toscana fresca, temperada e pronta para churrasco.',
        category: 'Suinos',
        cut: 'Linguica Toscana',
        brand: 'Churrasco Prime',
        notes: `${SEED_PREFIX} Produto suino para diversificar o catalogo.`,
        quantity: '22,00 KG',
        price: 23.9,
        promotionalPrice: 20.32,
        promotionActive: true,
        status: 'ON_SALE' as ProductStatus,
      },
    ];

    await this.productsRepo.save(products.map((product) => this.productsRepo.create(product)));
    this.logger.log(`Tabela products recriada com ${products.length} registros de seed.`);
  }

  private async seedSales() {
    await this.salesRepo.delete({ imageUrl: Like('/uploads/promotions/seed-%') });

    const now = new Date();
    const startsAt = new Date(now);
    startsAt.setDate(now.getDate() - 7);

    const endsAt = new Date(now);
    endsAt.setDate(now.getDate() + 30);

    const sales: SeedSaleInput[] = [
      {
        name: 'Promocao de Picanha',
        imageUrl: '/uploads/promotions/Picanha.png',
        discountValue: 12,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Alcatra com Desconto',
        imageUrl: '/uploads/promotions/Alcatra.png',
        discountValue: 15,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Contrafile Especial',
        imageUrl: '/uploads/promotions/ContraFile.png',
        discountValue: 15,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Fraldinha Premium',
        imageUrl: '/uploads/promotions/Fraldinha.png',
        discountValue: 15,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Maminha Suculenta',
        imageUrl: '/uploads/promotions/Maminha.png',
        discountValue: 10,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Costela Bovina da Semana',
        imageUrl: '/uploads/promotions/Costela.png',
        discountValue: 15,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Coxao Mole para o Dia a Dia',
        imageUrl: '/uploads/promotions/CoxaoMole.png',
        discountValue: 15,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Coxao Duro para Assar',
        imageUrl: '/uploads/promotions/CoxaoDuro.png',
        discountValue: 15,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Acem para Receitas',
        imageUrl: '/uploads/promotions/Acem.png',
        discountValue: 10,
        active: true,
        startsAt,
        endsAt,
      },
      {
        name: 'Linguica Toscana Promocional',
        imageUrl: '/uploads/promotions/Linguica.png',
        discountValue: 15,
        active: true,
        startsAt,
        endsAt,
      },
    ];

    await this.salesRepo.save(sales.map((sale) => this.salesRepo.create(sale)));
    this.logger.log(`Tabela sales recriada com ${sales.length} registros de seed.`);
  }

  private async seedOrders() {
    await this.ordersRepo.delete({ observacoes: Like(`${SEED_PREFIX}%`) });

    const currentYear = new Date().getFullYear();

    const makeDate = (month: number, day: number, hour = 10, minute = 0) =>
      new Date(currentYear, month - 1, day, hour, minute, 0);

    const getDaysInMonth = (year: number, month: number) =>
      new Date(year, month, 0).getDate();

    const pseudoRandom = (seed: number, min: number, max: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      const decimal = x - Math.floor(x);
      return Number((min + decimal * (max - min)).toFixed(2));
    };

    const paymentMethods = [
      OrderPaymentMethod.PIX,
      OrderPaymentMethod.CREDITO,
      OrderPaymentMethod.DEBITO,
      OrderPaymentMethod.DINHEIRO,
      OrderPaymentMethod.SALDO_MP,
    ];

    const clientNames = [
      'Joao Pedro Almeida',
      'Maria Eduarda Santos',
      'Carlos Henrique Lima',
      'Ana Clara Oliveira',
      'Bruno Martins Rocha',
      'Fernanda Costa Ribeiro',
      'Lucas Gabriel Nunes',
      'Patricia Gomes Silva',
      'Rafael Augusto Pereira',
      'Camila Beatriz Ferreira',
      'Marcos Vinicius Souza',
      'Larissa Mendes Costa',
      'Gabriel Henrique Alves',
      'Juliana Rocha Martins',
      'Thiago Moreira Lima',
      'Amanda Vitoria Castro',
      'Pedro Henrique Carvalho',
      'Beatriz Souza Almeida',
      'Gustavo Ferreira Nunes',
      'Leticia Araujo Martins',
    ];

    const deliveredOrders: Array<{
      data: SeedOrderInput;
      criadoEm: Date;
    }> = [];

    let orderIndex = 1;

    const createDeliveredOrder = (month: number, day: number) => {
      const seed = Number(`${currentYear}${month}${day}${orderIndex}`);

      const valor = pseudoRandom(seed, 4600, 7100);
      const descontoPercentual = pseudoRandom(seed + 13, 0, 7);
      const desconto = Number((valor * (descontoPercentual / 100)).toFixed(2));
      const valorPago = Number((valor - desconto).toFixed(2));

      const hour = Math.floor(pseudoRandom(seed + 27, 8, 21));
      const minute = Math.floor(pseudoRandom(seed + 41, 0, 59));
      const date = makeDate(month, day, hour, minute);

      const paymentMethod = paymentMethods[orderIndex % paymentMethods.length];

      deliveredOrders.push({
        criadoEm: date,
        data: {
          cliente: clientNames[orderIndex % clientNames.length],
          cpfCnpj: String(10000000000 + orderIndex).padStart(11, '0'),
          status: 'Entregue',
          valor,
          desconto,
          valorPago,
          paymentMethod,
          dataAgendada: date,
          dataEntrega: date,
          observacoes: `${SEED_PREFIX} Pedido entregue para popular gráfico de receitas de ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}.`,
          mpPreferenceId: `seed-pref-revenue-${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          mpPaymentId: `seed-pay-revenue-${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          mpStatus: 'approved',
          mpStatusDetail: 'accredited',
          mpLastEventAt: date,
          mpPaidAt: date,
        },
      });

      orderIndex++;
    };

    for (const month of [4, 5]) {
      const totalDays = getDaysInMonth(currentYear, month);

      for (let day = 1; day <= totalDays; day++) {
        createDeliveredOrder(month, day);
      }
    }

    const today = new Date();

    const pendingOrders: SeedOrderInput[] = [
      {
        cliente: 'Ana Clara Oliveira',
        cpfCnpj: '44455566677',
        status: 'Pendente',
        valor: 76.8,
        desconto: 6.8,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.BOLETO,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente aguardando confirmacao de pagamento.`,
        mpPreferenceId: 'seed-pref-pending-0001',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Joao Pedro Almeida',
        cpfCnpj: '11122233344',
        status: 'Pendente',
        valor: 142.9,
        desconto: 12.9,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.PIX,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente com picanha e linguica.`,
        mpPreferenceId: 'seed-pref-pending-0002',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Maria Eduarda Santos',
        cpfCnpj: '22233344455',
        status: 'Pendente',
        valor: 98.5,
        desconto: 0,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.CREDITO,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente para retirada no balcao.`,
        mpPreferenceId: 'seed-pref-pending-0003',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Carlos Henrique Lima',
        cpfCnpj: '33344455566',
        status: 'Pendente',
        valor: 215.75,
        desconto: 15.75,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.DEBITO,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente com cortes para churrasco.`,
        mpPreferenceId: 'seed-pref-pending-0004',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Bruno Martins Rocha',
        cpfCnpj: '55566677788',
        status: 'Pendente',
        valor: 64.9,
        desconto: 0,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.DINHEIRO,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente aguardando separacao.`,
        mpPreferenceId: undefined,
        mpPaymentId: undefined,
        mpStatus: undefined,
        mpStatusDetail: undefined,
        mpLastEventAt: undefined,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Fernanda Costa Ribeiro',
        cpfCnpj: '66677788899',
        status: 'Pendente',
        valor: 121.4,
        desconto: 8.4,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.PIX,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente para entrega no periodo da tarde.`,
        mpPreferenceId: 'seed-pref-pending-0006',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Lucas Gabriel Nunes',
        cpfCnpj: '77788899900',
        status: 'Pendente',
        valor: 189.9,
        desconto: 19.9,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.CREDITO,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente de carnes premium.`,
        mpPreferenceId: 'seed-pref-pending-0007',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Patricia Gomes Silva',
        cpfCnpj: '88899900011',
        status: 'Pendente',
        valor: 257.3,
        desconto: 20.3,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.SALDO_MP,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente para compra grande.`,
        mpPreferenceId: 'seed-pref-pending-0008',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Marcos Vinicius Souza',
        cpfCnpj: '12345678901',
        status: 'Pendente',
        valor: 88.7,
        desconto: 4.7,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.PIX,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente com acem e coxao mole.`,
        mpPreferenceId: 'seed-pref-pending-0009',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
      {
        cliente: 'Larissa Mendes Costa',
        cpfCnpj: '23456789012',
        status: 'Pendente',
        valor: 134.2,
        desconto: 10.2,
        valorPago: 0,
        paymentMethod: OrderPaymentMethod.DEBITO,
        dataAgendada: today,
        dataEntrega: undefined,
        observacoes: `${SEED_PREFIX} Pedido pendente aguardando aprovacao.`,
        mpPreferenceId: 'seed-pref-pending-0010',
        mpPaymentId: undefined,
        mpStatus: 'pending',
        mpStatusDetail: 'pending_waiting_payment',
        mpLastEventAt: today,
        mpPaidAt: undefined,
      },
    ];

    for (const order of deliveredOrders) {
      const savedOrder = await this.ordersRepo.save(this.ordersRepo.create(order.data));

      await this.ordersRepo
        .createQueryBuilder()
        .update(Order)
        .set({
          criadoEm: order.criadoEm,
          atualizadoEm: order.criadoEm,
        } as any)
        .where('id = :id', { id: savedOrder.id })
        .execute();
    }

    await this.ordersRepo.save(
      pendingOrders.map((order) => this.ordersRepo.create(order)),
    );

    this.logger.log(
      `Tabela orders recriada com ${deliveredOrders.length + pendingOrders.length} registros de seed.`,
    );
  }

  private async seedExpenses() {
    await this.expensesRepo.delete({ notes: Like(`${SEED_PREFIX}%`) });

    const currentYear = new Date().getFullYear();

    const getDaysInMonth = (year: number, month: number) =>
      new Date(year, month, 0).getDate();

    const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

    const makeDateOnly = (month: number, day: number) =>
      toDateOnly(new Date(currentYear, month - 1, day, 12, 0, 0));

    const pseudoRandom = (seed: number, min: number, max: number) => {
      const x = Math.sin(seed * 7777) * 10000;
      const decimal = x - Math.floor(x);
      return Number((min + decimal * (max - min)).toFixed(2));
    };

    const suppliers = [
      'Frigorifico Goias Carnes',
      'Distribuidora Churrasco Prime',
      'Embalagens Centro Oeste',
      'Energia Anapolis',
      'Agua e Saneamento Local',
      'Manutencao Camara Fria',
      'Marketing MeatShop Local',
      'Limpeza Higienizacao Pro',
      'Transporte Refrigerado Rapido',
      'Despesas Operacionais Diversas',
    ];

    const paymentMethods = [
      'Pix' as ExpensePaymentMethod,
      'Crédito' as ExpensePaymentMethod,
      'Débito' as ExpensePaymentMethod,
      'Boleto' as ExpensePaymentMethod,
      'Dinheiro' as ExpensePaymentMethod,
    ];

    const expenseTypes = [
      'Compras' as ExpenseType,
      'Serviços' as ExpenseType,
      'Compras' as ExpenseType,
      'Serviços' as ExpenseType,
      'Outros' as ExpenseType,
    ];

    const expenses: SeedExpenseInput[] = [];

    let expenseIndex = 1;

    const createExpense = (month: number, day: number) => {
      const seed = Number(`${currentYear}${month}${day}${expenseIndex}`);

      let amount = pseudoRandom(seed, 2100, 3300);

      if (day % 7 === 0) {
        amount += pseudoRandom(seed + 31, 300, 850);
      }

      if (day % 11 === 0) {
        amount += pseudoRandom(seed + 47, 150, 500);
      }

      amount = Number(amount.toFixed(2));

      const discount =
        day % 6 === 0 ? Number((amount * pseudoRandom(seed + 19, 0.02, 0.08)).toFixed(2)) : 0;

      const paidAmount = Number((amount - discount).toFixed(2));

      const supplierIndex = Math.floor(pseudoRandom(seed + 7, 0, suppliers.length - 0.01));
      const postedAt = makeDateOnly(month, day);

      expenses.push({
        supplierName: suppliers[supplierIndex],
        type: expenseTypes[expenseIndex % expenseTypes.length],
        amount,
        discount,
        paidAmount,
        postedAt,
        paidAt: postedAt,
        paymentMethod: paymentMethods[expenseIndex % paymentMethods.length],
        notes: `${SEED_PREFIX} Despesa operacional para popular gráfico de despesas de ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}.`,
        cpfCnpj: String(12345678000100 + expenseIndex),
        supplierId: `SEED-SUPPLIER-${String(expenseIndex).padStart(3, '0')}`,
      });

      expenseIndex++;
    };

    for (const month of [4, 5]) {
      const totalDays = getDaysInMonth(currentYear, month);

      for (let day = 1; day <= totalDays; day++) {
        createExpense(month, day);
      }
    }

    await this.expensesRepo.save(expenses.map((expense) => this.expensesRepo.create(expense)));

    this.logger.log(`Tabela expenses recriada com ${expenses.length} registros de seed.`);
  }

  private async seedRefreshTokens(users: User[]) {
    await this.refreshTokensRepo.delete({ token: Like('seed-refresh-token-%') });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const tokens = users.map((user, index) =>
      this.refreshTokensRepo.create({
        token: `seed-refresh-token-${String(index + 1).padStart(2, '0')}`,
        jti: `seed-jti-${String(index + 1).padStart(2, '0')}`,
        user,
        expiresAt,
        revokedAt: undefined,
      }),
    );

    await this.refreshTokensRepo.save(tokens);
    this.logger.log(`Tabela refresh_tokens recriada com ${tokens.length} registros de seed.`);
  }
}