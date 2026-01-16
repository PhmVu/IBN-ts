// Mock Redis globally to prevent connection in tests
jest.mock('../src/config/redis', () => {
    const mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        ttl: jest.fn(),
        on: jest.fn(),
        quit: jest.fn(() => Promise.resolve()),
        disconnect: jest.fn(),
    };
    return mockRedis;
});

// Cleanup after all tests
afterAll(async () => {
    // Close any open handles
    await new Promise(resolve => setTimeout(resolve, 500));
});
