import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class AuthService {
  private readonly ACCESS_COOKIE = 'access_token';
  private readonly REFRESH_COOKIE = 'refresh_token';

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  private cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE') === 'true',
      sameSite: (this.config.get('COOKIE_SAMESITE') as any) || 'lax',
      path: '/',
      maxAge,
    };
  }

  private async generateAccessToken(payload: any) {
    const options: Record<string, unknown> = {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRATION') || '15m',
    };

    return this.jwt.sign(payload, options as any);
  }

  private async generateRefreshToken(payload: any) {
    const options: Record<string, unknown> = {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
    };

    return this.jwt.sign(payload, options as any);
  }

  async validateUser(usuario: string, senha: string) {
    const user: any = await this.usersRepo.findOne({
      where: [{ usuario }, { email: usuario }],
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const senhaHash = user.senhaHash || user.senha_hash;
    const ok = await bcrypt.compare(senha, senhaHash || '');
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    delete user.senhaHash;
    delete user.senha_hash;
    return user;
  }

  async login(dto: { usuario: string; senha: string; cnpj?: string }, res: Response) {
    const { usuario, senha } = dto;

    const user = await this.validateUser(usuario, senha);
    const payload = { sub: user.id, email: user.email, role: user.roleGlobal || 'USER' };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken({ sub: user.id });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tokenEntity = this.refreshRepo.create({
      token: refreshToken,
      user,
      expiresAt,
    });
    await this.refreshRepo.save(tokenEntity);

    // cookies para navegação SSR/segura
    res.cookie(this.ACCESS_COOKIE, accessToken, this.cookieOptions(15 * 60 * 1000));
    res.cookie(this.REFRESH_COOKIE, refreshToken, this.cookieOptions(7 * 24 * 60 * 60 * 1000));

    // ⚠️ IMPORTANTE: devolver também o accessToken no corpo
    // e um user "safe" (sem hashes/sensíveis)
    const safeUser = {
      id: user.id,
      email: user.email,
      usuario: user.usuario,
      razaoSocial: user.razaoSocial,
      logoUrl: (user as any).logoUrl ?? null,
      roleGlobal: user.roleGlobal ?? 'USER',
    };

    return {
      ok: true,
      message: 'Login efetuado com sucesso',
      accessToken,
      user: safeUser,
    };
  }

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[this.REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Refresh ausente');

    try {
      this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh inválido');
    }

    const stored = await this.refreshRepo.findOne({ where: { token } });
    if (!stored || stored.revokedAt) throw new ForbiddenException('Refresh token revogado');

    stored.revokedAt = new Date();
    await this.refreshRepo.save(stored);

    const user = stored.user;
    const newAccess = await this.generateAccessToken({
      sub: user!.id,
      email: user!.email,
      role: user!.roleGlobal || 'USER',
    });
    const newRefresh = await this.generateRefreshToken({ sub: user!.id });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshRepo.save({
      token: newRefresh,
      user,
      expiresAt,
    });

    res.cookie(this.ACCESS_COOKIE, newAccess, this.cookieOptions(15 * 60 * 1000));
    res.cookie(this.REFRESH_COOKIE, newRefresh, this.cookieOptions(7 * 24 * 60 * 60 * 1000));

    return { ok: true, message: 'Tokens atualizados' };
  }

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[this.REFRESH_COOKIE];
    if (token) {
      const stored = await this.refreshRepo.findOne({ where: { token } });
      if (stored) {
        stored.revokedAt = new Date();
        await this.refreshRepo.save(stored);
      }
    }
    res.clearCookie(this.ACCESS_COOKIE);
    res.clearCookie(this.REFRESH_COOKIE);
    return { ok: true, message: 'Logout efetuado' };
  }

  async me(user: any) {
    return user;
  }
}
