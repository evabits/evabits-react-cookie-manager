/**
 * Handles blocking of tracking scripts and iframes, replacing them with placeholders
 */
/**
 * Creates a placeholder for blocked content
 * @param iframe The iframe element to block
 * @param originalSrc The original source URL of the iframe
 * @returns The created wrapper element containing the placeholder
 */
export declare const createContentPlaceholder: (iframe: HTMLIFrameElement, originalSrc: string) => HTMLDivElement;
/**
 * Blocks tracking scripts and iframes based on keywords
 * @param trackingKeywords Array of keywords to block
 * @returns MutationObserver that watches for new elements
 */
export declare const blockTrackingScripts: (trackingKeywords: string[]) => MutationObserver;
/**
 * Ensures that all placeholders remain visible and properly styled
 */
export declare const ensurePlaceholdersVisible: () => void;
//# sourceMappingURL=content-blocker.d.ts.map