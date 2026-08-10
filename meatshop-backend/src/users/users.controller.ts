import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';

@Controller('users')
export class UsersController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
  ) {}

  @Get('me')
  async me(@CurrentUser('id') userId: number) {
    const user = await this.getUserProfileUseCase.execute(userId);
    return { ok: true, user };
  }
}
