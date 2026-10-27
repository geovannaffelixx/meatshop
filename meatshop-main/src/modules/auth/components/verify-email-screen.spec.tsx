import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VerifyEmailScreen } from './verify-email-screen';
import { apiPost } from '@/shared/lib/api';
import { ApiError } from '@/shared/lib/api-error-translations';

let mockSearch = '';
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mockSearch) }));
jest.mock('@/shared/lib/api', () => ({ apiPost: jest.fn() }));

describe('Email verification page', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

  it('confirms the token from the link once and offers the login', async () => {
    mockSearch = 'token=abc-123';
    jest.mocked(apiPost).mockResolvedValue({ message: 'Email verified successfully' });
    await act(async () => root.render(<VerifyEmailScreen />));
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledWith('/auth/verify-email', { token: 'abc-123' }, { silent: true });
    expect(container.querySelector('[role="status"]')?.textContent).toContain('E-mail confirmado');
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('shows an error without calling the API when the link has no token', async () => {
    mockSearch = '';
    await act(async () => root.render(<VerifyEmailScreen />));
    expect(apiPost).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('inválido ou expirado');
  });

  it('shows the translated API error when the token is rejected', async () => {
    mockSearch = 'token=expired';
    jest.mocked(apiPost).mockRejectedValue(new ApiError('O link é inválido ou expirou. Solicite um novo link.', 400));
    await act(async () => root.render(<VerifyEmailScreen />));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('O link é inválido ou expirou');
  });
});
