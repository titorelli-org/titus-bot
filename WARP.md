# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Titus Bot is a TypeScript-based Telegram anti-spam bot that integrates with the Titorelli service ecosystem. It uses the Grammy framework for Telegram bot functionality and implements multi-layered spam detection including CAS (Combot Anti-Spam) integration, duplicate detection, and ML-based classification.

## Development Commands

### Build and Development
```bash
# Build the application (bundles with ncc)
npm run bundle

# Run in development mode with pretty logging
npm run dev

# Update all dependencies to latest versions
npx npm-check-updates -u
```

### Docker Operations
```bash
# Build and run with Docker Compose
docker compose up --build

# Build Docker image for production
docker build -t titus-bot .

# Build for different architecture (e.g., for cloud deployment)
docker build --platform=linux/amd64 -t titus-bot .
```

## Architecture Overview

### Core Components

**Bot Class (`src/lib/Bot.ts`)**
- Main bot orchestrator using Grammy framework
- Handles Telegram webhook events and message processing
- Implements three-tier spam detection pipeline:
  1. CAS (Combot Anti-Spam) check
  2. Duplicate detection
  3. ML classifier prediction
- Manages client connections to Titorelli services (CAS and Model)
- Includes telemetry integration for monitoring

**Liveness Reporter (`src/lib/Liveness.ts`)**
- Periodic health check reporter using reactive-poller
- Reports bot status to Titorelli service endpoint
- Handles backoff and retry logic for failed reports

**Environment Configuration (`src/lib/env.ts`)**
- Uses envalid for type-safe environment variable validation
- Required variables: `BOT_TOKEN`, `TITORELLI_HOST`, `CAS_ORIGIN`, `TELEMETRY_ORIGIN`, `TITORELLI_CLIENT_ID`, `TITORELLI_ACCESS_TOKEN`, `INITIAL_ACCESS_TOKEN`

**Message Templates (`src/lib/OutgoingMessageTemplate.ts`)**
- Template engine for bot responses with parameter substitution
- Handles text formatting and whitespace normalization

### Service Integration

The bot integrates with multiple Titorelli microservices:
- **CAS Service**: User ban status checking and totem protection
- **Model Service**: ML-based spam classification
- **Telemetry Service**: Usage analytics and monitoring
- **Service Discovery**: Dynamic service endpoint resolution

### Message Processing Pipeline

1. **Message Reception**: Bot receives Telegram message/member events
2. **CAS Check**: Query CAS service for user ban status
3. **Duplicate Detection**: Check for repeated content patterns  
4. **ML Classification**: Send text to model service for spam/ham prediction
5. **Action Execution**: Delete message and/or ban user based on results
6. **Totem Granting**: Protect legitimate users from future checks

### Build System

- **TypeScript**: Strict type checking enabled
- **@vercel/ncc**: Bundles the application into a single executable file in `dist/`
- **Multi-stage Docker**: Optimized production container with non-root user

## Key Dependencies

- `telegraf` / `grammy`: Telegram Bot API framework
- `@titorelli/client`: Service integration SDK
- `@titorelli/telemetry-client`: Analytics and monitoring
- `reactive-poller`: Reliable periodic task execution
- `pino`: Structured logging with pretty printing support
- `envalid`: Environment variable validation

## Development Notes

- The bot uses Grammy's middleware system for telemetry and request processing
- Service clients are lazily initialized and cached for performance
- All external service calls include proper error handling and logging
- The application is designed to be stateless and container-friendly
- Logging includes structured data for observability

## Environment Setup

Create a `.env` file with the required environment variables listed in `src/lib/env.ts`. The bot requires proper authentication tokens for Titorelli services and a valid Telegram bot token.

## Common Issues

### Authentication Errors (401 Unauthorized)

If you see 401 errors in the logs when starting the bot:

```
ERROR: Axios error - Request failed with status code 401
```

**Root Cause**: The authentication issue was caused by a mismatch in the `INITIAL_ACCESS_TOKEN` between titus-bot and cas-service.

**Solution**: Both services must use the **same `INITIAL_ACCESS_TOKEN`** for the OIDC client registration flow to work:

**How OIDC Authentication Works**:
1. Titus-bot makes a request to cas-service and gets 401
2. Axios interceptor reads the `WWW-Authenticate` header for OAuth metadata
3. It registers as an OIDC client using the `INITIAL_ACCESS_TOKEN`
4. Gets a JWT access token and retries the request
5. Subsequent requests use the cached JWT token

**Graceful Degradation**: The bot includes error handling to continue operating with reduced functionality when authentication fails. It will log warnings like:
- `"CAS service unavailable (authentication issue), allowing message"`
- `"Model service unavailable (authentication issue), defaulting to ham"`

### Development Mode

For development without valid Titorelli service access, the bot will:
- Allow all messages through (bypassing spam detection)
- Log authentication errors as warnings instead of crashing
- Continue processing Telegram bot functionality
