# Git Workflow - AI Study Hub

## Branches

- main: stable version for demo and submission
- develop: integration branch for development
- feature/*: task-specific branches

## Rules

1. Do not push directly to main.
2. Create feature branches from develop.
3. Pull latest develop before coding.
4. Commit small and clear changes.
5. Push feature branch to GitHub.
6. Create Pull Request into develop.
7. Leader reviews before merging.
8. Merge develop into main only after testing.

## Branch Naming

Good examples:

- feature/backend-health-api
- feature/frontend-login-page
- feature/api-contract-docs
- feature/database-design-draft
- feature/frontend-api-connection

Bad examples:

- test
- abc
- fix
- new-code

## Commit Message Examples

Good examples:

- Add health check API
- Create login page UI
- Add initial API contract
- Fix CORS configuration
- Update database design draft