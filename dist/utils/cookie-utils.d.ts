/**
 * Sets a cookie with the specified name, value, and expiration days
 * @param name The name of the cookie
 * @param value The value to store in the cookie
 * @param days Number of days until the cookie expires
 */
export declare const setCookie: (name: string, value: string, days: number) => void;
/**
 * Gets a cookie value by name
 * @param name The name of the cookie to retrieve
 * @returns The cookie value or null if not found
 */
export declare const getCookie: (name: string) => string | null;
/**
 * Deletes a cookie by setting its expiration to a past date
 * @param name The name of the cookie to delete
 */
export declare const deleteCookie: (name: string) => void;
/**
 * Checks if a cookie exists
 * @param name The name of the cookie to check
 * @returns True if the cookie exists, false otherwise
 */
export declare const cookieExists: (name: string) => boolean;
/**
 * Gets all cookies as an object
 * @returns An object with cookie names as keys and values as values
 */
export declare const getAllCookies: () => Record<string, string>;
/**
 * Clears all cookies from the current domain
 */
export declare const clearAllCookies: () => void;
//# sourceMappingURL=cookie-utils.d.ts.map