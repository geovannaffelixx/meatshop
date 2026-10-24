import { jest, beforeEach } from '@jest/globals';
import { UnitMediaService } from './unit-media.service';
import { Unit } from '../entities/unit.entity';

describe('Unit gallery and cover persistence', () => {
  const actor = { id: 3 } as never;
  const file = { originalname: 'photo.png' } as never;
  let unit: Unit;
  let storage: { upload: jest.Mock; delete: jest.Mock };
  let authorization: { assertHasPermission: jest.Mock };
  let manager: { findOne: jest.Mock; save: jest.Mock };
  let service: UnitMediaService;
  beforeEach(() => {
    unit = Object.assign(new Unit(), { id: 6, gallery_urls: [], cover_url: '/old-cover.png' });
    storage = {
      upload: jest.fn(async () => '/new-photo.png'),
      delete: jest.fn(async () => undefined),
    };
    authorization = { assertHasPermission: jest.fn(async () => undefined) };
    manager = { findOne: jest.fn(async () => unit), save: jest.fn(async (value) => value) };
    service = new UnitMediaService(
      {
        findOne: jest.fn(async () => unit),
        manager: {
          transaction: async (work: (manager: unknown) => Promise<unknown>) => work(manager),
        },
      } as never,
      authorization as never,
      storage as never,
    );
  });
  it('saves gallery URLs under a unit lock', async () => {
    await expect(service.upload(6, actor, [file])).resolves.toEqual({
      cover_url: '/old-cover.png',
      gallery_urls: ['/new-photo.png'],
    });
    expect(authorization.assertHasPermission).toHaveBeenCalledWith(actor, 6, 'MANAGE_UNIT');
    expect(manager.findOne).toHaveBeenCalledWith(Unit, {
      where: { id: 6 },
      lock: { mode: 'pessimistic_write' },
    });
  });
  it('blocks unauthorized uploads before storing files', async () => {
    authorization.assertHasPermission.mockImplementation(async () => {
      throw new Error('forbidden');
    });
    await expect(service.upload(6, actor, [file])).rejects.toThrow('forbidden');
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it('cleans new files if concurrent uploads reach the gallery limit', async () => {
    unit.gallery_urls = Array.from({ length: 10 }, (_, index) => `/photo-${index}.png`);
    await expect(service.upload(6, actor, [file])).rejects.toThrow('up to 10');
    expect(manager.save).not.toHaveBeenCalled();
    expect(storage.delete).toHaveBeenCalledWith('/new-photo.png');
  });
  it('replaces the cover and removes the old file only after saving', async () => {
    await service.upload(6, actor, [file], true);
    expect(unit.cover_url).toBe('/new-photo.png');
    expect(storage.delete).toHaveBeenCalledWith('/old-cover.png');
  });
  it('does not delete a file belonging to another unit', async () => {
    await expect(service.remove(6, actor, '/other-unit.png')).rejects.toThrow('not found');
    expect(storage.delete).not.toHaveBeenCalled();
  });
  it('removes only an existing gallery image', async () => {
    unit.gallery_urls = ['/photo-a.png', '/photo-b.png'];
    await service.remove(6, actor, '/photo-a.png');
    expect(unit.gallery_urls).toEqual(['/photo-b.png']);
    expect(storage.delete).toHaveBeenCalledWith('/photo-a.png');
  });
});
