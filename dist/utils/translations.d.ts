import { TranslationFunction, TranslationKey, TranslationObject } from '../types/types';
export type TFunction = (key: TranslationKey, params?: Record<string, string>) => string;
export declare function createTFunction(translations?: TranslationObject | TranslationFunction<any, any>, translationI18NextPrefix?: string): TFunction;
//# sourceMappingURL=translations.d.ts.map