
import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/usuario.entity';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
  constructor(@InjectRepository(Usuario) private readonly users: Repository<Usuario>) {}

  @Post('register')
  async register(@Body() body: any) {
    const { nomeFantasia, razaoSocial, cnpj, telefone, celular, logoUrl, cep, logradouro, numero, complemento, bairro, cidade, estado, pais, email, usuario, senha } = body;
    if (!nomeFantasia || !razaoSocial || !cnpj || !email || !usuario || !senha) {
      throw new HttpException('Dados obrigatórios ausentes', HttpStatus.BAD_REQUEST);
    }

    const exists = await this.users.findOne({ where: [{ email }, { usuario }, { cnpj }] });
    if (exists) throw new HttpException('Já existe um usuário com este e-mail, usuário ou CNPJ', HttpStatus.CONFLICT);

    if (senha.length < 8 || !/[A-Z]/.test(senha)) {
      throw new HttpException('A senha deve ter no mínimo 8 caracteres e ao menos uma letra maiúscula', HttpStatus.BAD_REQUEST);
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = this.users.create({ nomeFantasia, razaoSocial, cnpj, telefone, celular, logoUrl, cep, logradouro, numero, complemento, bairro, cidade, estado, pais, email, usuario, senhaHash });
    await this.users.save(user);
    return { ok: true, id: user.id, message: 'Usuário registrado com sucesso' };
  }

  @Post('login')
  async login(@Body() body: any) {
    const { usuario, senha } = body;
    if (!usuario || !senha) throw new HttpException('Informe usuário/e-mail e senha', HttpStatus.BAD_REQUEST);

    const user = await this.users.findOne({ where: [{ usuario }, { email: usuario }] });
    if (!user) throw new HttpException('Usuário não encontrado', HttpStatus.UNAUTHORIZED);

    const ok = await bcrypt.compare(senha, user.senhaHash);
    if (!ok) throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);

    const token = `fake-${user.id}-${Date.now()}`;
    return { token, user: { id: user.id, nomeFantasia: user.nomeFantasia, razaoSocial: user.razaoSocial, email: user.email, usuario: user.usuario, cnpj: user.cnpj } };
  }

  @Post('verify-code')
  verifyCode(@Body() body: { codigo?: string }) {
    const codigo = (body?.codigo || '').trim();
    if (codigo.length !== 4 || !/^[0-9]{4}$/.test(codigo)) throw new HttpException({ message: 'Código inválido' }, HttpStatus.BAD_REQUEST);
    const ok = codigo === '1234';
    if (!ok) throw new HttpException({ message: 'Código incorreto' }, HttpStatus.UNAUTHORIZED);
    return { ok: true, message: 'Código verificado com sucesso' };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { senha?: string }) {
    const senha = (body?.senha || '').trim();
    if (senha.length < 8) throw new HttpException({ message: 'Senha muito curta' }, HttpStatus.BAD_REQUEST);
    return { ok: true, message: 'Senha redefinida com sucesso' };
  }
}
