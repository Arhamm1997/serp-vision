import mongoose, { Schema, Document } from 'mongoose';

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

const apiKeySchema = new Schema<IApiKeyDocument>({
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

// Indexes for performance
// apiKeySchema.index({ keyId: 1 }); // Removed duplicate index
apiKeySchema.index({ status: 1 });
apiKeySchema.index({ priority: 1 });
apiKeySchema.index({ usedToday: 1 });

// Update the updatedAt field before saving
apiKeySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const ApiKeyModel = mongoose.model<IApiKeyDocument>('ApiKey', apiKeySchema);
