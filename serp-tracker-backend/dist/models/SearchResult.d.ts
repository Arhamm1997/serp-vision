import mongoose, { Document } from 'mongoose';
export interface ISearchResultDocument extends Document {
    keyword: string;
    domain: string;
    position: number | null;
    url: string;
    title: string;
    description: string;
    country: string;
    city: string;
    state: string;
    postalCode: string;
    totalResults: number;
    searchedResults: number;
    timestamp: Date;
    found: boolean;
    processingTime?: number;
    apiKeyUsed?: string;
    businessName?: string;
}
export declare const SearchResultModel: mongoose.Model<ISearchResultDocument, {}, {}, {}, mongoose.Document<unknown, {}, ISearchResultDocument, {}, {}> & ISearchResultDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SearchResult.d.ts.map