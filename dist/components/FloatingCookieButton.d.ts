import { default as React } from 'react';
import { CookieConsenterClassNames } from '../types/types';
interface FloatingCookieButtonProps {
    theme?: "light" | "dark";
    onClick: () => void;
    onClose?: () => void;
    classNames?: CookieConsenterClassNames;
}
export declare const FloatingCookieButton: React.FC<FloatingCookieButtonProps>;
export {};
//# sourceMappingURL=FloatingCookieButton.d.ts.map