# API Key Persistence - Implementation Guide

## Overview

All API keys added to SERP Vision are **automatically saved to the database** and **persist across application restarts**. This ensures you never need to re-enter your API keys after configuring them once.

## 🎯 Key Features

✅ **Automatic Database Storage** - All user-added keys are saved to MongoDB  
✅ **Persistent Across Restarts** - Keys remain active after server restart  
✅ **Multi-Provider Support** - Both SerpAPI and Google Custom Search keys are persisted  
✅ **Usage Tracking** - Daily/monthly usage counts are preserved  
✅ **Priority Management** - Key priority settings are maintained  
✅ **Status Preservation** - Active/paused/error status is saved  

---

## How It Works

### 1. Database Schema

The `ApiKey` MongoDB model stores all key information:

```typescript
{
  keyId: string;              // Unique identifier (e.g., "user_serpapi_1234567890")
  apiKey: string;             // The actual API key (stored securely)
  provider: string;           // 'serpapi' or 'google_custom_search'
  cseId?: string;            // Google Custom Search Engine ID (optional)
  dailyLimit: number;        // Daily usage limit
  monthlyLimit: number;      // Monthly usage limit
  usedToday: number;         // Current daily usage
  usedThisMonth: number;     // Current monthly usage
  status: string;            // 'active', 'exhausted', 'error', 'paused'
  priority: number;          // Key priority (1 = highest)
  lastUsed: Date;            // Last usage timestamp
  errorCount: number;        // Number of errors encountered
  successRate: number;       // Success rate percentage (0-100)
  monthlyResetAt: Date;      // Next monthly reset date
  isUserAdded: boolean;      // true for user-added, false for env keys
  createdAt: Date;           // Creation timestamp
  updatedAt: Date;           // Last update timestamp
}
```

### 2. Key Loading Process

When the application starts, the `SerpApiPoolManager` loads keys in this order:

**Step 1: Environment Keys**
- Loads keys from `.env` file (SERPAPI_KEY_1, SERPAPI_KEY_2, etc.)
- These are marked as `isUserAdded: false`

**Step 2: Database Keys**
- Queries MongoDB for all keys where `isUserAdded: true`
- Restores all user-added keys with their usage data
- Skips duplicates (if same key exists in environment)

**Step 3: Usage Restoration**
- Restores daily/monthly usage counts
- Restores status (active/paused/error)
- Restores priority and success rate
- Resets 'exhausted' status to 'active' on startup

### 3. Key Addition Flow

When you add a new API key:

```
User adds key via API/UI
        ↓
Key is validated (test request)
        ↓
Key added to in-memory pool
        ↓
Key saved to MongoDB with isUserAdded=true
        ↓
✅ Key persists permanently
```

---

## Usage Examples

### Adding a SerpAPI Key

**Via API:**
```bash
curl -X POST http://localhost:5000/api/keys/add \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_serpapi_key_here",
    "dailyLimit": 250,
    "monthlyLimit": 5000
  }'
```

**Via PowerShell:**
```powershell
$body = @{
    apiKey = "your_serpapi_key_here"
    dailyLimit = 250
    monthlyLimit = 5000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/keys/add" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

### Adding a Google Custom Search Key

**Via API:**
```bash
curl -X POST http://localhost:5000/api/keys/add \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "AIzaSyAbc123...",
    "provider": "google_custom_search",
    "cseId": "abc123def456:xyz789",
    "dailyLimit": 100
  }'
```

**Via TypeScript:**
```typescript
const poolManager = SerpApiPoolManager.getInstance();

// Add SerpAPI key
await poolManager.addApiKey(
  'your_serpapi_key_here',
  250,  // daily limit
  5000  // monthly limit
);

// Add Google Custom Search key
await poolManager.addGoogleCustomSearchKey(
  'AIzaSyAbc123...',
  'abc123def456:xyz789',
  100  // daily limit
);
```

### Verification After Restart

1. **Add a key:**
   ```bash
   curl -X POST http://localhost:5000/api/keys/add \
     -H "Content-Type: application/json" \
     -d '{"apiKey": "test_key_123", "dailyLimit": 100}'
   ```

2. **Check keys:**
   ```bash
   curl http://localhost:5000/api/keys/stats
   ```

3. **Restart the server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

4. **Check keys again:**
   ```bash
   curl http://localhost:5000/api/keys/stats
   ```

5. **✅ Result:** The key is still there with all usage data preserved!

---

## Database Details

### Connection

The application uses MongoDB for persistence:

```typescript
// config/database.ts
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/serp-tracker';
await mongoose.connect(mongoUri);
```

### Collection

**Collection Name:** `apikeys`  
**Model:** `ApiKeyModel`

### Indexes

For optimal performance, the following indexes are created:

- `keyId` (unique) - Fast lookups by key ID
- `status` - Filter by active/paused/error keys
- `priority` - Sort by priority
- `usedToday` - Usage-based queries

---

## Key Management Operations

### List All Keys

```bash
GET /api/keys/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalKeys": 3,
      "activeKeys": 2,
      "usedToday": 45,
      "dailyLimit": 600,
      "usedThisMonth": 1250,
      "monthlyLimit": 15000
    },
    "keys": [
      {
        "id": "user_serpapi_1234567890",
        "provider": "serpapi",
        "usedToday": 25,
        "dailyLimit": 250,
        "usedThisMonth": 850,
        "monthlyLimit": 5000,
        "status": "active",
        "priority": 1,
        "successRate": 98.5,
        "lastUsed": "2025-10-08T10:30:00Z"
      }
    ]
  }
}
```

### Update Key Settings

```bash
PUT /api/keys/update/:keyId
Content-Type: application/json

