# Security Configuration

This directory contains templates for configuration files. For security reasons, actual configuration files are not committed to the repository.

## Required Configuration Files

1. Environment Variables (`.env`)
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

2. Google Service Account
   - Create `service-account.json` from Google Cloud Console
   - Place in project root
   - Add to .gitignore

3. JavaScript Configurations
   ```bash
   # Orders configuration
   cp static/scripts/orders/fabric.config.example.js static/scripts/orders/fabric.config.js
   cp static/scripts/orders/tailor.config.example.js static/scripts/orders/tailor.config.js
   cp static/scripts/orders/fabric_tailor.config.example.js static/scripts/orders/fabric_tailor.config.js
   
   # Expenses configuration
   cp static/scripts/expenses/expenses.config.example.js static/scripts/expenses/expenses.config.js
   ```

## Security Guidelines

1. Never commit sensitive files:
   - `.env` files (except .env.example)
   - Service account JSON files
   - Configuration files with API keys/URLs
   - Log files
   - Build artifacts

2. Use environment variables for sensitive data:
   - API keys
   - Database credentials
   - Secret keys
   - Service account paths

3. Keep example files up to date:
   - Update .env.example when adding new variables
   - Update .config.example.js files when changing structure
   - Document all required configurations

4. Local development:
   - Use .env.development for local settings
   - Use mock data when possible (MOCK_SHEETS=True)
   - Keep sensitive URLs in local config files

## File Structure

```
├── .env.example              # Template for environment variables
├── .env                      # Local environment variables (not committed)
├── service-account.json      # Google service account (not committed)
├── static/scripts/
│   ├── orders/
│   │   ├── *.config.example.js  # Templates for order configs
│   │   └── *.config.js          # Local configs (not committed)
│   └── expenses/
│       ├── *.config.example.js  # Templates for expense configs
│       └── *.config.js          # Local configs (not committed)
```
