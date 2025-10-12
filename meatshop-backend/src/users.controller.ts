import { Controller, Get } from '@nestjs/common';
@Controller('users')
export class UsersController {
  @Get('me')
  me() { return { id: 1, nome: 'Usuário Demo', email: 'demo@meatshop.com', usuario: 'demo', cnpj: '00.000.000/0000-00' }; }
}
