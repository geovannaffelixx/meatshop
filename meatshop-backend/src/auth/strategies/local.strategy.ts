import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { LoginUseCase } from '../use-cases/login.use-case';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly loginUseCase: LoginUseCase) {
    super({ usernameField: 'email' });
  }

  async validate(email: unknown, password: unknown) {
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.loginUseCase.validateCredentials(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}