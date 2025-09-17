import mongoose, { Document } from 'mongoose';
export interface IApiKeyDocument extends Document {
    keyId: string;
    dailyLimit: number;
    monthlyLimit: number;
    usedToday: number;
    usedThisMonth: number;
    status: 'active' | 'exhausted' | 'error' | 'paused';
    priority: number;
    lastUsed: Date;
    errorCount: number;
    successRate: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ApiKeyModel: mongoose.Model<IApiKeyDocument, {}, {}, {}, mongoose.Document<unknown, {}, IApiKeyDocument, {}, {}> & IApiKeyDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ApiKey.d.ts.map