"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const apiKeySchema = new mongoose_1.Schema({
    keyId: { type: String, required: true, unique: true },
    dailyLimit: { type: Number, default: 5000 },
    monthlyLimit: { type: Number, default: 100000 },
    usedToday: { type: Number, default: 0 },
    usedThisMonth: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['active', 'exhausted', 'error', 'paused'],
        default: 'active'
    },
    priority: { type: Number, default: 1 },
    lastUsed: { type: Date, default: Date.now },
    errorCount: { type: Number, default: 0 },
    successRate: { type: Number, default: 100, min: 0, max: 100 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
apiKeySchema.index({ status: 1 });
apiKeySchema.index({ priority: 1 });
apiKeySchema.index({ usedToday: 1 });
apiKeySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
exports.ApiKeyModel = mongoose_1.default.model('ApiKey', apiKeySchema);
//# sourceMappingURL=ApiKey.js.map