import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import CookieConsenter from "../components/CookieConsenter";
import { FloatingCookieButton } from "../components/FloatingCookieButton";
import type {
  CookieCategories,
  CookieConsenterProps,
  DetailedCookieConsent,
  TranslationObject,
  TranslationFunction,
} from "../types/types";
import { ManageConsent } from "../components/ManageConsent";
import { getBlockedHosts, getBlockedKeywords } from "../utils/tracker-utils";
import { createTFunction } from "../utils/translations";
import { CookieBlockingManager } from "../utils/cookie-blocking";
import { setCookie, getCookie, deleteCookie } from "../utils/cookie-utils";
import {
  generateSessionId,
  postSessionToAnalytics,
} from "../utils/session-utils";

// Helper function to check if running on localhost
const isLocalhost = (): boolean => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.")
    );
  }
  return false;
};

// Helper function to post to analytics if not on localhost
const postToAnalyticsIfNotLocalhost = async (
  cookieKitId: string,
  sessionId: string,
  action?: string,
  preferences?: CookieCategories,
  userId?: string
) => {
  if (isLocalhost()) {
    console.log(
      "[CookieKit] Running on localhost - consent data will be sent when deployed to production"
    );
    return;
  }

  await postSessionToAnalytics(
    cookieKitId,
    sessionId,
    action,
    preferences,
    userId
  );
};

interface CookieConsentContextValue {
  hasConsent: boolean | null;
  isDeclined: boolean;
  detailedConsent: DetailedCookieConsent | null;
  showConsentBanner: () => void;
  acceptCookies: () => void;
  declineCookies: () => void;
  updateDetailedConsent: (preferences: CookieCategories) => void;
}

const CookieManagerContext = createContext<CookieConsentContextValue | null>(
  null
);

