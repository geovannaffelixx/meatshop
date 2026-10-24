import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { UserAvatar } from './user-avatar';

jest.mock('next/image', () => ({ __esModule: true, default: function MockImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return React.createElement('img', { src: props.src, alt: props.alt, onError: props.onError });
} }));
jest.mock('@/shared/lib/api', () => ({ resolveAssetUrl: (src?: string) => src ? `http://localhost:3001${src}` : '' }));

describe('Sidebar profile photo', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('uses the profile photo, falls back after an error, and updates when the photo changes', async () => {
    await act(async () => root.render(<UserAvatar name="Ana" src="/uploads/avatar.jpg" />));
    expect(container.querySelector('img')?.getAttribute('src')).toBe('http://localhost:3001/uploads/avatar.jpg');
    await act(async () => container.querySelector('img')!.dispatchEvent(new Event('error')));
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('A');
    await act(async () => root.render(<UserAvatar name="Ana" src="/uploads/new.jpg" />));
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/uploads/new.jpg');
  });
  it('keeps the initial when there is no profile photo', async () => {
    await act(async () => root.render(<UserAvatar name="Ana" />));
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('A');
  });
});
