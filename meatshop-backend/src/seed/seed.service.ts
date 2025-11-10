import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const enabled = (process.env.SEED_ENABLED ?? 'true').toLowerCase() === 'true';
    if (!enabled) {
      this.logger.log('Seeder desabilitado por SEED_ENABLED=false');
      return;
    }

    const email = process.env.SEED_TESTE_EMAIL ?? 'teste@meatshop.com';
    const usuario = process.env.SEED_TESTE_USERNAME ?? 'Master Carnes';
    const rawPassword = process.env.SEED_TESTE_PASSWORD ?? '1234567A';

    const existing = await this.usersRepo.findOne({
      where: [{ email }, { usuario }],
    });

    if (existing) {
      this.logger.log(`Usuário admin já existe (id=${existing.id}, email=${existing.email}).`);
      return;
    }

    const senhaHash = await bcrypt.hash(rawPassword, 10);

    const admin = this.usersRepo.create({
      nomeFantasia: process.env.SEED_TESTE_NOME_FANTASIA ?? 'Teste MeatShop',
      razaoSocial: process.env.SEED_TESTE_RAZAO_SOCIAL ?? 'Master Carnes Teste',
      cnpj: process.env.SEED_TESTE_CNPJ ?? '00000000000000',
      telefone: process.env.SEED_TESTE_TELEFONE ?? '(62) 3099-5653',
      celular: process.env.SEED_TESTE_CELULAR ?? '(62) 98888-7777',
      cep: process.env.SEED_TESTE_CEP ?? '75083-350',
      logradouro: process.env.SEED_TESTE_LOGRADOURO ?? 'Av Universitaria',
      numero: process.env.SEED_TESTE_NUMERO ?? '1522',
      complemento: process.env.SEED_TESTE_COMPLEMENTO ?? 'a',
      bairro: process.env.SEED_TESTE_BAIRRO ?? 'Vila Santa Isabel',
      cidade: process.env.SEED_TESTE_CIDADE ?? 'Anapolis',
      estado: process.env.SEED_TESTE_ESTADO ?? 'GO',
      pais: process.env.SEED_TESTE_PAIS ?? 'Brasil',
      email,
      usuario,
      senhaHash,
    });

    await this.usersRepo.save(admin);

    this.logger.log(`Usuário admin criado com sucesso (email=${email}, usuario=${usuario}).`);
  }
}
