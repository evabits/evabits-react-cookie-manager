import { default as React } from 'react';
import { CookieCategories, CookieConsenterProps, DetailedCookieConsent, TranslationObject, TranslationFunction } from '../types/types';
interface CookieConsentContextValue {
    hasConsent: boolean | null;
    isDeclined: boolean;
    detailedConsent: DetailedCookieConsent | null;
    showConsentBanner: () => void;
    acceptCookies: () => void;
    declineCookies: () => void;
    updateDetailedConsent: (preferences: CookieCategories) => void;
}
export interface CookieManagerProps extends Omit<CookieConsenterProps, "onAccept" | "onDecline" | "forceShow"> {
    children: React.ReactNode;
    cookieKey?: string;
    cookieKitId?: string;
    userId?: string;
    onManage?: (preferences?: CookieCategories) => void;
    onAccept?: () => void;
    onDecline?: () => void;
    disableAutomaticBlocking?: boolean;
    blockedDomains?: string[];
    expirationDays?: number;
    /**
     * Translations that will be used in the consent UI. It can be one of:
     * 1. **TranslationObject**: An object with keys for each TranslationKey, e.g.:
     *    ```
     *    {
     *      title: 'My own consent title',
     *      message: 'My own consent message',
     *      // other keys if needed
     *    }
     *    ```
     * 2. **TranslationFunction**: A function that takes a key with params and returns a string. Useful for i18n libraries where TFunction can be passed like follows:
     *    ```ts
     *    const { t } = useTranslation();
     *    return <CookieConsenter translations={t} />
     *    ```
     *
     * By default it uses English translations specified in TranslationKey defaults.
     */
    translations?: TranslationObject | TranslationFunction<any, any>;
    /**
     * Prefix for translation keys when using i18next, e.g.
     * ```ts
     * // typescript file
     * const { t } = useTranslation();
     * <CookieConsenter translations={t} translationI18NextPrefix="cookieConsent" />
     * ```
     * ```json
     * // {lng}.json
     * {
     *  "cookieConsent": {
     *    "title": "My own consent title",
     *    "message": "My own consent message"
     *  }
     * }
     * ```
     */
    translationI18NextPrefix?: string;
    enableFloatingButton?: boolean;
    theme?: "light" | "dark";
}
export declare const CookieManager: React.FC<CookieManagerProps>;
export declare const useCookieConsent: () => CookieConsentContextValue;
export {};
//# sourceMappingURL=CookieConsentContext.d.ts.map