import type { Config } from 'jest';

const config: Config = {
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  projects: [
    {
      displayName: 'edge',
      testEnvironment: '@edge-runtime/jest-environment',
      testMatch: [
        '<rootDir>/__tests__/unit/api/**/*.test.ts',
        '<rootDir>/__tests__/unit/middleware.test.ts',
        '<rootDir>/__tests__/integration/**/*.test.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          tsconfig: {
            module: 'esnext',
          },
        }],
      },
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/__tests__/components/**/*.test.tsx',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
    },
  ],
};

export default config;
