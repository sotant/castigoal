function loadAuthDeepLinksModule(options: {
  createURL?: string;
  os: 'ios' | 'android' | 'web';
  scheme?: string;
}) {
  jest.resetModules();

  const createURL = jest.fn(() => options.createURL ?? 'https://example.test/reset-password');

  jest.doMock('react-native', () => ({
    Platform: {
      OS: options.os,
    },
  }));

  jest.doMock('expo-linking', () => ({
    __esModule: true,
    createURL,
  }));

  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: {
      expoConfig: {
        scheme: options.scheme ?? 'castigoal',
      },
    },
  }));

  const module = require('@/src/lib/auth-deep-links');
  return { ...module, createURL };
}

describe('auth deep link helpers', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('builds the native password recovery URL using the app scheme', () => {
    const { buildPasswordRecoveryRedirectUrl } = loadAuthDeepLinksModule({
      os: 'ios',
      scheme: 'castigoal-test',
    });

    expect(buildPasswordRecoveryRedirectUrl()).toBe('castigoal-test://reset-password');
  });

  test('builds the web password recovery URL using Linking.createURL', () => {
    const { buildPasswordRecoveryRedirectUrl, createURL } = loadAuthDeepLinksModule({
      os: 'web',
      createURL: 'https://castigoal.app/reset-password',
    });

    expect(buildPasswordRecoveryRedirectUrl()).toBe('https://castigoal.app/reset-password');
    expect(createURL).toHaveBeenCalledWith('/reset-password');
  });

  test('parses valid password recovery links from fragments', () => {
    const { parsePasswordRecoveryLink } = loadAuthDeepLinksModule({
      os: 'android',
    });

    expect(
      parsePasswordRecoveryLink(
        'castigoal://reset-password#access_token=token-1&refresh_token=token-2&type=recovery',
      ),
    ).toEqual({
      kind: 'success',
      accessToken: 'token-1',
      refreshToken: 'token-2',
    });
  });

  test('returns a friendly message for expired recovery links', () => {
    const { parsePasswordRecoveryLink } = loadAuthDeepLinksModule({
      os: 'android',
    });

    expect(
      parsePasswordRecoveryLink(
        'castigoal://reset-password#error_code=otp_expired&error_description=Token%20expired',
      ),
    ).toEqual({
      kind: 'error',
      message: 'El enlace de recuperaci\u00f3n ha caducado. Solicita un correo nuevo para continuar.',
    });
  });

  test('returns null when the link is not a valid recovery link', () => {
    const { parsePasswordRecoveryLink } = loadAuthDeepLinksModule({
      os: 'android',
    });

    expect(parsePasswordRecoveryLink('castigoal://reset-password?type=signup')).toBeNull();
    expect(parsePasswordRecoveryLink(null)).toBeNull();
  });
});
