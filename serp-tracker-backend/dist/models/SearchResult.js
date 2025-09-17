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
exports.SearchResultModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const searchResultSchema = new mongoose_1.Schema({
    keyword: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    position: { type: Number, default: null, min: 1 },
    url: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    country: { type: String, required: true, uppercase: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    postalCode: { type: String, default: '', trim: true },
    totalResults: { type: Number, default: 0, min: 0 },
    searchedResults: { type: Number, default: 0, min: 0 },
    timestamp: { type: Date, default: Date.now },
    found: { type: Boolean, default: false },
    processingTime: { type: Number, default: null },
    apiKeyUsed: { type: String, default: null },
    businessName: { type: String, default: '', trim: true }
});
searchResultSchema.index({ keyword: 1, domain: 1 });
searchResultSchema.index({ timestamp: -1 });
searchResultSchema.index({ domain: 1, timestamp: -1 });
searchResultSchema.index({ position: 1 });
searchResultSchema.index({ found: 1 });
searchResultSchema.index({ country: 1 });
searchResultSchema.index({ keyword: 'text', domain: 'text' });
searchResultSchema.index({ domain: 1, keyword: 1, timestamp: -1 });
searchResultSchema.index({ found: 1, position: 1 });
exports.SearchResultModel = mongoose_1.default.model('SearchResult', searchResultSchema);
//# sourceMappingURL=SearchResult.js.map