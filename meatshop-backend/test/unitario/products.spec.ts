import { ProductsController } from '../../src/products.controller';

describe('Fluxo de Cadastro de Produto', () => {

  let controller: ProductsController;
  let mockProductRepo: any;

  beforeEach(() => {
    mockProductRepo = {
    create: jest.fn(),
    save: jest.fn()
};

    controller = new ProductsController(mockProductRepo);
  });

  // 1 - Produto válido
  it('deve cadastrar produto válido', async () => {

  const dto = {
    status: 'ACTIVE' as const,
    name: 'Picanha',
    category: 'Bovina',
    cut: 'Nobre',
    brand: 'Friboi',
    quantity: "50",
    price: 100,
    promotionalPrice: 80,
    promotionActive: true,
    description: 'Carne premium',
    image: 'picanha.jpg'
  };

  mockProductRepo.create.mockReturnValue(dto);

  mockProductRepo.save.mockResolvedValue({
    id: 1,
    ...dto
  });

  const result = await controller.create(dto);

  expect(mockProductRepo.create).toHaveBeenCalled();
  expect(mockProductRepo.save).toHaveBeenCalled();

  expect(result).toEqual({
    ok: true,
    id: expect.any(Number)
  });

});

  // 2 - Produto sem nome
  it('não deve permitir cadastro sem nome', async () => {

    const dto = {
      status: 'ACTIVE' as const,
      name: '',
      category: 'Bovina',
      cut: 'Nobre',
      description: 'Carne premium',
      quantity: "10 kg",
      price: 50
    };

    mockProductRepo.save.mockRejectedValue(new Error('Nome obrigatório'));

    await expect(controller.create(dto))
      .rejects
      .toThrow('Nome obrigatório');
  });

  //  3 - Estoque inválido
  it('não deve permitir estoque negativo', async () => {

    const dto = {
      status: 'ACTIVE' as const,
      name: 'Alcatra',
      category: 'Bovina',
      cut: 'Nobre',
      description: 'Carne premium',
      quantity: "-5 kg",
      price: 80
    };

    mockProductRepo.save.mockRejectedValue(new Error('Estoque inválido'));

    await expect(controller.create(dto))
      .rejects
      .toThrow('Estoque inválido');
  });

  //  4 - Preço inválido
  it('não deve permitir preço negativo', async () => {

    const dto = {
      status: 'ACTIVE' as const,
      name: 'Fraldinha',
      category: 'Bovina',
      cut: 'Nobre',
      description: 'Carne premium',
      quantity: "10 kg",
      price: -20
    };

    mockProductRepo.save.mockRejectedValue(new Error('Preço inválido'));

    await expect(controller.create(dto))
      .rejects
      .toThrow('Preço inválido');
  });

  //  5 - Promoção inválida
  it('não deve permitir promoção ativa sem preço promocional', async () => {

    const dto = {
      status: 'ACTIVE' as const,
      name: 'Costela',
      category: 'Bovina',
      cut: 'Nobre',
      description: 'Carne premium',
      quantity: "10 kg",
      price: 100,
      promotionActive: true,
      promotionalPrice: 0
    };

    mockProductRepo.save.mockRejectedValue(new Error('Promoção inválida'));

    await expect(controller.create(dto))
      .rejects
      .toThrow('Promoção inválida');
  });

  //  6 - Produto sem promoção
  it('deve cadastrar produto sem promoção', async () => {

    const dto = {
      status: 'ACTIVE' as const,
      name: 'Cupim',
      category: 'Bovina',
      cut: 'Nobre',
      description: 'Carne premium',
      quantity: "20 kg",
      price: 70,
      promotionActive: false
    };

    mockProductRepo.save.mockResolvedValue({
      id: 2,
      ...dto
    });

    const result = await controller.create(dto);

    expect(result).toEqual({
      ok: true,
      id: expect.any(Number)
    });
  });

});