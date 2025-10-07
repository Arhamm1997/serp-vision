# SERP Vision - Quick Start Guide

## 🚀 All Errors Fixed - Ready to Run!

---

## ✅ What Was Fixed

1. **Keyword Limit Error** - Frontend now automatically limits to 100 keywords max
2. **Empty API Key Error** - Frontend only sends API key when provided
3. **Automatic Failover** - Backend rotates between multiple SerpAPI keys automatically
4. **Clear Documentation** - Enhanced .env configuration with detailed instructions

---

## 📋 Prerequisites

Before running the application:

1. **Node.js** (v18 or higher)
2. **MongoDB** (running locally or cloud)
3. **SerpAPI Keys** (get from https://serpapi.com/manage-api-key)

---

## 🔧 Setup Instructions

### Step 1: Configure Backend Environment

Edit `serp-tracker-backend/.env`:

```bash
# Add your SerpAPI keys (get more keys for higher capacity)
SERPAPI_KEY_1=your_first_actual_serpapi_key_here
SERPAPI_KEY_2=your_second_actual_serpapi_key_here
SERPAPI_KEY_3=your_third_actual_serpapi_key_here

# Configure limits per key (Free tier = 250/month)
SERPAPI_DAILY_LIMIT=250
SERPAPI_MONTHLY_LIMIT=250

# MongoDB connection (update if needed)
MONGODB_URI=mongodb://localhost:27017/serp_tracker
```

### Step 2: Install Dependencies

```bash
# Backend
cd serp-tracker-backend
npm install

# Frontend
cd ../serp-tracker-frontend
npm install
```

### Step 3: Start MongoDB

```bash
# Windows (if installed as service)
net start MongoDB

# Or use MongoDB Compass to start it
# Or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 4: Run the Application

**Terminal 1 - Backend:**
```bash
cd serp-tracker-backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd serp-tracker-frontend
npm run dev
```

---

## 🎯 How to Use

### Option 1: Use Backend Environment Keys (Recommended)

1. Open frontend (usually http://localhost:3000)
2. Enter your **keywords** (one per line, max 100)
3. Enter **domain** to track (e.g., `hivetechsol.com`)
4. Select **country** (e.g., US, GB, etc.)
5. Leave **API Key** field empty
6. Click **Analyze**

✅ **Result:** Backend automatically uses environment keys with failover

### Option 2: Use Your Personal API Key

1. Follow steps 1-3 above
2. Enter **your SerpAPI key** in the API Key field
3. Click **Analyze**

✅ **Result:** Uses your key exclusively, falls back to environment keys if it fails

---

## 🔄 How Automatic Failover Works

### Example Scenario:

You have 3 SerpAPI keys configured:
- `SERPAPI_KEY_1` = 250 searches/day
- `SERPAPI_KEY_2` = 250 searches/day  
- `SERPAPI_KEY_3` = 250 searches/day

**Total Capacity:** 750 searches/day

### What Happens:

1. **Request 1-250:** Uses `SERPAPI_KEY_1`
2. **Request 251:** `KEY_1` exhausted, automatically switches to `KEY_2`
3. **Request 251-500:** Uses `SERPAPI_KEY_2`
4. **Request 501:** `KEY_2` exhausted, automatically switches to `KEY_3`
5. **Request 501-750:** Uses `SERPAPI_KEY_3`
6. **Request 751+:** All keys exhausted, returns error

### Features:

- ✅ **Zero Downtime** - Seamless switching between keys
- ✅ **Smart Rotation** - Uses priority, round-robin, or least-used strategy
- ✅ **Error Recovery** - Automatically retries with different keys
- ✅ **Usage Tracking** - View stats at `/api/keys/stats`
- ✅ **Auto Reset** - Daily usage resets at midnight

---

## 📊 Monitor API Usage

### Check Current Status:

**Browser:**
```
http://localhost:5000/api/keys/stats
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 3,
      "active": 2,
      "exhausted": 1,
      "totalUsageToday": 340,
      "totalCapacity": 750,
      "usagePercentage": 45,
      "remainingCapacity": 410
    },
    "details": [
      {
        "id": "serpapi_1",
        "status": "exhausted",
        "usedToday": 250,
        "dailyLimit": 250,
        "usagePercentage": 100
      },
      {
        "id": "serpapi_2",
        "status": "active",
        "usedToday": 90,
        "dailyLimit": 250,
        "usagePercentage": 36
      }
    ]
  }
}
```

---

## 🧪 Test the Fix

### Test 1: Small Batch
```
Keywords: 10 keywords
Expected: ✅ Processes successfully
```

### Test 2: Large Batch (Auto-limit)
```
Keywords: 329 keywords
Expected: ✅ Frontend limits to 100, processes successfully
Console: "⚠️ Limiting keywords from 329 to 100 (backend max)"
```

### Test 3: Without API Key
```
API Key Field: (empty)
Expected: ✅ Uses backend environment keys automatically
```

### Test 4: Failover Test
```
Process 300 keywords with 3 keys (250 limit each)
Expected: ✅ Automatically rotates through all 3 keys
```

---

## ❗ Troubleshooting

### Error: "All SerpApi keys exhausted"
**Solution:** 
- Add more API keys to `.env`
- Wait for daily reset (midnight)
- Use your personal API key in frontend

### Error: "Cannot connect to MongoDB"
**Solution:**
```bash
# Start MongoDB
net start MongoDB

# Or check connection string in .env
MONGODB_URI=mongodb://localhost:27017/serp_tracker
```

### Error: "Backend connection failed"
**Solution:**
1. Ensure backend is running on port 5000
2. Check backend console for errors
3. Verify MongoDB is running
4. Check SerpAPI keys are valid

### Frontend shows demo data
**Solution:**
- This means backend connection failed
- Check backend is running
- Check error message in browser console
- Verify API keys in backend `.env`

---

## 📁 Important Files

### Configuration:
- `serp-tracker-backend/.env` - Backend configuration
- `serp-tracker-frontend/.env` - Frontend configuration

### Logs:
- `serp-tracker-backend/logs/` - Backend logs
- Browser Console - Frontend logs

### Documentation:
- `FIXES_APPLIED.md` - Detailed fix documentation
- `QUICK_START.md` - This file

---

## 🎉 You're Ready!

Everything is configured and ready to run. The application will:

✅ Automatically limit keywords to 100 per request  
✅ Use environment API keys when user key not provided  
✅ Automatically failover between multiple API keys  
✅ Provide accurate ranking for all keywords  
✅ Track usage and provide detailed statistics  

**Just run the commands and start tracking your keywords!** 🚀

---

## 📞 Support

If you need help:
1. Check `FIXES_APPLIED.md` for detailed technical documentation
2. Review backend logs in console
3. Check `/api/keys/stats` for API key status
4. Verify SerpAPI keys at https://serpapi.com/manage-api-key

---

**Happy Keyword Tracking! 🎯**
