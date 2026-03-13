# Testing Strategy

Based on [Kent C. Dodds' Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) and [Martin Fowler's Microservice Testing](https://martinfowler.com/articles/microservice-testing/).

## Testing Pyramid

```
        /\
       /  \     E2E Tests (few, high confidence)
      /----\    ---------------------------
     /      \   Integration Tests (more)
    /--------\  ---------------------------
   /          \ Unit Tests (most, fast)
  /____________\
```

## Test Types

### 1. Unit Tests (`tests/unit/`)
- **Purpose**: Test individual functions/classes in isolation
- **Speed**: Fast (< 100ms per test)
- **Mocking**: Heavy use of mocks for dependencies
- **Examples**: Pricing calculations, state machines, validators

### 2. Integration Tests (`tests/integration/`)
- **Purpose**: Test multiple units working together
- **Speed**: Medium (< 1s per test)
- **Mocking**: Mock external services (DB, APIs)
- **Examples**: Service layer with mocked database

### 3. E2E Tests (`tests/e2e/`)
- **Purpose**: Test complete user flows
- **Speed**: Slow (real HTTP requests, real DB)
- **Mocking**: Minimal - use test containers/staging
- **Examples**: Full booking flow from signup to completion

## Test Data Management

- **Fixtures**: Static test data in `tests/fixtures/`
- **Factories**: Dynamic test data generation
- **Cleanup**: Each test cleans up after itself

## Running Tests

```bash
# All tests
npm test

# Unit only
npm run test:unit

# Integration only
npm run test:integration

# E2E only
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Best Practices

1. **Test Behavior, Not Implementation** - Tests should survive refactoring
2. **AAA Pattern**: Arrange, Act, Assert
3. **One Assertion Per Test** (ideally)
4. **Descriptive Test Names**: "should [expected behavior] when [condition]"
5. **Fast Feedback**: Unit tests must be fast
6. **Deterministic**: Tests should never be flaky