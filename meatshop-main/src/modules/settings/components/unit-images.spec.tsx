import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { UnitImages } from './unit-images';
import { apiUpload, apiDelete } from '@/shared/lib/api';
import { toast } from '@/shared/lib/toast';
jest.mock('@/shared/lib/api', () => ({ apiUpload: jest.fn(), apiDelete: jest.fn(), resolveAssetUrl: (url: string) => url }));
jest.mock('@/shared/lib/toast', () => ({ toast: { warning: jest.fn(), error: jest.fn(), success: jest.fn() } }));

describe('Unit image management', () => {
  let container: HTMLDivElement;
  let root: Root;
  const saved = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  const choose = async (input: HTMLInputElement, files: File[]) => {
    Object.defineProperty(input, 'files', { configurable: true, value: files });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  };
  it('validates type and size before uploading', async () => {
    await act(async () => root.render(<UnitImages unitId={6} gallery={[]} onSaved={saved} />));
    const input = container.querySelector('input[multiple]') as HTMLInputElement;
    await choose(input, [new File(['bad'], 'document.txt', { type: 'text/plain' })]);
    await choose(input, [new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'photo.png', { type: 'image/png' })]);
    expect(toast.warning).toHaveBeenCalledTimes(2);
    expect(apiUpload).not.toHaveBeenCalled();
  });
  it('uploads the gallery as multipart and refreshes only after success', async () => {
    await act(async () => root.render(<UnitImages unitId={6} gallery={[]} onSaved={saved} />));
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    await choose(container.querySelector('input[multiple]') as HTMLInputElement, [file]);
    expect(apiUpload).toHaveBeenCalledWith('/units/6/images', expect.any(FormData));
    const body = (apiUpload as jest.Mock).mock.calls[0][1] as FormData;
    expect(body.getAll('files')).toEqual([file]);
    expect(saved).toHaveBeenCalledTimes(1);
  });
  it('removes the precise stored image rather than a mutable index', async () => {
    await act(async () => root.render(<UnitImages unitId={6} gallery={['/uploads/units/photo.png']} onSaved={saved} />));
    await act(async () => container.querySelector('button')!.click());
    expect(apiDelete).toHaveBeenCalledWith('/units/6/images?url=%2Fuploads%2Funits%2Fphoto.png');
    expect(saved).toHaveBeenCalledTimes(1);
  });
});
