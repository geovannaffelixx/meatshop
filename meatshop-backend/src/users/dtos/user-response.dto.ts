import { ApiProperty } from '@nestjs/swagger';
import { AppProfile } from '../../common/enums/app-profile.enum';
import { GlobalRole } from '../../common/enums/global-role.enum';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User full name',
    example: 'John Smith',
  })
  name: string | null;

  @ApiProperty({
    description: 'User email address',
    example: 'john.smith@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User CPF',
    example: '123.456.789-00',
  })
  cpf: string | null;

  @ApiProperty({
    description: 'User global role in the system',
    example: GlobalRole.USER,
    enum: GlobalRole,
  })
  global_role: GlobalRole;

  @ApiProperty({
    description: 'User application usage profile',
    example: AppProfile.CLIENT,
    enum: AppProfile,
  })
  app_profile: AppProfile | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty()
  profile_complete: boolean;

  @ApiProperty({
    description: 'User creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'User profile picture URL',
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
    dto.phone = user.phone;
    dto.profile_complete = user.profile_complete;
    dto.created_at = user.created_at;
    dto.avatar_url = user.avatar_url;
    return dto;
  }
}
