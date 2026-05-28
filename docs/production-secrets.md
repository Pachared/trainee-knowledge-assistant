# Production secret handling

The application reads sensitive values from normal environment variables in development and from Docker secret files in production.

Supported secret file variables:

- `OPENAI_API_KEY_FILE`
- `OPENAI_API_KEYS_FILE`
- `SESSION_SECRET_FILE`
- `MOCK_ADMIN_USERNAME_FILE`
- `MOCK_ADMIN_PASSWORD_FILE`

For Docker Compose, copy `docker-compose.secrets.example.yml` into your deployment config and create local secret files under `./secrets/`. The `secrets/` directory is ignored by git.

Run with both files:

```bash
docker compose -f docker-compose.yml -f docker-compose.secrets.example.yml up --build
```

For managed production platforms, map the platform secret manager output to either the regular env var or the matching `_FILE` env var. Do not commit real secret values.
