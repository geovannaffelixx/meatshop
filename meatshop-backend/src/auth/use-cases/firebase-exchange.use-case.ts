import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { FirebaseService } from '../../integrations/firebase/firebase.service';
import { UserResponseDto } from '../../users/dtos/user-response.dto';
import { User } from '../../users/entities/user.entity';
import { LoginUseCase } from './login.use-case';

@Injectable()
export class FirebaseExchangeUseCase {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly firebase: FirebaseService,
    private readonly login: LoginUseCase,
  ) {}

  async execute(idToken: string, password?: string) {
    const identity = await this.firebase.verifyIdToken(idToken);
    const email = identity.email?.trim().toLowerCase();
    if (!email || identity.email_verified !== true) {
      throw new UnauthorizedException({
        code: 'FIREBASE_EMAIL_NOT_VERIFIED',
        message: 'A verified email is required.',
      });
    }

    let user = await this.users.findOne({
      where: { firebase_uid: identity.uid },
    });
    if (!user) {
      user = await this.users.findOne({ where: { email } });
      if (user) {
        await this.linkExistingUser(user, identity.uid, password);
      } else {
        user = this.users.create({
          firebase_uid: identity.uid,
          email,
          email_verified: true,
          name: identity.name?.trim() || null,
          cpf: null,
          password_hash: null,
          phone: null,
          app_profile: null,
          global_role: GlobalRole.USER,
          profile_complete: false,
          is_active: true,
        });
        user = await this.users.save(user);
      }
    }

    this.assertAccountCanAuthenticate(user);
    const tokens = await this.login.execute(user);
    return { ...tokens, user: UserResponseDto.fromEntity(user) };
  }

  private async linkExistingUser(
    user: User,
    firebaseUid: string,
    password?: string,
  ): Promise<void> {
    if (user.firebase_uid && user.firebase_uid !== firebaseUid) {
      throw new ConflictException({
        code: 'FIREBASE_IDENTITY_CONFLICT',
        message: 'This email is already linked to another Firebase identity.',
      });
    }
    if (!password) {
      throw new ConflictException({
        code: 'ACCOUNT_LINK_REQUIRED',
        message: 'The current account password is required for the first link.',
      });
    }
    if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_LINK_INVALID_PASSWORD',
        message: 'The account password is invalid.',
      });
    }
    user.firebase_uid = firebaseUid;
    user.email_verified = true;
    user.profile_complete = Boolean(
      user.name?.trim() && user.cpf?.trim() && user.phone?.trim() && user.app_profile,
    );
    await this.users.save(user);
  }

  private assertAccountCanAuthenticate(user: User): void {
    if (!user.is_active) {
      throw new ForbiddenException({
        code: 'ACCOUNT_DISABLED',
        message: 'Account disabled.',
      });
    }
    if (user.locked_until && user.locked_until > new Date()) {
      throw new ForbiddenException({
        code: 'ACCOUNT_LOCKED',
        message: 'Account locked.',
      });
    }
  }
}
