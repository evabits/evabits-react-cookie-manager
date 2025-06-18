import { default as React } from 'react';
import { CookieCategories, DetailedCookieConsent, CookieConsenterClassNames } from '../types/types';
import { TFunction } from '../utils/translations';
interface ManageConsentProps {
    theme?: "light" | "dark";
    tFunction: TFunction;
    onSave: (categories: CookieCategories) => void;
    onCancel?: () => void;
    initialPreferences?: CookieCategories;
    detailedConsent?: DetailedCookieConsent | null;
    classNames?: CookieConsenterClassNames;
}
export declare const ManageConsent: React.FC<ManageConsentProps>;
export {};
//# sourceMappingURL=ManageConsent.d.ts.map