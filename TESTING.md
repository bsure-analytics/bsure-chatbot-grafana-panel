# Testing Strategy

This document outlines the comprehensive testing approach for the b.sure Chatbot Grafana Panel plugin.

## Overview

Our testing strategy ensures robust functionality, security, and performance across all components:

- **Frontend React Components** (Unit & Integration Tests)
- **Backend Go API** (Unit & Security Tests)
- **End-to-End User Workflows** (E2E Tests)
- **Security & Performance** (Specialized Tests)

## Test Structure

```
/src/__tests__/
└── constants.test.ts               # Core validation and security tests

/pkg/plugin/
└── plugin_simple_test.go           # Backend API tests

/tests/
└── panel.spec.ts                   # End-to-end Playwright tests
```

## Test Categories

### 1. Core Tests (`constants.test.ts`)

**Validation & Security Testing:**

- ✅ Validation limits and constants
- ✅ Dashboard UID format validation
- ✅ XSS pattern detection
- ✅ Message role validation
- ✅ String sanitization logic

**Security Focus:**

- Script tag removal and sanitization
- Event handler stripping (`onclick`, `onerror`)
- JavaScript URL prevention
- Input validation patterns
- Content length limits

### 2. Backend Tests (`plugin_simple_test.go`)

**API Endpoint Validation:**

- ✅ HTTP method validation (POST only)
- ✅ Request body sanitization and limits
- ✅ Environment variable security (API key)
- ✅ Concurrent request handling
- ✅ Error response formatting
- ✅ Performance benchmarking

**Security Testing:**

- API key validation and protection
- Request size limiting (1MB max)
- Input sanitization for all fields
- Role validation for chat messages
- Content length enforcement

### 3. E2E Tests (`panel.spec.ts`)

**Real Browser Testing:**

- ✅ Panel installation and configuration
- ✅ User interaction workflows
- ✅ Responsive design validation
- ✅ Keyboard accessibility
- ✅ Error state handling in production environment

## Running Tests

### Frontend Tests

```bash
# Run all Jest tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:ci

# Run with coverage
npm run test:ci -- --coverage
```

### Backend Tests

```bash
# Run Go tests
go test ./pkg/plugin/...

# Run with coverage
go test -cover ./pkg/plugin/...

# Run benchmarks
go test -bench=. ./pkg/plugin/...
```

### E2E Tests

```bash
# Start development server first
npm run server

# Run E2E tests
npm run e2e
```

### All Tests

```bash
# Complete test suite
npm run test:ci && go test ./pkg/plugin/... && npm run e2e
```

## Coverage Goals

| Component        | Target Coverage | Focus Areas                         |
| ---------------- | --------------- | ----------------------------------- |
| React Components | 90%+            | User interactions, error states     |
| Backend API      | 95%+            | Security validation, error handling |
| Integration      | 85%+            | End-to-end workflows                |
| Security         | 100%            | XSS prevention, input validation    |

## Security Testing Philosophy

### 1. Input Validation

- **Every input is validated** at both frontend and backend
- **Length limits enforced** to prevent DoS attacks
- **Format validation** for structured data (UIDs, roles)

### 2. XSS Prevention

- **Content sanitization** removes dangerous HTML/JavaScript
- **Safe rendering** in React prevents script execution
- **Output encoding** for user-generated content

### 3. API Security

- **Environment variables** protect sensitive data (API keys)
- **Request limiting** prevents abuse
- **Error sanitization** prevents information disclosure

### 4. Authentication & Authorization

- **Backend-only API access** keeps credentials secure
- **Grafana integration** leverages existing auth
- **Resource isolation** per dashboard/panel

## Performance Testing

### 1. Load Testing

- **Concurrent requests** to backend API
- **Large dataset processing** in frontend
- **Memory usage monitoring** during extended use

### 2. Benchmarks

- **API response times** under various loads
- **Data processing speed** for dashboard enrichment
- **Component render performance** with large chat histories

## Continuous Integration

### Test Pipeline

```yaml
1. Install dependencies (npm install)
2. Lint code (npm run lint)
3. Type check (npm run typecheck)
4. Run unit tests (npm run test:ci)
5. Run backend tests (go test)
6. Build plugin (npm run build:all)
7. Run E2E tests (npm run e2e)
```

### Quality Gates

- ✅ All tests must pass
- ✅ Coverage thresholds met
- ✅ No linting errors
- ✅ No TypeScript errors
- ✅ Successful E2E scenarios

## Test Data & Mocking

### Frontend Mocks

- **Grafana Runtime**: Mocked `getBackendSrv()` and `useTheme2()`
- **API Responses**: Controlled responses for different scenarios
- **Dashboard Data**: Sample panel configurations and data

### Backend Mocks

- **HTTP Requests**: Test server for API validation
- **Environment Variables**: Controlled API key scenarios
- **External APIs**: Groq API responses mocked for reliability

## Debugging Test Issues

### Frontend Issues

```bash
# Run specific test file
npm test ChatbotPanel.test.tsx

# Debug with console output
npm test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Backend Issues

```bash
# Verbose test output
go test -v ./pkg/plugin/...

# Debug specific test
go test -run TestHandleGroqChat -v ./pkg/plugin/...
```

### E2E Issues

```bash
# Run in headed mode (see browser)
npm run e2e -- --headed

# Debug specific test
npm run e2e -- --grep "should load chatbot panel"

# Generate test traces
npm run e2e -- --trace on
```

## Adding New Tests

### 1. Frontend Component Tests

- Create test file: `ComponentName.test.tsx`
- Mock external dependencies
- Test user interactions and edge cases
- Verify accessibility features

### 2. Backend API Tests

- Add test cases to `plugin_test.go`
- Cover security scenarios
- Test error conditions
- Include performance benchmarks

### 3. E2E Tests

- Add scenarios to `panel.spec.ts`
- Test real user workflows
- Verify integration points
- Check responsive behavior

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Initialize git (required for Jest watch mode)
git init

# Set environment variables for testing
export GROQ_API_KEY="test-key-for-e2e"
```

### IDE Configuration

- **VS Code**: Use Jest extension for test debugging
- **WebStorm**: Built-in Jest and Go test runners
- **Test Coverage**: Enable coverage reporting in IDE

This comprehensive testing strategy ensures the b.sure Chatbot Grafana Panel is robust, secure, and performs well under all conditions while maintaining excellent user experience.
