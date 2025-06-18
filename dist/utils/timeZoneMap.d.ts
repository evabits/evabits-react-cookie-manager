interface TimezoneEntry {
    u?: number;
    a?: string;
    c?: string[];
    r?: number;
    d?: number;
}
type TimezoneToCountryCodeMap = {
    [key: string]: TimezoneEntry;
};
export declare const timezoneToCountryCodeMap: TimezoneToCountryCodeMap;
export declare const timezoneCountryMap: Record<string, string>;
export {};
//# sourceMappingURL=timeZoneMap.d.ts.map