export interface CookieManagerProps
  extends Omit<CookieConsenterProps, "onAccept" | "onDecline" | "forceShow"> {
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

const createConsentStatus = (consented: boolean) => ({
  consented,
  timestamp: new Date().toISOString(),
});

const createDetailedConsent = (consented: boolean): DetailedCookieConsent => ({
  Analytics: createConsentStatus(consented),
  Social: createConsentStatus(consented),
  Advertising: createConsentStatus(consented),
});

export const CookieManager: React.FC<CookieManagerProps> = ({
  children,
  cookieKey = "cookie-consent",
  cookieKitId,
  userId,
  translations,
  translationI18NextPrefix,
  onManage,
  onAccept,
  onDecline,
  disableAutomaticBlocking = false,
  blockedDomains = [],
  expirationDays = 365,
  enableFloatingButton = false,
  theme = "light",
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showManageConsent, setShowManageConsent] = useState(false);
  const [isFloatingButtonVisible, setIsFloatingButtonVisible] = useState(false);
  const hasPostedSession = useRef(false);
  const isGeneratingSession = useRef(false);
  const tFunction = useMemo(
    () => createTFunction(translations, translationI18NextPrefix),
    [translations, translationI18NextPrefix]
  );

  const [detailedConsent, setDetailedConsent] =
    useState<DetailedCookieConsent | null>(() => {
      const storedConsent = getCookie(cookieKey);
      if (storedConsent) {
        try {
          const parsedConsent = JSON.parse(
            storedConsent
          ) as DetailedCookieConsent;

          // Check if consent has expired
          const oldestTimestamp = Math.min(
            ...Object.values(parsedConsent).map((status) =>
              new Date(status.timestamp).getTime()
            )
          );

          const expirationTime =
            oldestTimestamp + expirationDays * 24 * 60 * 60 * 1000;

          if (Date.now() > expirationTime) {
            deleteCookie(cookieKey);
            return null;
          }

          return parsedConsent;
        } catch (e) {
          return null;
        }
      }
      return null;
    });

  const hasConsent = detailedConsent
    ? Object.values(detailedConsent).some((status) => status.consented)
    : null;

  // Use the CookieBlockingManager
  const cookieBlockingManager = useRef<CookieBlockingManager | null>(null);

  // Initialize session ID if cookieKitId is provided
  useEffect(() => {
    let isMounted = true;
    let isInitializing = false;

    const initializeSessionId = async () => {
      if (!cookieKitId || isInitializing) return;

      isInitializing = true;
      const sessionKey = `${cookieKey}-session`;
      let sessionId = getCookie(sessionKey);

      if (!sessionId) {
        try {
          sessionId = await generateSessionId(cookieKitId);
          if (!isMounted) return;
          setCookie(sessionKey, sessionId, 1);
          const savedSessionId = getCookie(sessionKey);
          if (savedSessionId && isMounted) {
            await postToAnalyticsIfNotLocalhost(
              cookieKitId,
              sessionId,
              undefined,
              undefined,
              userId
            );
          }
        } catch (error) {
          console.error("Error in session initialization:", error);
        }
      } else {
      }
    };

    initializeSessionId();

    return () => {
      isMounted = false;
      isInitializing = false;
    };
  }, [cookieKitId, cookieKey, userId]);

  useEffect(() => {
    // Show banner if no consent decision has been made AND manage consent is not shown
    if (detailedConsent === null && !showManageConsent) {
      setIsVisible(true);
    } else if (showManageConsent) {
      // Hide banner when manage consent is shown
      setIsVisible(false);
    }

    // Handle tracking blocking
    if (!disableAutomaticBlocking) {
      // Get current preferences
      const currentPreferences = detailedConsent
        ? {
            Analytics: detailedConsent.Analytics.consented,
            Social: detailedConsent.Social.consented,
            Advertising: detailedConsent.Advertising.consented,
          }
        : null;

      // Get blocked hosts and keywords based on preferences
      const blockedHosts = [
        ...getBlockedHosts(currentPreferences),
        ...blockedDomains,
      ];

      const blockedKeywords = [
        ...getBlockedKeywords(currentPreferences),
        ...blockedDomains,
      ];

      // Initialize or update cookie blocking
      if (blockedHosts.length > 0 || blockedKeywords.length > 0) {
        // Create a new manager if one doesn't exist
        if (!cookieBlockingManager.current) {
          cookieBlockingManager.current = new CookieBlockingManager();
        }

        // Initialize the manager with current blocked hosts and keywords
        cookieBlockingManager.current.initialize(blockedHosts, blockedKeywords);
      } else {
        // Clean up if no blocking is needed
        if (cookieBlockingManager.current) {
          cookieBlockingManager.current.cleanup();
        }
      }
    } else {
      // Clean up if blocking is disabled
      if (cookieBlockingManager.current) {
        cookieBlockingManager.current.cleanup();
        cookieBlockingManager.current = null;
      }
    }

    return () => {
      // Clean up on unmount
      if (cookieBlockingManager.current) {
        cookieBlockingManager.current.cleanup();
      }
    };
  }, [detailedConsent, disableAutomaticBlocking, blockedDomains]);

  const showConsentBanner = () => {
    if (!showManageConsent) {
      // Only show banner if manage consent is not shown
      setIsVisible(true);
    }
  };

  const acceptCookies = async () => {
    const newConsent = createDetailedConsent(true);
    setCookie(cookieKey, JSON.stringify(newConsent), expirationDays);
    setDetailedConsent(newConsent);
    setIsVisible(false);
    if (enableFloatingButton) {
      setIsFloatingButtonVisible(true);
    }

    if (cookieKitId) {
      const sessionKey = `${cookieKey}-session`;
      const sessionId = getCookie(sessionKey);
      if (sessionId) {
        await postToAnalyticsIfNotLocalhost(
          cookieKitId,
          sessionId,
          "accept",
          {
            Analytics: true,
            Social: true,
            Advertising: true,
          },
          userId
        );
      }
    }

    // Call the onAccept callback if provided
    if (onAccept) {
      onAccept();
    }
  };

  const declineCookies = async () => {
    const newConsent = createDetailedConsent(false);
    setCookie(cookieKey, JSON.stringify(newConsent), expirationDays);
    setDetailedConsent(newConsent);
    setIsVisible(false);
    if (enableFloatingButton) {
      setIsFloatingButtonVisible(true);
    }

    if (cookieKitId) {
      const sessionKey = `${cookieKey}-session`;
      const sessionId = getCookie(sessionKey);
      if (sessionId) {
        await postToAnalyticsIfNotLocalhost(
          cookieKitId,
          sessionId,
          "decline",
          {
            Analytics: false,
            Social: false,
            Advertising: false,
          },
          userId
        );
      }
    }

    // Call the onDecline callback if provided
    if (onDecline) {
      onDecline();
    }
  };

  const updateDetailedConsent = async (preferences: CookieCategories) => {
    const timestamp = new Date().toISOString();
    const newConsent: DetailedCookieConsent = {
      Analytics: { consented: preferences.Analytics, timestamp },
      Social: { consented: preferences.Social, timestamp },
      Advertising: { consented: preferences.Advertising, timestamp },
    };
    setCookie(cookieKey, JSON.stringify(newConsent), expirationDays);
    setDetailedConsent(newConsent);
    setShowManageConsent(false);
    if (enableFloatingButton) {
      setIsFloatingButtonVisible(true);
    }

    if (cookieKitId) {
      const sessionKey = `${cookieKey}-session`;
      const sessionId = getCookie(sessionKey);
      if (sessionId) {
        await postToAnalyticsIfNotLocalhost(
          cookieKitId,
          sessionId,
          "save_preferences",
          preferences,
          userId
        );
      }
    }

    if (onManage) {
      onManage(preferences);
    }
  };

  const handleManage = () => {
    setShowManageConsent(true);
    setIsFloatingButtonVisible(false);
  };

  const handleCancelManage = () => {
    setShowManageConsent(false);
    if (enableFloatingButton && detailedConsent) {
      setIsFloatingButtonVisible(true);
    } else {
      setIsVisible(true);
    }
  };

  // Add effect to show floating button on mount if consent exists
  useEffect(() => {
    if (enableFloatingButton && detailedConsent) {
      setIsFloatingButtonVisible(true);
    }

    // Add event listener for custom event to show cookie settings
    const handleShowCookieConsent = () => {
      console.debug(
        "[CookieKit] Custom event triggered to show cookie settings"
      );
      if (detailedConsent) {
        setShowManageConsent(true);
        setIsFloatingButtonVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener("show-cookie-consent", handleShowCookieConsent);

    return () => {
      window.removeEventListener(
        "show-cookie-consent",
        handleShowCookieConsent
      );
    };
  }, [enableFloatingButton, detailedConsent]);

  const value: CookieConsentContextValue = {
    hasConsent,
    isDeclined: hasConsent === false,
    detailedConsent,
    showConsentBanner,
    acceptCookies,
    declineCookies,
    updateDetailedConsent,
  };

  return (
    <CookieManagerContext.Provider value={value}>
      {children}
      {isVisible && (
        <CookieConsenter
          {...props}
          theme={theme}
          tFunction={tFunction}
          cookieKey={cookieKey}
          onAccept={acceptCookies}
          onDecline={declineCookies}
          onManage={handleManage}
          detailedConsent={detailedConsent}
          initialPreferences={
            detailedConsent
              ? {
                  Analytics: detailedConsent.Analytics.consented,
                  Social: detailedConsent.Social.consented,
                  Advertising: detailedConsent.Advertising.consented,
                }
              : undefined
          }
        />
      )}
      {showManageConsent &&
        createPortal(
          <div className="cookie-manager">
            <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div
                className={`w-full max-w-lg rounded-xl p-6 ${
                  theme === "light"
                    ? "bg-white/95 ring-1 ring-black/10"
                    : "bg-black/95 ring-1 ring-white/10"
                }`}
              >
                <ManageConsent
                  tFunction={tFunction}
                  theme={theme}
                  onSave={updateDetailedConsent}
                  onCancel={handleCancelManage}
                  initialPreferences={
                    detailedConsent
                      ? {
                          Analytics: detailedConsent.Analytics.consented,
                          Social: detailedConsent.Social.consented,
                          Advertising: detailedConsent.Advertising.consented,
                        }
                      : undefined
                  }
                  detailedConsent={detailedConsent}
                  classNames={props.classNames}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
      {isFloatingButtonVisible &&
        !isVisible &&
        !showManageConsent &&
        createPortal(
          <div className="cookie-manager">
            <FloatingCookieButton
              theme={theme}
              onClick={() => {
                setShowManageConsent(true);
                setIsFloatingButtonVisible(false);
              }}
              onClose={() => {
                setIsFloatingButtonVisible(false);
              }}
              classNames={props.classNames}
            />
          </div>,
          document.body
        )}
    </CookieManagerContext.Provider>
  );
};

export const useCookieConsent = () => {
  const context = useContext(CookieManagerContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within a CookieManager");
  }
  return context;
};
