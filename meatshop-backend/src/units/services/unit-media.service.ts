import { UnitPermission } from '../../common/enums/unit-permission.enum';
import type { Express } from 'express';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '../entities/unit.entity';
import { User } from '../../users/entities/user.entity';
import { UnitAuthorizationService } from './unit-authorization.service';
import { MediaStorageService } from '../../storage/media-storage.service';

@Injectable()
export class UnitMediaService {
  private readonly logger = new Logger(UnitMediaService.name);
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    private readonly authorization: UnitAuthorizationService,
    private readonly storage: MediaStorageService,
  ) {}

  async upload(id: number, actor: User, files: Express.Multer.File[], cover = false) {
    const unit = await this.units.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unit not found');
    await this.authorization.assertHasPermission(actor, unit.id, UnitPermission.MANAGE_UNIT);
    if (!files?.length || files.length > (cover ? 1 : 10))
      throw new BadRequestException('Choose up to 10 images');
    const urls: string[] = [];
    let previous: string | null = null;
    try {
      for (const file of files) urls.push(await this.storage.upload(file, 'units'));
      const result = await this.units.manager.transaction(async (manager) => {
        const locked = await manager.findOne(Unit, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!locked) throw new NotFoundException('Unit not found');
        if (cover) {
          previous = locked.cover_url;
          locked.cover_url = urls[0];
        } else {
          const gallery = locked.gallery_urls ?? [];
          if (gallery.length + urls.length > 10)
            throw new BadRequestException('Unit gallery allows up to 10 images');
          locked.gallery_urls = [...gallery, ...urls];
        }
        await manager.save(locked);
        return { cover_url: locked.cover_url, gallery_urls: locked.gallery_urls ?? [] };
      });
      if (previous) await this.cleanup([previous]);
      return result;
    } catch (error) {
      await this.cleanup(urls);
      throw error;
    }
  }

  async remove(id: number, actor: User, url: string) {
    await this.units.manager.transaction(async (manager) => {
      const unit = await manager.findOne(Unit, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!unit) throw new NotFoundException('Unit not found');
      await this.authorization.assertHasPermission(actor, unit.id, UnitPermission.MANAGE_UNIT);
      if (!(unit.gallery_urls ?? []).includes(url))
        throw new NotFoundException('Unit image not found');
      unit.gallery_urls = unit.gallery_urls.filter((image) => image !== url);
      await manager.save(unit);
    });
    await this.cleanup([url]);
    return { ok: true };
  }

  private async cleanup(urls: string[]) {
    const results = await Promise.allSettled(urls.map((url) => this.storage.delete(url)));
    if (results.some((result) => result.status === 'rejected'))
      this.logger.warn('Could not remove an unused unit image');
  }
}
