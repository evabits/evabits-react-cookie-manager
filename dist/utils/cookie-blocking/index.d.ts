import { blockTrackingRequests, restoreOriginalRequests } from './request-blocker';
import { blockTrackingScripts, ensurePlaceholdersVisible, createContentPlaceholder } from './content-blocker';
/**
 * Main cookie blocking manager that handles all aspects of cookie blocking
 */
export declare class CookieBlockingManager {
    private observerRef;
    private intervalId;
    /**
     * Initializes cookie blocking based on user preferences
     * @param blockedHosts Array of hosts to block
     * @param blockedKeywords Array of keywords to block in scripts and iframes
     */
    initialize(blockedHosts: string[], blockedKeywords: string[]): void;
    /**
     * Starts a periodic check to ensure placeholders remain visible
     */
    private startPlaceholderVisibilityCheck;
    /**
     * Cleans up all cookie blocking functionality
     */
    cleanup(): void;
}
export { blockTrackingRequests, restoreOriginalRequests, blockTrackingScripts, ensurePlaceholdersVisible, createContentPlaceholder, };
//# sourceMappingURL=index.d.ts.map