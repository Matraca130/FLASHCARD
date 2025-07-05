import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('../../apiClient.js', () => ({
  api: vi.fn()
}));

vi.mock('../../store/store.js', () => ({
  store: {
    setState: vi.fn(),
    getState: vi.fn(() => ({}))
  }
}));

vi.mock('../../dashboard.service.js', () => ({
  loadDashboardData: vi.fn()
}));

vi.mock('../../utils/validation.js', () => ({
  validateLoginCredentials: vi.fn(),
  validateRegistrationData: vi.fn()
}));

vi.mock('../../utils/apiHelpers.js', () => ({
  performCrudOperation: vi.fn()
}));

vi.mock('../../utils/helpers.js', () => ({
  showNotification: vi.fn()
}));

describe('Auth Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('checkAuthStatus', () => {
    it('should return early if no token exists', async () => {
      localStorage.getItem.mockReturnValue(null);
      
      // Import after mocks are set up
      const { checkAuthStatus } = await import('../../auth.service.js');
      
      await checkAuthStatus();
      
      expect(localStorage.getItem).toHaveBeenCalledWith('authToken');
    });

    it('should verify token when token exists', async () => {
      localStorage.getItem.mockReturnValue('fake-token');
      
      const { api } = await import('../../apiClient.js');
      api.mockResolvedValue({ user: { id: 1, email: 'test@example.com' } });
      
      const { checkAuthStatus } = await import('../../auth.service.js');
      
      await checkAuthStatus();
      
      expect(api).toHaveBeenCalledWith('/api/auth/verify');
    });
  });

  describe('login', () => {
    it('should validate credentials before attempting login', async () => {
      const { validateLoginCredentials } = await import('../../utils/validation.js');
      validateLoginCredentials.mockReturnValue(false);
      
      const { login } = await import('../../auth.service.js');
      
      await login('invalid-email', '');
      
      expect(validateLoginCredentials).toHaveBeenCalledWith('invalid-email', '');
    });

    it('should call performCrudOperation when credentials are valid', async () => {
      const { validateLoginCredentials } = await import('../../utils/validation.js');
      const { performCrudOperation } = await import('../../utils/apiHelpers.js');
      
      validateLoginCredentials.mockReturnValue(true);
      performCrudOperation.mockResolvedValue({ success: true });
      
      const { login } = await import('../../auth.service.js');
      
      await login('test@example.com', 'password123');
      
      expect(validateLoginCredentials).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(performCrudOperation).toHaveBeenCalled();
    });
  });
});

