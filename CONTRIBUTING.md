# Contributing to Qwen Swarm

Thank you for your interest in contributing to Qwen Swarm! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Getting Started

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/YOUR_USERNAME/qwen-swarm.git
   cd qwen-swarm
   ```

2. **Set Up Development Environment**
   ```bash
   # Install dependencies
   npm install

   # Copy environment variables
   cp .env.example .env

   # Start development services
   npm run dev
   ```

3. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Workflow

#### Code Style and Standards

- **TypeScript**: All new code must be written in TypeScript
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Use the provided Prettier configuration
- **Conventional Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) specification

#### Commit Message Format

```
type(scope): description

feat(core): add queen agent orchestration
fix(api): resolve authentication timeout issue
docs(readme): update installation instructions
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

#### Testing Requirements

1. **Unit Tests**
   ```bash
   npm run test:unit
   ```

2. **Integration Tests**
   ```bash
   npm run test:integration
   ```

3. **E2E Tests**
   ```bash
   npm run test:e2e
   ```

4. **Coverage**
   ```bash
   npm run test:coverage
   ```

   **Minimum coverage requirements:**
   - Statements: 80%
   - Branches: 75%
   - Functions: 80%
   - Lines: 80%

#### Code Review Process

1. **Self-Review**
   - Ensure your code follows project standards
   - Add necessary tests
   - Update documentation

2. **Pull Request**
   - Create a detailed PR description
   - Link related issues
   - Add screenshots for UI changes
   - Ensure CI passes

3. **Review Requirements**
   - At least one maintainer approval
   - All automated checks must pass
   - Address review feedback promptly

## 🏗️ Project Structure

```
qwen-swarm/
├── src/                    # Source code
│   ├── agents/            # Agent implementations
│   ├── api/               # API routes and handlers
│   ├── core/              # Core system components
│   ├── providers/         # AI provider integrations
│   └── security/          # Security components
├── frontend/              # Frontend application
├── docs/                  # Documentation
├── tests/                 # Test files
└── scripts/               # Build and deployment scripts
```

## 🎯 Contribution Areas

### High Priority Areas

1. **Core Agent System**
   - Queen agent optimization
   - Worker agent performance
   - Memory coordination improvements

2. **Provider Integrations**
   - New AI provider support
   - Provider error handling
   - Performance optimizations

3. **Frontend Development**
   - UI/UX improvements
   - Real-time dashboard features
   - Mobile responsiveness

4. **Testing & Quality**
   - Test coverage improvements
   - Performance benchmarks
   - Security testing

### Documentation Contributions

1. **API Documentation**
   - REST API endpoints
   - WebSocket events
   - Authentication flows

2. **User Guides**
   - Installation tutorials
   - Configuration examples
   - Troubleshooting guides

3. **Developer Documentation**
   - Architecture guides
   - Component documentation
   - Best practices

## 🛠️ Development Guidelines

### Code Standards

#### TypeScript Guidelines

```typescript
// Use interfaces for type definitions
interface AgentConfig {
  id: string;
  type: AgentType;
  capabilities: string[];
}

// Use proper error handling
try {
  const result = await agent.execute(task);
  return result;
} catch (error) {
  logger.error('Agent execution failed', { error, taskId: task.id });
  throw new AgentExecutionError(`Failed to execute task: ${task.id}`, error);
}

// Use dependency injection
class AgentService {
  constructor(
    private readonly database: Database,
    private readonly logger: Logger
  ) {}
}
```

#### Performance Guidelines

- **Async/Await**: Use async/await for asynchronous operations
- **Memory Management**: Properly dispose of resources
- **Caching**: Implement appropriate caching strategies
- **Error Handling**: Implement comprehensive error handling

### Security Guidelines

1. **Input Validation**: Validate all user inputs
2. **Authentication**: Implement proper authentication flows
3. **Authorization**: Use role-based access control
4. **Secrets Management**: Never commit secrets to version control

## 🐛 Bug Reports

### Reporting Bugs

1. **Search Existing Issues**: Check if the bug has already been reported
2. **Use Bug Report Template**: Fill out the provided template
3. **Provide Reproduction Steps**: Include clear steps to reproduce
4. **Include Environment Details**: OS, Node version, browser version
5. **Add Logs/Metrics**: Include relevant logs or metrics

### Bug Fix Process

1. **Create Issue**: Document the bug with details
2. **Assign to Milestone**: Target appropriate release
3. **Implement Fix**: Write code to fix the issue
4. **Add Tests**: Ensure the fix is covered by tests
5. **Documentation**: Update relevant documentation

## 💡 Feature Requests

### Proposing Features

1. **Discuss First**: Open an issue for discussion before implementation
2. **Provide Use Cases**: Explain the problem and proposed solution
3. **Consider Impact**: Assess impact on existing functionality
4. **Implementation Plan**: Outline proposed implementation approach

### Feature Implementation

1. **Design Document**: Create design document for complex features
2. **Incremental Development**: Break down into smaller PRs
3. **Backward Compatibility**: Maintain compatibility when possible
4. **Migration Guide**: Provide migration instructions for breaking changes

## 📋 Pull Request Process

### Before Submitting

1. **Run Tests**: Ensure all tests pass
2. **Update Documentation**: Update relevant documentation
3. **Check Style**: Ensure code follows style guidelines
4. **Self-Review**: Review your own changes

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated Checks**: CI/CD pipeline validation
2. **Code Review**: Maintainer review and feedback
3. **Testing**: Additional testing as needed
4. **Approval**: Maintainer approval required
5. **Merge**: Merge to target branch

## 🌟 Recognition

### Contributor Recognition

- **Contributors List**: Maintained in README.md
- **Release Notes**: Acknowledged in release notes
- **Special Recognition**: Major contributors highlighted

### Ways to Contribute

- **Code**: New features, bug fixes, improvements
- **Documentation**: Guides, tutorials, API docs
- **Testing**: Test cases, bug reports
- **Community**: Support, discussions, feedback
- **Design**: UI/UX, graphics, diagrams

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Email**: max@9pros.com
- **Discord**: Community support (link available)

### Resources

- **Documentation**: `/docs` directory
- **API Reference**: API documentation
- **Examples**: Example implementations
- **Tutorials**: Step-by-step guides

## 📄 License

By contributing to Qwen Swarm, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Qwen Swarm! Your contributions help make this project better for everyone.