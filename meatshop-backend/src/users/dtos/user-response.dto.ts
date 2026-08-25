import { ApiProperty } from '@nestjs/swagger';
import { AppProfile } from '../../common/enums/app-profile.enum';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    description: 'Identificador único do usuário',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João da Silva',
  })
  name: string;

  @ApiProperty({
    description: 'Endereço de e-mail do usuário',
    example: 'joao.silva@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'CPF do usuário',
    example: '123.456.789-00',
  })
  cpf: string;

  @ApiProperty({
    description: 'Papel global do usuário no sistema',
    example: GlobalRole.USER,
    enum: GlobalRole,
  })
  global_role: GlobalRole;

  @ApiProperty({
    description: 'Perfil de uso do aplicativo pelo usuário',
    example: AppProfile.CLIENT,
    enum: AppProfile,
  })
  app_profile: AppProfile;

  @ApiProperty({
    description: 'Data de criação do usuário',
    example: '2024-01-15T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'URL da foto de perfil do usuário',
    example: '/uploads/avatars/1700000000000-foto.jpg',
    nullable: true,
  })
  avatar_url: string | null;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    dto.cpf = user.cpf;
    dto.global_role = user.global_role;
    dto.app_profile = user.app_profile;
    dto.created_at = user.created_at;
    dto.avatar_url = user.avatar_url;
    return dto;
  }
}
