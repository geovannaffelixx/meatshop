import { ReviewListItemDto } from './review-list-item.dto';
import type { Review } from '../entities/review.entity';

describe('review author privacy', () => {
  it('returns only the first name and never exposes the user or avatar', () => {
    const dto = ReviewListItemDto.fromEntity({
      id: 1,
      client: { name: '  Ana   Maria Silva ', avatar_url: '/private-photo.png' },
    } as Review);
    expect(dto.client_name).toBe('Ana');
    expect(dto).not.toHaveProperty('client');
    expect(dto).not.toHaveProperty('avatar_url');
    expect(JSON.stringify(dto)).not.toContain('Silva');
    expect(JSON.stringify(dto)).not.toContain('private-photo');
  });
  it('uses a Portuguese fallback when no author name exists', () => {
    expect(ReviewListItemDto.fromEntity({ client: { name: '   ' } } as Review).client_name).toBe(
      'Cliente',
    );
  });
});
