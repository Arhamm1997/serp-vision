# ✅ Pre-Flight Checklist - SERP Vision

Before you run `npm install` and start the application, verify these items:

---

## 🔧 Configuration Checklist

### ✅ Backend Configuration

- [ ] **MongoDB is installed and running**
  ```bash
  # Check if MongoDB is running
  # Windows: Services → MongoDB
  # Or: mongosh (should connect successfully)
  ```

- [ ] **SerpAPI Keys are configured in `.env`**
  ```bash
  cd serp-tracker-backend
  # Edit .env file
  # Replace placeholder keys with your actual keys from:
  # https://serpapi.com/manage-api-key
  
  SERPAPI_KEY_1=your_actual_key_here  ← MUST CHANGE THIS
  SERPAPI_KEY_2=your_actual_key_here  ← OPTIONAL (for higher capacity)
  SERPAPI_KEY_3=your_actual_key_here  ← OPTIONAL (for higher capacity)
  ```

- [ ] **MongoDB URI is correct in `.env`**
  ```bash
  # Default (local):
  MONGODB_URI=mongodb://localhost:27017/serp_tracker
  
  # Or cloud MongoDB:
  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/serp_tracker
  ```

- [ ] **CORS origins are configured**
  ```bash
  # Should include your frontend URL
  CORS_ORIGIN=http://localhost:3000,http://localhost:3001
  ```

### ✅ Frontend Configuration

- [ ] **Backend URL is correct**
  ```bash
  cd serp-tracker-frontend
  # Check .env or .env.local
  BACKEND_URL=http://localhost:5000
  # Or
  NEXT_PUBLIC_API_URL=http://localhost:5000
  ```

---

## 🛠️ Prerequisites Installed

- [ ] **Node.js** (v18 or higher)
  ```bash
  node --version
  # Should show: v18.x.x or higher
  ```

- [ ] **npm** (comes with Node.js)
  ```bash
  npm --version
  # Should show: 9.x.x or higher
  ```

- [ ] **MongoDB** (v6 or higher)
  ```bash
  mongosh --version
  # Should connect or show version
  ```

---

## 📝 Files Verified

- [ ] **Frontend changes applied**
  - File: `serp-tracker-frontend/src/app/actions.ts`
  - Changes: Keyword limiting, API key handling
  - Status: ✅ Already fixed (don't modify)

- [ ] **Backend configuration updated**
  - File: `serp-tracker-backend/.env`
  - Changes: API keys added
  - Status: ⚠️ YOU MUST ADD YOUR API KEYS

---

## 🚀 Ready to Run?

If all items above are checked, you can now:

### Step 1: Install Dependencies

```bash
# Backend
cd serp-tracker-backend
npm install

# Frontend
cd ../serp-tracker-frontend
npm install
```

### Step 2: Start MongoDB (if not running)

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### Step 3: Start Backend

```bash
cd serp-tracker-backend
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 5000
✅ MongoDB connected successfully
✅ SerpApi Pool Manager initialized with 3 keys
```

### Step 4: Start Frontend (New Terminal)

```bash
cd serp-tracker-frontend
npm run dev
```

**Expected Output:**
```
ready - started server on 0.0.0.0:3000
```

---

## 🧪 Quick Test

### Test 1: Backend Health Check

```bash
# In browser or curl:
http://localhost:5000/health

# Expected Response:
{
  "success": true,
  "status": "healthy",
  "uptime": 123,
  "memory": {...}
}
```

### Test 2: API Keys Status

```bash
http://localhost:5000/api/keys/stats

# Expected Response:
{
  "success": true,
  "data": {
    "summary": {
      "total": 3,
      "active": 3,
      "exhausted": 0
    }
  }
}
```

### Test 3: Frontend Connection

```bash
# Open browser:
http://localhost:3000

# Should show SERP Vision UI
# No "backend connection failed" error
```

### Test 4: Process Keywords

1. Enter 10 keywords in frontend
2. Enter domain (e.g., `example.com`)
3. Select country (US)
4. Click "Analyze"
5. **Expected:** Shows ranking results (not demo data)

---

## ❌ Common Issues & Solutions

### Issue 1: "All SerpApi keys exhausted"
**Solution:** 
- Add more API keys to `.env`
- Get more keys from https://serpapi.com/manage-api-key
- Or wait for daily reset (midnight)

### Issue 2: "Cannot connect to MongoDB"
**Solution:**
```bash
# Check if MongoDB is running
# Windows: Services → MongoDB should be "Running"
# Or: mongosh (should connect)

# If not running, start it:
net start MongoDB
```

### Issue 3: "Port 5000 already in use"
**Solution:**
```bash
# Change port in backend/.env:
PORT=5001

# Also update frontend to use new port:
BACKEND_URL=http://localhost:5001
```

### Issue 4: "Backend returned 400: Bad Request"
**Solution:**
- ✅ Already fixed in frontend code
- Restart both frontend and backend
- Clear browser cache

### Issue 5: Frontend shows demo data
**Solution:**
- Backend is not running or not accessible
- Check backend console for errors
- Verify CORS_ORIGIN in backend `.env`
- Check browser console for connection errors

---

## 📋 Final Checklist Before Running npm install

- [ ] MongoDB is installed and running
- [ ] Added at least 1 SerpAPI key to backend `.env`
- [ ] MongoDB URI is correct in backend `.env`
- [ ] CORS origins include frontend URL
- [ ] Node.js v18+ is installed
- [ ] All fixes are in place (already done, don't modify)
- [ ] Ready to install dependencies

---

## 🎯 What the Fixes Do

### ✅ Fix 1: Keyword Limiting (Frontend)
```
User enters 329 keywords
→ Frontend automatically limits to 100
→ Shows warning in console
→ Sends only 100 to backend
→ No validation error!
```

### ✅ Fix 2: API Key Handling (Frontend)
```
User leaves API key field empty
→ Frontend doesn't send apiKey field at all
→ Backend uses environment keys
→ No "empty apiKey" error!
```

### ✅ Fix 3: Automatic Failover (Backend)
```
SERPAPI_KEY_1 reaches limit (250/250)
→ System automatically switches to SERPAPI_KEY_2
→ Processing continues without interruption
→ User doesn't notice any downtime!
```

---

## ✨ Expected Behavior After Running

1. **Small batch (< 100 keywords):** ✅ All processed
2. **Large batch (> 100 keywords):** ✅ First 100 processed with warning
3. **No user API key:** ✅ Uses backend environment keys
4. **Key exhaustion:** ✅ Automatic failover to next key
5. **Accurate rankings:** ✅ Real SERP data from Google

---

## 🎉 You're Ready!

If everything above is checked, you can now:

```bash
# Install and run!
cd serp-tracker-backend && npm install && npm run dev

# (New terminal)
cd serp-tracker-frontend && npm install && npm run dev
```

**Then open:** http://localhost:3000 🚀

---

**Need help? Check:**
- `QUICK_START.md` - Setup instructions
- `FIXES_APPLIED.md` - Technical details
- `CHANGES_SUMMARY.md` - Visual summary
- Backend logs in console

**Happy keyword tracking! 🎯**
