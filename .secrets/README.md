Do NOT commit secrets to this repository.

Store service account JSON files and other credentials outside of the repository.

Recommended approaches:

- Use environment variables (set GOOGLE_SERVICE_ACCOUNT_FILE to path and GOOGLE_SHEETS_ID to sheet id).
- Use your platform's secret manager for production (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault).
- Keep a local `.env` for development and add it to `.gitignore`.

If you need to share credentials with a teammate, use a secure channel (encrypted archive or secrets manager), not git.
