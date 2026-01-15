# Security Upgrade: JWT Verification Migration

## Summary

Your backend has been upgraded from symmetric (HS256) to asymmetric (RS256/ES256) JWT verification using JWKS (JSON Web Key Set). This significantly improves security by ensuring the JWT signing private key never leaves Supabase.

## What Changed

### 1. JWT Verification (High Priority) ✅ COMPLETED
- **Before**: Used shared `SUPABASE_JWT_SECRET` (HS256 symmetric)
- **After**: Fetches public keys from JWKS endpoint (RS256/ES256 asymmetric)
- **Benefit**: Private key stays with Supabase, public keys can be freely distributed

### 2. JWKS Caching (Medium Priority) ✅ COMPLETED
- **Implementation**: Added `@lru_cache` decorator to `get_jwks()` function
- **Benefit**: JWKS is fetched once at startup, reducing latency and external requests

### 3. RLS Performance Index (Medium Priority) ✅ COMPLETED
- **Implementation**: Created migration `001_add_rls_index.sql`
- **Benefit**: Speeds up RLS policy checks that query `app_owner.user_id`

### 4. Environment Variable Cleanup (Low Priority) ✅ COMPLETED
- **Change**: `SUPABASE_JWT_SECRET` is now optional and deprecated
- **Action Required**: You can remove this from your `.env` file

## Migration Steps

### Step 1: Install New Dependencies
```bash
cd backend
pip install "python-jose[cryptography]>=3.3.0" "requests>=2.31.0"
# Or if using uv:
uv sync
```

### Step 2: Apply Database Migration
Choose one method:

**Option A: Supabase Dashboard**
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to SQL Editor
3. Paste contents of `migrations/001_add_rls_index.sql`
4. Run the query

**Option B: Command Line**
```bash
# Using Supabase CLI
supabase db execute --file migrations/001_add_rls_index.sql

# Or using psql
psql $DATABASE_URL -f migrations/001_add_rls_index.sql
```

### Step 3: Update Environment Variables
Open your `.env` file and remove the line:
```bash
SUPABASE_JWT_SECRET=...
```

The backend will now automatically fetch public keys from:
```
https://xdelhydjsongonqzwhge.supabase.co/auth/v1/.well-known/jwks.json
```

### Step 4: Restart Backend
```bash
# If using Docker:
docker-compose restart api

# If running directly:
uvicorn app.main:app --reload
```

## Verification

### 1. Test JWT Verification
```bash
# Make an authenticated request to any endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/v1/contacts
```

If you see data (not an auth error), JWT verification is working!

### 2. Verify Index was Created
Run this SQL in Supabase Dashboard:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'app_owner';
```

You should see `idx_app_owner_user_id` in the results.

## Rollback Plan (If Needed)

If something goes wrong, you can temporarily rollback:

1. **Revert security.py**:
```python
# Change line 90-95 back to:
payload: dict[str, Any] = jwt.decode(
    token,
    settings.supabase_jwt_secret,
    algorithms=["HS256"],
    audience="authenticated",
)
```

2. **Re-add JWT secret** to `.env`:
```bash
SUPABASE_JWT_SECRET=6kGwf+8f...
```

3. **Restart the backend**

## Technical Details

### JWKS Endpoint
The backend now fetches public keys from:
```
https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

Example response:
```json
{
  "keys": [
    {
      "kty": "EC",
      "kid": "3a18cfe2-7226-43b0-bbb4-7c5242f2406e",
      "crv": "P-256",
      "x": "gyLVvp9dyEgylYH7nR2E2qdQ_-9Pv5i1tk7c2qZD4Nk",
      "y": "CD9RfYOTyjR5U-PC9UDlsthRpc7vAQQQ2FTt8UsX0fY"
    }
  ]
}
```

### Supported Algorithms
- **RS256**: RSA signature with SHA-256
- **ES256**: ECDSA signature with SHA-256 (P-256 curve)

### Cache Behavior
- JWKS is fetched once when the first JWT is verified
- Cached for the lifetime of the application
- Cleared on application restart
- Consider adding TTL refresh if keys rotate frequently

## Security Improvements

| Aspect | Before (HS256) | After (RS256/ES256) |
|--------|----------------|----------------------|
| Key distribution | Shared secret must be kept on both sides | Public key can be freely distributed |
| Key rotation | Requires backend restart & config update | Automatic via JWKS endpoint |
| Attack surface | Secret leakage allows token forgery | Only public key exposed, can't forge tokens |
| Scalability | Secret must be distributed to all services | Services fetch public key independently |

## Questions?

If you encounter any issues:
1. Check that JWKS endpoint is accessible: `curl https://xdelhydjsongonqzwhge.supabase.co/auth/v1/.well-known/jwks.json`
2. Verify dependencies are installed: `pip list | grep jose`
3. Check logs for JWT verification errors
4. Ensure your Supabase project has ECC keys enabled (Settings → API → JWT Settings)

## References
- [Supabase JWT Verification Docs](https://supabase.com/docs/guides/auth/jwts)
- [python-jose Documentation](https://python-jose.readthedocs.io/)
- [RFC 7517 - JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
