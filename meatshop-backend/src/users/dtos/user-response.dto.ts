import { AppProfile } from '../../common/enums/app-profile.enum';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  cpf: string;
  global_role: GlobalRole;
  app_profile: AppProfile;
  created_at: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    dto.cpf = user.cpf;
    dto.global_role = user.global_role;
    dto.app_profile = user.app_profile;
    dto.created_at = user.created_at;
    return dto;
  }
}
