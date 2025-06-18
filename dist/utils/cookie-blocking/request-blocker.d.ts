/**
 * Blocks network requests to specified domains by overriding XMLHttpRequest and fetch
 * @param blockedHosts Array of domain strings to block
 */
export declare const blockTrackingRequests: (blockedHosts: string[]) => void;
/**
 * Restores the original XMLHttpRequest and fetch implementations
 */
export declare const restoreOriginalRequests: () => void;
//# sourceMappingURL=request-blocker.d.ts.map