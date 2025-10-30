import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    const {
      nomeFantasia,
      razaoSocial,
      cnpj,
      telefone,
      celular,
      logoUrl,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      pais,
      email,
      usuario,
      senha,
    } = body;

    if (!nomeFantasia || !razaoSocial || !cnpj || !email || !usuario || !senha) {
      throw new HttpException('Dados obrigatórios ausentes', HttpStatus.BAD_REQUEST);
    }

    const exists = await this.users.findOne({ where: [{ email }, { usuario }, { cnpj }] });
    if (exists)
      throw new HttpException(
        'Já existe um usuário com este e-mail, usuário ou CNPJ',
        HttpStatus.CONFLICT,
      );

    if (senha.length < 8 || !/[A-Z]/.test(senha)) {
      throw new HttpException(
        'A senha deve ter no mínimo 8 caracteres e ao menos uma letra maiúscula',
        HttpStatus.BAD_REQUEST,
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = this.users.create({
      nomeFantasia,
      razaoSocial,
      cnpj,
      telefone,
      celular,
      logoUrl,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      pais,
      email,
      usuario,
      senhaHash,
    });
    await this.users.save(user);
    return { ok: true, id: user.id, message: 'Usuário registrado com sucesso' };
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { usuario, senha } = body;
    if (!usuario || !senha)
      throw new HttpException('Informe usuário/e-mail e senha', HttpStatus.BAD_REQUEST);

    return this.authService.login(usuario, senha, res);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.authService.me(req.user);
  }

  @Post('verify-code')
  verifyCode(@Body() body: { codigo?: string }) {
    const codigo = (body?.codigo || '').trim();
    if (codigo.length !== 4 || !/^[0-9]{4}$/.test(codigo)) {
      throw new HttpException({ message: 'Código inválido' }, HttpStatus.BAD_REQUEST);
    }
    const ok = codigo === '1234';
    if (!ok) throw new HttpException({ message: 'Código incorreto' }, HttpStatus.UNAUTHORIZED);
    return { ok: true, message: 'Código verificado com sucesso' };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { usuario?: string; senha?: string }) {
    const { usuario, senha } = body;
    if (!usuario || !senha) {
      throw new HttpException('Informe usuário/e-mail e nova senha', HttpStatus.BAD_REQUEST);
    }

    if (senha.length < 8 || !/[A-Z]/.test(senha)) {
      throw new HttpException(
        'A senha deve ter no mínimo 8 caracteres e pelo menos uma letra maiúscula',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.users.findOne({ where: [{ usuario }, { email: usuario }] });
    if (!user) {
      throw new HttpException('Usuário não encontrado', HttpStatus.NOT_FOUND);
    }

    user.senhaHash = await bcrypt.hash(senha, 10);
    await this.users.save(user);

    return { ok: true, message: 'Senha redefinida com sucesso' };
  }
}
