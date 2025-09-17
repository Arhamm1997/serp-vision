"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const healthController_1 = require("../controllers/healthController");
const router = (0, express_1.Router)();
exports.healthRoutes = router;
const healthController = new healthController_1.HealthController();
router.get('/', healthController.checkHealth);
router.get('/keys', healthController.getApiKeyStats);
//# sourceMappingURL=healthRoutes.js.map