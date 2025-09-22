# Contributing to GalaSwap Trading Bot

Thank you for your interest in contributing to the GalaSwap Trading Bot! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Types of Contributions

We welcome several types of contributions:

- **🐛 Bug Reports**: Help us identify and fix issues
- **✨ Feature Requests**: Suggest new functionality
- **📝 Documentation**: Improve guides and documentation
- **🔧 Code Contributions**: Submit bug fixes or new features
- **🧪 Testing**: Help test new features and report issues

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Git
- A GalaChain wallet (for testing)
- Basic understanding of JavaScript/Node.js

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/yourusername/galaswap-trading-bot.git
   cd galaswap-trading-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install @gala-chain/gswap-sdk
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-description
   ```

4. **Make Your Changes**
   - Follow the coding standards
   - Add tests if applicable
   - Update documentation

5. **Test Your Changes**
   ```bash
   # Start the server
   node real-trading-server.js
   
   # Open the interface
   start galaswap-trading-bot.html
   
   # Test your changes thoroughly
   ```

6. **Submit a Pull Request**
   - Push your branch to your fork
   - Create a pull request on GitHub
   - Provide a clear description of your changes

## 📝 Coding Standards

### JavaScript/Node.js

- Use **ES6+** features where appropriate
- Follow **camelCase** for variables and functions
- Use **const** and **let** instead of **var**
- Add **JSDoc** comments for functions
- Handle errors gracefully with try-catch blocks

### HTML/CSS

- Use **semantic HTML** elements
- Follow **BEM** methodology for CSS classes
- Use **CSS Grid** and **Flexbox** for layouts
- Ensure **responsive design** for mobile devices

### General Guidelines

- Write **clear, readable code**
- Add **comments** for complex logic
- Use **meaningful variable names**
- Keep **functions small** and focused
- Follow **DRY** (Don't Repeat Yourself) principle

## 🐛 Reporting Bugs

### Before Reporting

1. **Check existing issues** to avoid duplicates
2. **Test with latest version** to ensure it's not already fixed
3. **Gather information** about your environment

### Bug Report Template

```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., Windows 10, macOS 12, Ubuntu 20.04]
- Node.js Version: [e.g., 18.17.0]
- Browser: [e.g., Chrome 95, Firefox 94]
- Bot Version: [e.g., 2.0.0]

## Additional Context
Any other context about the problem.
```

## ✨ Feature Requests

### Before Requesting

1. **Check existing requests** to avoid duplicates
2. **Consider the scope** - is it feasible?
3. **Think about use cases** - who would benefit?

### Feature Request Template

```markdown
## Feature Description
A clear description of the feature you'd like to see.

## Use Case
Describe the problem this feature would solve.

## Proposed Solution
Describe how you think this feature should work.

## Alternatives Considered
Describe any alternative solutions you've considered.

## Additional Context
Any other context or screenshots about the feature request.
```

## 🔧 Code Contributions

### Pull Request Process

1. **Create a Branch**
   - Use descriptive branch names
   - Include issue number if applicable

2. **Write Code**
   - Follow coding standards
   - Add tests for new features
   - Update documentation

3. **Test Thoroughly**
   - Test all functionality
   - Check for edge cases
   - Verify no regressions

4. **Submit PR**
   - Provide clear description
   - Reference related issues
   - Include screenshots if UI changes

### Pull Request Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added tests
- [ ] All tests pass

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Related Issues
Closes #(issue number)
```

## 📚 Documentation Contributions

### Types of Documentation

- **README updates**: Improve setup instructions
- **API documentation**: Document endpoints and usage
- **User guides**: Step-by-step tutorials
- **Code comments**: Inline documentation

### Documentation Standards

- Use **clear, concise language**
- Include **code examples** where helpful
- Add **screenshots** for UI changes
- Keep **up-to-date** with code changes

## 🧪 Testing

### Testing Guidelines

- **Test all new features** thoroughly
- **Test edge cases** and error conditions
- **Verify backward compatibility**
- **Test on different browsers** if UI changes

### Test Environment

- Use **testnet** for blockchain testing
- Use **small amounts** for real trading tests
- **Document test results**
- **Report any issues** found during testing

## 🏷️ Release Process

### Version Numbering

We use **Semantic Versioning** (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Release notes prepared

## 🤔 Questions?

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Discord**: Join our community server (if available)

### Code of Conduct

- **Be respectful** and inclusive
- **Be constructive** in feedback
- **Be patient** with newcomers
- **Be collaborative** in discussions

## 🎉 Recognition

Contributors will be:
- **Listed in CONTRIBUTORS.md**
- **Mentioned in release notes**
- **Given credit** in relevant documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to GalaSwap Trading Bot! 🚀**
