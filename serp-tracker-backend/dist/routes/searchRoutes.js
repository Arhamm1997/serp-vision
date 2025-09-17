"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRoutes = void 0;
const express_1 = require("express");
const searchController_1 = require("../controllers/searchController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
exports.searchRoutes = router;
router.use(rateLimiter_1.searchRateLimiter);
router.use((req, res, next) => {
    if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
        if (!req.body || Object.keys(req.body).length === 0) {
            res.status(400).json({
                success: false,
                message: 'Empty or invalid JSON body'
            });
            return;
        }
    }
    next();
});
router.post('/track', searchController_1.getSerpAnalysis);
router.post('/bulk', searchController_1.getSerpAnalysis);
router.get('/analytics', searchController_1.getKeywordAnalytics);
//# sourceMappingURL=searchRoutes.js.map