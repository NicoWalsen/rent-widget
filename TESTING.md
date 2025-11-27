# Testing Guide

This document describes the testing infrastructure and setup for the rent-widget application.

## Test Coverage

Current coverage: **88.2%**

- Statements: 88.2%
- Branches: 100%
- Functions: 87.5%
- Lines: 88.2%

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
__tests__/
├── unit/                      # Unit tests
│   ├── api/                   # API route tests
│   │   ├── predict.test.ts
│   │   ├── predict-ml.test.ts
│   │   └── admin-data.test.ts
│   └── middleware.test.ts     # Authentication middleware tests
├── integration/               # Integration tests
│   └── api-routes.test.ts
└── components/                # Component tests
    ├── WidgetPage.test.tsx
    └── AdminPage.test.tsx
```

## What's Tested

### API Routes (100% coverage)
- `/api/predict`: POST/GET endpoints with percentile calculations
- `/api/predict-ml`: ML prediction endpoint
- `/api/admin-data`: Admin dashboard data aggregation

### Middleware (100% coverage)
- Authentication and authorization
- Security tests for admin access control

### Components (100% coverage)
- Widget page: Form handling, API integration, error states
- Admin page: Data fetching, chart rendering

### Integration Tests
- Full request-response cycles with mocked Prisma
- Cross-route consistency tests
- Real-world scenario testing

## Testing Stack

- **Jest**: Test runner and framework
- **ts-jest**: TypeScript support for Jest
- **React Testing Library**: Component testing utilities
- **@edge-runtime/jest-environment**: Edge runtime for Next.js API routes
- **@testing-library/user-event**: User interaction simulation

## CI/CD Integration (Optional)

To enable automated testing in GitHub Actions, create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
        continue-on-error: true
      - run: npm test -- --coverage --watchAll=false

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report-${{ matrix.node-version }}
          path: coverage/
```

Note: This workflow file requires `workflows` permission to commit via GitHub App.

## Key Testing Features

- ✅ Input validation and error handling
- ✅ Database operations (mocked Prisma)
- ✅ Mathematical accuracy (percentiles, rent calculations)
- ✅ Security (authentication flow)
- ✅ User interactions (form submission, loading states)
- ✅ API integration and error states
- ✅ Edge cases (empty database, single listing, large datasets)
- ✅ Special characters in comuna names (e.g., Ñuñoa)
- ✅ Case-insensitive searches
- ✅ CLP number formatting
