"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQueryParams = exports.validateBulkSearchRequest = exports.validateSearchRequest = void 0;
const joi_1 = __importDefault(require("joi"));
const validateSearchRequest = (data) => {
    const schema = joi_1.default.object({
        keyword: joi_1.default.string().required().min(1).max(500).trim(),
        domain: joi_1.default.string().required().min(1).max(255).trim(),
        country: joi_1.default.string().required().length(2).uppercase(),
        city: joi_1.default.string().optional().max(100).trim(),
        state: joi_1.default.string().optional().max(50).trim(),
        postalCode: joi_1.default.string().optional().max(20).trim(),
        language: joi_1.default.string().optional().length(2).lowercase().default('en'),
        device: joi_1.default.string().optional().valid('desktop', 'mobile', 'tablet').default('desktop')
    });
    return schema.validate(data, { abortEarly: false });
};
exports.validateSearchRequest = validateSearchRequest;
const validateBulkSearchRequest = (data) => {
    const schema = joi_1.default.object({
        keywords: joi_1.default.array()
            .items(joi_1.default.string().min(1).max(500).trim())
            .min(1)
            .max(100)
            .required()
            .unique(),
        domain: joi_1.default.string().required().min(1).max(255).trim(),
        country: joi_1.default.string().required().length(2).uppercase(),
        city: joi_1.default.string().optional().max(100).trim(),
        state: joi_1.default.string().optional().max(50).trim(),
        postalCode: joi_1.default.string().optional().max(20).trim(),
        language: joi_1.default.string().optional().length(2).lowercase().default('en'),
        device: joi_1.default.string().optional().valid('desktop', 'mobile', 'tablet').default('desktop')
    });
    return schema.validate(data, { abortEarly: false });
};
exports.validateBulkSearchRequest = validateBulkSearchRequest;
const validateQueryParams = (params) => {
    const schema = joi_1.default.object({
        limit: joi_1.default.number().integer().min(1).max(100).default(50),
        offset: joi_1.default.number().integer().min(0).default(0),
        sortBy: joi_1.default.string().valid('timestamp', 'keyword', 'domain', 'position', 'found').default('timestamp'),
        sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
        dateFrom: joi_1.default.date().iso().optional(),
        dateTo: joi_1.default.date().iso().min(joi_1.default.ref('dateFrom')).optional()
    });
    return schema.validate(params, { abortEarly: false, allowUnknown: true });
};
exports.validateQueryParams = validateQueryParams;
//# sourceMappingURL=validators.js.map