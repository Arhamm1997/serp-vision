# 🚀 Quick Start: Google Custom Search API

## ⚡ 5-Minute Setup

### 1. Get API Credentials (2 min)

**Google Cloud Console**:
```
1. Go to: https://console.cloud.google.com/
2. Enable "Custom Search API"
3. Create API Key → Copy it
```

**Programmable Search Engine**:
```
1. Go to: https://programmablesearchengine.google.com/
2. Create new search engine
3. Enable "Search the entire web"
4. Copy the CSE ID (format: abc123def456:xyz789)
```

### 2. Add to SERP Vision (1 min)

**PowerShell**:
```powershell
$body = @{
    key = "YOUR_API_KEY"
    provider = "google_custom_search"
    cseId = "YOUR_CSE_ID"
    dailyLimit = 100
    monthlyLimit = 3000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/keys" -Method POST -Body $body -ContentType "application/json"
```

**cURL**:
```bash
curl -X POST http://localhost:5000/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "key": "YOUR_API_KEY",
    "provider": "google_custom_search",
    "cseId": "YOUR_CSE_ID",
    "dailyLimit": 100,
    "monthlyLimit": 3000
  }'
```

### 3. Start Tracking (30 sec)

**Auto-Select Provider**:
```bash
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "best pizza near me",
    "domain": "example.com",
    "country": "US"
  }'
```

**Force Google Custom Search**:
```bash
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "best pizza near me",
    "domain": "example.com",
    "country": "US",
    "apiProvider": "google_custom_search"
  }'
```

---

## 💡 Key Commands

### Add Key
```javascript
POST /api/keys
{
  "key": "AIzaSyAbc123...",
  "provider": "google_custom_search",
  "cseId": "abc123:xyz789",
  "dailyLimit": 100,
  "monthlyLimit": 3000
}
```

### Test Key
```javascript
POST /api/keys/test
{
  "provider": "google_custom_search",
  "key": "AIzaSyAbc123...",
  "cseId": "abc123:xyz789"
}
```

### Track Single Keyword
```javascript
POST /api/search
{
  "keyword": "your keyword",
  "domain": "yourdomain.com",
  "country": "US",
  "apiProvider": "google_custom_search"  // Optional
}
```

### Bulk Track
```javascript
POST /api/bulk-track
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "domain": "yourdomain.com",
  "country": "US",
  "apiProvider": "google_custom_search"
}
```

### Check Stats
```bash
GET /api/keys/stats
```

### Remove Key
```bash
DELETE /api/keys/:keyId
```

---

## 🎯 When to Use

### Google Custom Search ✅
- Testing & development
- Low volume (< 100 searches/day)
- Cost savings
- SerpAPI quota exceeded

### SerpAPI ✅
- Production applications
- High accuracy needed
- Large result sets (50-100+)
- SERP feature analysis

---

## 📊 Free Tier Limits

| Provider | Free Searches |
|----------|--------------|
| Google Custom Search | **100/day** (3,000/month) |
| SerpAPI | 100/month |

---

## ⚠️ Important Notes

1. **Max Results**: Google Custom Search returns max **10 results** per query
2. **No Position Field**: Uses array index for position calculation
3. **CSE ID Required**: Must create Programmable Search Engine
4. **Billing**: Enable billing in Google Cloud for > 100/day

---

## 🔧 TypeScript Usage

```typescript
import { SerpApiPoolManager } from './services/serpApiPoolManager';

const manager = new SerpApiPoolManager();

// Add key
await manager.addGoogleCustomSearchKey(
  'AIzaSyAbc123...',
  'abc123:xyz789',
  100,   // daily limit
  3000   // monthly limit
);

// Test key
const test = await manager.testGoogleCustomSearchKey(
  'AIzaSyAbc123...',
  'abc123:xyz789'
);
console.log(test);  // { success: true, message: "..." }

// Track keyword
const result = await manager.trackKeyword('pizza', {
  domain: 'example.com',
  country: 'US',
  apiProvider: 'google_custom_search'
});

console.log(`Position: ${result.position}`);
console.log(`Found: ${result.found}`);
console.log(`URL: ${result.url}`);
```

---

## 🐛 Troubleshooting

### "No Google Custom Search API key available"
```
→ Add key via API or UI
```

### "CSE ID is required"
```
→ Include cseId when adding key
```

### "Daily quota exceeded"
```
→ Wait 24h or enable billing
→ Use SerpAPI as fallback
```

### "Domain not found"
```
→ Check spelling
→ Try increasing maxResults (max 10)
→ Verify location targeting
```

### "Invalid API key"
```
→ Verify key in Google Cloud Console
→ Enable Custom Search API
→ Check API restrictions
```

---

## 📚 Resources

- [Setup Guide](./GOOGLE_CUSTOM_SEARCH_INTEGRATION.md) - Complete documentation
- [Implementation](./IMPLEMENTATION_SUMMARY.md) - Technical details
- [Google Docs](https://developers.google.com/custom-search/v1/overview) - Official API docs

---

## ✨ Benefits

✅ **100 Free Searches/Day** - Perfect for development  
✅ **Official Google API** - Reliable results  
✅ **Cost Savings** - Reduce SerpAPI usage  
✅ **Easy Setup** - 5 minutes to start  
✅ **Automatic Fallback** - Hybrid provider strategy  

---

**Ready?** Get your API key and start tracking! 🎉
