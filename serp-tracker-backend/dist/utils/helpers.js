"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = exports.sanitizeInput = exports.formatDuration = exports.formatBytes = exports.extractDomain = exports.delay = void 0;
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.delay = delay;
const extractDomain = (url) => {
    try {
        let domain = url.replace(/^https?:\/\//, '');
        domain = domain.replace(/^www\./, '');
        domain = domain.split('/')[0];
        domain = domain.split('?')[0].split('#')[0];
        return domain.toLowerCase();
    }
    catch (error) {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    }
};
exports.extractDomain = extractDomain;
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
exports.formatBytes = formatBytes;
const formatDuration = (ms) => {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000)
        return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
};
exports.formatDuration = formatDuration;
const sanitizeInput = (input) => {
    return input.trim().replace(/[<>\"']/g, '');
};
exports.sanitizeInput = sanitizeInput;
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
exports.generateId = generateId;
//# sourceMappingURL=helpers.js.map