{
  "dailyLimit": 500,
  "status": "active",
  "priority": 1
}
```

### Remove Key

```bash
DELETE /api/keys/remove/:keyId
```

**⚠️ Note:** Removing a key deletes it from both:
- In-memory pool (immediate effect)
- Database (permanent deletion)

---

## Migration from Environment Variables

If you have keys in `.env` and want to migrate them to database persistence:

### Option 1: Keep Both (Recommended)

Keep environment keys for production stability and add user keys for flexibility:

```env
# .env - Production keys (always loaded)
SERPAPI_KEY_1=production_key_1
SERPAPI_KEY_2=production_key_2
SERPAPI_DAILY_LIMIT_1=5000
```

Add user keys via API for testing/development.

### Option 2: Migrate to Database

1. **Add keys via API** (they'll be stored in database)
2. **Remove from `.env`** (optional)
3. **Restart server** (keys load from database)

---

## Usage Tracking

### Daily Reset

Usage counters reset automatically at midnight (server timezone):

```typescript
// Automated daily reset
if (currentDate !== lastResetDate) {
  for (const key of apiKeys) {
    key.usedToday = 0;
    await ApiKeyModel.updateOne(
      { keyId: key.id },
      { $set: { usedToday: 0 } }
    );
  }
}
```

### Monthly Reset

Monthly counters reset on the `monthlyResetAt` date:

```typescript
if (currentDate >= key.monthlyResetAt) {
  key.usedThisMonth = 0;
  key.monthlyResetAt = addMonths(currentDate, 1);
  await ApiKeyModel.updateOne(
    { keyId: key.id },
    { 
      $set: { 
        usedThisMonth: 0,
        monthlyResetAt: key.monthlyResetAt
      }
    }
  );
}
```

### Real-time Updates

Every API request updates the database:

```typescript
// After successful search
key.usedToday++;
key.usedThisMonth++;
key.lastUsed = new Date();

await ApiKeyModel.updateOne(
  { keyId: key.id },
  { 
    $inc: { usedToday: 1, usedThisMonth: 1 },
    $set: { lastUsed: new Date() }
  }
);
```

---

## Security Considerations

### API Key Storage

**Current Implementation:**
- Keys are stored in plaintext in MongoDB
- Suitable for development and internal use

**Production Recommendations:**

1. **Encrypt API Keys**
   ```typescript
   import crypto from 'crypto';
   
   const algorithm = 'aes-256-cbc';
   const secretKey = process.env.ENCRYPTION_KEY;
   
   function encrypt(text: string): string {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
     const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
     return iv.toString('hex') + ':' + encrypted.toString('hex');
   }
   
   function decrypt(hash: string): string {
     const [ivHex, encryptedHex] = hash.split(':');
     const iv = Buffer.from(ivHex, 'hex');
     const encrypted = Buffer.from(encryptedHex, 'hex');
     const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
     return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
   }
   ```

2. **Use Environment Variables for Encryption Key**
   ```env
   ENCRYPTION_KEY=your-32-character-secret-key-here
   ```

3. **Enable MongoDB Encryption at Rest**
   - Use MongoDB Atlas with encryption
   - Or configure self-hosted MongoDB with encryption

4. **Use HTTPS for API Requests**
   - Prevents key interception during transmission

---

## Troubleshooting

### Keys Not Loading After Restart

**Check:**
1. MongoDB is running: `mongod --version`
2. Database connection: Check logs for "Connected to MongoDB"
3. Collection exists: `db.apikeys.find()`

**Solution:**
```bash
# Check MongoDB connection
mongo
> use serp-tracker
> db.apikeys.find().pretty()
```

### Keys Duplicated

**Cause:** Same key exists in both `.env` and database

**Solution:** The system automatically skips duplicates. To remove:
```bash
# Remove from .env OR remove from database
DELETE /api/keys/remove/:keyId
```

### Usage Not Resetting

**Check:**
1. `monthlyResetAt` date is correct
2. Server timezone matches expectation

**Solution:**
```bash
# Manually reset usage
PUT /api/keys/update/:keyId
{
  "usedToday": 0,
  "usedThisMonth": 0
}
```

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/keys/stats` | Get all keys and usage stats |
| POST | `/api/keys/add` | Add new API key |
| POST | `/api/keys/test` | Test API key validity |
| PUT | `/api/keys/update/:keyId` | Update key settings |
| DELETE | `/api/keys/remove/:keyId` | Remove API key |

### Request/Response Examples

**Add Key Request:**
```json
{
  "apiKey": "your_api_key_here",
  "provider": "serpapi",
  "dailyLimit": 250,
  "monthlyLimit": 5000
}
```

**Add Key Response:**
```json
{
  "success": true,
  "message": "API key added successfully",
  "keyId": "user_serpapi_1696780800000",
  "data": {
    "summary": { /* ... */ },
    "keys": [ /* ... */ ]
  }
}
```

---

## Summary

✅ **All API keys are automatically persisted** to MongoDB  
✅ **Keys survive server restarts** without re-entry  
✅ **Usage tracking is maintained** across sessions  
✅ **Both SerpAPI and Google Custom Search** keys are supported  
✅ **Environment and user keys** work together seamlessly  

**You never need to re-enter API keys once they're added!** 🎉

---

## Related Documentation

- [Google Custom Search Integration](./GOOGLE_CUSTOM_SEARCH_INTEGRATION.md)
- [Quick Start Guide](./QUICK_START_GOOGLE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
