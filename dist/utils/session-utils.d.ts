import { CookieCategories } from '../types/types';
/**
 * Generates a random string of specified length
 * @param length The length of the random string
 * @returns A random string
 */
export declare const generateRandomString: (length: number) => string;
/**
 * Generates a unique ID based on various entropy sources
 * @returns A promise that resolves to a unique ID string
 */
export declare const generateUniqueId: () => Promise<string>;
/**
 * Generates a session ID for analytics
 * @param kitId The cookie kit ID
 * @returns A promise that resolves to a session ID string
 */
export declare const generateSessionId: (kitId: string) => Promise<string>;
/**
 * Resolves a country code from a timezone
 * @param timeZone The timezone to resolve
 * @returns The country code or "Unknown" if not found
 */
export declare const resolveCountryFromTimezone: (timeZone: string) => string;
/**
 * Posts session data to analytics
 * @param kitId The cookie kit ID
 * @param sessionId The session ID
 * @param action The action performed (e.g., "accept", "decline")
 * @param preferences The cookie preferences
 * @param userId Optional user ID
 */
export declare const postSessionToAnalytics: (kitId: string, sessionId: string, action?: string, preferences?: CookieCategories, userId?: string) => Promise<void>;
//# sourceMappingURL=session-utils.d.ts.map