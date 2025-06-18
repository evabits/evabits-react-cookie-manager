import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect, createContext, useRef, useMemo, useContext } from "react";
import { createPortal } from "react-dom";
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}
const CLASS_PART_SEPARATOR = "-";
const createClassGroupUtils = (config) => {
  const classMap = createClassMap(config);
  const {
    conflictingClassGroups,
    conflictingClassGroupModifiers
  } = config;
  const getClassGroupId = (className) => {
    const classParts = className.split(CLASS_PART_SEPARATOR);
    if (classParts[0] === "" && classParts.length !== 1) {
      classParts.shift();
    }
    return getGroupRecursive(classParts, classMap) || getGroupIdForArbitraryProperty(className);
  };
  const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
    const conflicts = conflictingClassGroups[classGroupId] || [];
    if (hasPostfixModifier && conflictingClassGroupModifiers[classGroupId]) {
      return [...conflicts, ...conflictingClassGroupModifiers[classGroupId]];
    }
    return conflicts;
  };
  return {
    getClassGroupId,
    getConflictingClassGroupIds
  };
};
const getGroupRecursive = (classParts, classPartObject) => {
  var _a;
  if (classParts.length === 0) {
    return classPartObject.classGroupId;
  }
  const currentClassPart = classParts[0];
  const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
  const classGroupFromNextClassPart = nextClassPartObject ? getGroupRecursive(classParts.slice(1), nextClassPartObject) : void 0;
  if (classGroupFromNextClassPart) {
    return classGroupFromNextClassPart;
  }
  if (classPartObject.validators.length === 0) {
    return void 0;
  }
  const classRest = classParts.join(CLASS_PART_SEPARATOR);
  return (_a = classPartObject.validators.find(({
    validator
  }) => validator(classRest))) == null ? void 0 : _a.classGroupId;
};
const arbitraryPropertyRegex = /^\[(.+)\]$/;
const getGroupIdForArbitraryProperty = (className) => {
  if (arbitraryPropertyRegex.test(className)) {
    const arbitraryPropertyClassName = arbitraryPropertyRegex.exec(className)[1];
    const property = arbitraryPropertyClassName == null ? void 0 : arbitraryPropertyClassName.substring(0, arbitraryPropertyClassName.indexOf(":"));
    if (property) {
      return "arbitrary.." + property;
    }
  }
};
const createClassMap = (config) => {
  const {
    theme,
    classGroups
  } = config;
  const classMap = {
    nextPart: /* @__PURE__ */ new Map(),
    validators: []
  };
  for (const classGroupId in classGroups) {
    processClassesRecursively(classGroups[classGroupId], classMap, classGroupId, theme);
  }
  return classMap;
};
const processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
  classGroup.forEach((classDefinition) => {
    if (typeof classDefinition === "string") {
      const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
      classPartObjectToEdit.classGroupId = classGroupId;
      return;
    }
    if (typeof classDefinition === "function") {
      if (isThemeGetter(classDefinition)) {
        processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
        return;
      }
      classPartObject.validators.push({
        validator: classDefinition,
        classGroupId
      });
      return;
    }
    Object.entries(classDefinition).forEach(([key, classGroup2]) => {
      processClassesRecursively(classGroup2, getPart(classPartObject, key), classGroupId, theme);
    });
  });
};
const getPart = (classPartObject, path) => {
  let currentClassPartObject = classPartObject;
  path.split(CLASS_PART_SEPARATOR).forEach((pathPart) => {
    if (!currentClassPartObject.nextPart.has(pathPart)) {
      currentClassPartObject.nextPart.set(pathPart, {
        nextPart: /* @__PURE__ */ new Map(),
        validators: []
      });
    }
    currentClassPartObject = currentClassPartObject.nextPart.get(pathPart);
  });
  return currentClassPartObject;
};
const isThemeGetter = (func) => func.isThemeGetter;
const createLruCache = (maxCacheSize) => {
  if (maxCacheSize < 1) {
    return {
      get: () => void 0,
      set: () => {
      }
    };
  }
  let cacheSize = 0;
  let cache = /* @__PURE__ */ new Map();
  let previousCache = /* @__PURE__ */ new Map();
  const update = (key, value) => {
    cache.set(key, value);
    cacheSize++;
    if (cacheSize > maxCacheSize) {
      cacheSize = 0;
      previousCache = cache;
      cache = /* @__PURE__ */ new Map();
    }
  };
  return {
    get(key) {
      let value = cache.get(key);
      if (value !== void 0) {
        return value;
      }
      if ((value = previousCache.get(key)) !== void 0) {
        update(key, value);
        return value;
      }
    },
    set(key, value) {
      if (cache.has(key)) {
        cache.set(key, value);
      } else {
        update(key, value);
      }
    }
  };
};
const IMPORTANT_MODIFIER = "!";
const MODIFIER_SEPARATOR = ":";
const MODIFIER_SEPARATOR_LENGTH = MODIFIER_SEPARATOR.length;
const createParseClassName = (config) => {
  const {
    prefix,
    experimentalParseClassName
  } = config;
  let parseClassName = (className) => {
    const modifiers = [];
    let bracketDepth = 0;
    let parenDepth = 0;
    let modifierStart = 0;
    let postfixModifierPosition;
    for (let index = 0; index < className.length; index++) {
      let currentCharacter = className[index];
      if (bracketDepth === 0 && parenDepth === 0) {
        if (currentCharacter === MODIFIER_SEPARATOR) {
          modifiers.push(className.slice(modifierStart, index));
          modifierStart = index + MODIFIER_SEPARATOR_LENGTH;
          continue;
        }
        if (currentCharacter === "/") {
          postfixModifierPosition = index;
          continue;
        }
      }
      if (currentCharacter === "[") {
        bracketDepth++;
      } else if (currentCharacter === "]") {
        bracketDepth--;
      } else if (currentCharacter === "(") {
        parenDepth++;
      } else if (currentCharacter === ")") {
        parenDepth--;
      }
    }
    const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.substring(modifierStart);
    const baseClassName = stripImportantModifier(baseClassNameWithImportantModifier);
    const hasImportantModifier = baseClassName !== baseClassNameWithImportantModifier;
    const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : void 0;
    return {
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    };
  };
  if (prefix) {
    const fullPrefix = prefix + MODIFIER_SEPARATOR;
    const parseClassNameOriginal = parseClassName;
    parseClassName = (className) => className.startsWith(fullPrefix) ? parseClassNameOriginal(className.substring(fullPrefix.length)) : {
      isExternal: true,
      modifiers: [],
      hasImportantModifier: false,
      baseClassName: className,
      maybePostfixModifierPosition: void 0
    };
  }
  if (experimentalParseClassName) {
    const parseClassNameOriginal = parseClassName;
    parseClassName = (className) => experimentalParseClassName({
      className,
      parseClassName: parseClassNameOriginal
    });
  }
  return parseClassName;
};
const stripImportantModifier = (baseClassName) => {
  if (baseClassName.endsWith(IMPORTANT_MODIFIER)) {
    return baseClassName.substring(0, baseClassName.length - 1);
  }
  if (baseClassName.startsWith(IMPORTANT_MODIFIER)) {
    return baseClassName.substring(1);
  }
  return baseClassName;
};
const createSortModifiers = (config) => {
  const orderSensitiveModifiers = Object.fromEntries(config.orderSensitiveModifiers.map((modifier) => [modifier, true]));
  const sortModifiers = (modifiers) => {
    if (modifiers.length <= 1) {
      return modifiers;
    }
    const sortedModifiers = [];
    let unsortedModifiers = [];
    modifiers.forEach((modifier) => {
      const isPositionSensitive = modifier[0] === "[" || orderSensitiveModifiers[modifier];
      if (isPositionSensitive) {
        sortedModifiers.push(...unsortedModifiers.sort(), modifier);
        unsortedModifiers = [];
      } else {
        unsortedModifiers.push(modifier);
      }
    });
    sortedModifiers.push(...unsortedModifiers.sort());
    return sortedModifiers;
  };
  return sortModifiers;
};
const createConfigUtils = (config) => ({
  cache: createLruCache(config.cacheSize),
  parseClassName: createParseClassName(config),
  sortModifiers: createSortModifiers(config),
  ...createClassGroupUtils(config)
});
const SPLIT_CLASSES_REGEX = /\s+/;
const mergeClassList = (classList, configUtils) => {
  const {
    parseClassName,
    getClassGroupId,
    getConflictingClassGroupIds,
    sortModifiers
  } = configUtils;
  const classGroupsInConflict = [];
  const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
  let result = "";
  for (let index = classNames.length - 1; index >= 0; index -= 1) {
    const originalClassName = classNames[index];
    const {
      isExternal,
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    } = parseClassName(originalClassName);
    if (isExternal) {
      result = originalClassName + (result.length > 0 ? " " + result : result);
      continue;
    }
    let hasPostfixModifier = !!maybePostfixModifierPosition;
    let classGroupId = getClassGroupId(hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
    if (!classGroupId) {
      if (!hasPostfixModifier) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      classGroupId = getClassGroupId(baseClassName);
      if (!classGroupId) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      hasPostfixModifier = false;
    }
    const variantModifier = sortModifiers(modifiers).join(":");
    const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
    const classId = modifierId + classGroupId;
    if (classGroupsInConflict.includes(classId)) {
      continue;
    }
    classGroupsInConflict.push(classId);
    const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
    for (let i = 0; i < conflictGroups.length; ++i) {
      const group = conflictGroups[i];
      classGroupsInConflict.push(modifierId + group);
    }
    result = originalClassName + (result.length > 0 ? " " + result : result);
  }
  return result;
};
function twJoin() {
  let index = 0;
  let argument;
  let resolvedValue;
  let string = "";
  while (index < arguments.length) {
    if (argument = arguments[index++]) {
      if (resolvedValue = toValue(argument)) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
}
const toValue = (mix) => {
  if (typeof mix === "string") {
    return mix;
  }
  let resolvedValue;
  let string = "";
  for (let k = 0; k < mix.length; k++) {
    if (mix[k]) {
      if (resolvedValue = toValue(mix[k])) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
};
function createTailwindMerge(createConfigFirst, ...createConfigRest) {
  let configUtils;
  let cacheGet;
  let cacheSet;
  let functionToCall = initTailwindMerge;
  function initTailwindMerge(classList) {
    const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
    configUtils = createConfigUtils(config);
    cacheGet = configUtils.cache.get;
    cacheSet = configUtils.cache.set;
    functionToCall = tailwindMerge;
    return tailwindMerge(classList);
  }
  function tailwindMerge(classList) {
    const cachedResult = cacheGet(classList);
    if (cachedResult) {
      return cachedResult;
    }
    const result = mergeClassList(classList, configUtils);
    cacheSet(classList, result);
    return result;
  }
  return function callTailwindMerge() {
    return functionToCall(twJoin.apply(null, arguments));
  };
}
const fromTheme = (key) => {
  const themeGetter = (theme) => theme[key] || [];
  themeGetter.isThemeGetter = true;
  return themeGetter;
};
const arbitraryValueRegex = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
const arbitraryVariableRegex = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
const fractionRegex = /^\d+\/\d+$/;
const tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
const lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
const colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/;
const shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
const imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
const isFraction = (value) => fractionRegex.test(value);
const isNumber = (value) => Boolean(value) && !Number.isNaN(Number(value));
const isInteger = (value) => Boolean(value) && Number.isInteger(Number(value));
const isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
const isTshirtSize = (value) => tshirtUnitRegex.test(value);
const isAny = () => true;
const isLengthOnly = (value) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  lengthUnitRegex.test(value) && !colorFunctionRegex.test(value)
);
const isNever = () => false;
const isShadow = (value) => shadowRegex.test(value);
const isImage = (value) => imageRegex.test(value);
const isAnyNonArbitrary = (value) => !isArbitraryValue(value) && !isArbitraryVariable(value);
const isArbitrarySize = (value) => getIsArbitraryValue(value, isLabelSize, isNever);
const isArbitraryValue = (value) => arbitraryValueRegex.test(value);
const isArbitraryLength = (value) => getIsArbitraryValue(value, isLabelLength, isLengthOnly);
const isArbitraryNumber = (value) => getIsArbitraryValue(value, isLabelNumber, isNumber);
const isArbitraryPosition = (value) => getIsArbitraryValue(value, isLabelPosition, isNever);
const isArbitraryImage = (value) => getIsArbitraryValue(value, isLabelImage, isImage);
const isArbitraryShadow = (value) => getIsArbitraryValue(value, isNever, isShadow);
const isArbitraryVariable = (value) => arbitraryVariableRegex.test(value);
const isArbitraryVariableLength = (value) => getIsArbitraryVariable(value, isLabelLength);
const isArbitraryVariableFamilyName = (value) => getIsArbitraryVariable(value, isLabelFamilyName);
const isArbitraryVariablePosition = (value) => getIsArbitraryVariable(value, isLabelPosition);
const isArbitraryVariableSize = (value) => getIsArbitraryVariable(value, isLabelSize);
const isArbitraryVariableImage = (value) => getIsArbitraryVariable(value, isLabelImage);
const isArbitraryVariableShadow = (value) => getIsArbitraryVariable(value, isLabelShadow, true);
const getIsArbitraryValue = (value, testLabel, testValue) => {
  const result = arbitraryValueRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return testValue(result[2]);
  }
  return false;
};
const getIsArbitraryVariable = (value, testLabel, shouldMatchNoLabel = false) => {
  const result = arbitraryVariableRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return shouldMatchNoLabel;
  }
  return false;
};
const isLabelPosition = (label) => label === "position";
const imageLabels = /* @__PURE__ */ new Set(["image", "url"]);
const isLabelImage = (label) => imageLabels.has(label);
const sizeLabels = /* @__PURE__ */ new Set(["length", "size", "percentage"]);
const isLabelSize = (label) => sizeLabels.has(label);
const isLabelLength = (label) => label === "length";
const isLabelNumber = (label) => label === "number";
const isLabelFamilyName = (label) => label === "family-name";
const isLabelShadow = (label) => label === "shadow";
const getDefaultConfig = () => {
  const themeColor = fromTheme("color");
  const themeFont = fromTheme("font");
  const themeText = fromTheme("text");
  const themeFontWeight = fromTheme("font-weight");
  const themeTracking = fromTheme("tracking");
  const themeLeading = fromTheme("leading");
  const themeBreakpoint = fromTheme("breakpoint");
  const themeContainer = fromTheme("container");
  const themeSpacing = fromTheme("spacing");
  const themeRadius = fromTheme("radius");
  const themeShadow = fromTheme("shadow");
  const themeInsetShadow = fromTheme("inset-shadow");
  const themeDropShadow = fromTheme("drop-shadow");
  const themeBlur = fromTheme("blur");
  const themePerspective = fromTheme("perspective");
  const themeAspect = fromTheme("aspect");
  const themeEase = fromTheme("ease");
  const themeAnimate = fromTheme("animate");
  const scaleBreak = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"];
  const scalePosition = () => ["bottom", "center", "left", "left-bottom", "left-top", "right", "right-bottom", "right-top", "top"];
  const scaleOverflow = () => ["auto", "hidden", "clip", "visible", "scroll"];
  const scaleOverscroll = () => ["auto", "contain", "none"];
  const scaleUnambiguousSpacing = () => [isArbitraryVariable, isArbitraryValue, themeSpacing];
  const scaleInset = () => [isFraction, "full", "auto", ...scaleUnambiguousSpacing()];
  const scaleGridTemplateColsRows = () => [isInteger, "none", "subgrid", isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartAndEnd = () => ["auto", {
    span: ["full", isInteger, isArbitraryVariable, isArbitraryValue]
  }, isInteger, isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartOrEnd = () => [isInteger, "auto", isArbitraryVariable, isArbitraryValue];
  const scaleGridAutoColsRows = () => ["auto", "min", "max", "fr", isArbitraryVariable, isArbitraryValue];
  const scaleAlignPrimaryAxis = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline"];
  const scaleAlignSecondaryAxis = () => ["start", "end", "center", "stretch"];
  const scaleMargin = () => ["auto", ...scaleUnambiguousSpacing()];
  const scaleSizing = () => [isFraction, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...scaleUnambiguousSpacing()];
  const scaleColor = () => [themeColor, isArbitraryVariable, isArbitraryValue];
  const scaleGradientStopPosition = () => [isPercent, isArbitraryVariableLength, isArbitraryLength];
  const scaleRadius = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    themeRadius,
    isArbitraryVariable,
    isArbitraryValue
  ];
  const scaleBorderWidth = () => ["", isNumber, isArbitraryVariableLength, isArbitraryLength];
  const scaleLineStyle = () => ["solid", "dashed", "dotted", "double"];
  const scaleBlendMode = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
  const scaleBlur = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    themeBlur,
    isArbitraryVariable,
    isArbitraryValue
  ];
  const scaleOrigin = () => ["center", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left", isArbitraryVariable, isArbitraryValue];
  const scaleRotate = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleScale = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleSkew = () => [isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleTranslate = () => [isFraction, "full", ...scaleUnambiguousSpacing()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [isTshirtSize],
      breakpoint: [isTshirtSize],
      color: [isAny],
      container: [isTshirtSize],
      "drop-shadow": [isTshirtSize],
      ease: ["in", "out", "in-out"],
      font: [isAnyNonArbitrary],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [isTshirtSize],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [isTshirtSize],
      shadow: [isTshirtSize],
      spacing: ["px", isNumber],
      text: [isTshirtSize],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", isFraction, isArbitraryValue, isArbitraryVariable, themeAspect]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [isNumber, isArbitraryValue, isArbitraryVariable, themeContainer]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": scaleBreak()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": scaleBreak()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: [...scalePosition(), isArbitraryValue, isArbitraryVariable]
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: scaleOverflow()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": scaleOverflow()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": scaleOverflow()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: scaleOverscroll()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": scaleOverscroll()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": scaleOverscroll()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: scaleInset()
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": scaleInset()
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": scaleInset()
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: scaleInset()
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: scaleInset()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: scaleInset()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: scaleInset()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: scaleInset()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: scaleInset()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [isInteger, "auto", isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [isFraction, "full", "auto", themeContainer, ...scaleUnambiguousSpacing()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [isNumber, isFraction, "auto", "initial", "none", isArbitraryValue]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [isInteger, "first", "last", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": scaleGridTemplateColsRows()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": scaleGridTemplateColsRows()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": scaleGridAutoColsRows()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": scaleGridAutoColsRows()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: scaleUnambiguousSpacing()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": scaleUnambiguousSpacing()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": scaleUnambiguousSpacing()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...scaleAlignPrimaryAxis(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...scaleAlignSecondaryAxis(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...scaleAlignSecondaryAxis()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...scaleAlignPrimaryAxis()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...scaleAlignSecondaryAxis(), "baseline"]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...scaleAlignSecondaryAxis(), "baseline"]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": scaleAlignPrimaryAxis()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...scaleAlignSecondaryAxis(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...scaleAlignSecondaryAxis()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: scaleUnambiguousSpacing()
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: scaleUnambiguousSpacing()
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: scaleUnambiguousSpacing()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: scaleMargin()
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: scaleMargin()
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: scaleMargin()
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: scaleMargin()
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: scaleMargin()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: scaleMargin()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: scaleMargin()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: scaleMargin()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: scaleMargin()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": scaleUnambiguousSpacing()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": scaleUnambiguousSpacing()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: scaleSizing()
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [themeContainer, "screen", ...scaleSizing()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          themeContainer,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...scaleSizing()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          themeContainer,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [themeBreakpoint]
          },
          ...scaleSizing()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", ...scaleSizing()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "none", ...scaleSizing()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", ...scaleSizing()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", themeText, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [themeFontWeight, isArbitraryVariable, isArbitraryNumber]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", isPercent, isArbitraryValue]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [isArbitraryVariableFamilyName, isArbitraryValue, themeFont]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [themeTracking, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [isNumber, "none", isArbitraryVariable, isArbitraryNumber]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          themeLeading,
          ...scaleUnambiguousSpacing()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: scaleColor()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: scaleColor()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...scaleLineStyle(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [isNumber, "from-font", "auto", isArbitraryVariable, isArbitraryLength]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: scaleColor()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [isNumber, "auto", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: scaleUnambiguousSpacing()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", isArbitraryVariable, isArbitraryValue]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: [...scalePosition(), isArbitraryVariablePosition, isArbitraryPosition]
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: ["no-repeat", {
          repeat: ["", "x", "y", "space", "round"]
        }]
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: ["auto", "cover", "contain", isArbitraryVariableSize, isArbitrarySize]
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, isInteger, isArbitraryVariable, isArbitraryValue],
          radial: ["", isArbitraryVariable, isArbitraryValue],
          conic: [isInteger, isArbitraryVariable, isArbitraryValue]
        }, isArbitraryVariableImage, isArbitraryImage]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: scaleColor()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: scaleColor()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: scaleColor()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: scaleColor()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: scaleRadius()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": scaleRadius()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": scaleRadius()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": scaleRadius()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": scaleRadius()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": scaleRadius()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": scaleRadius()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": scaleRadius()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": scaleRadius()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": scaleRadius()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": scaleRadius()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": scaleRadius()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": scaleRadius()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": scaleRadius()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": scaleRadius()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: scaleBorderWidth()
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": scaleBorderWidth()
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": scaleBorderWidth()
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": scaleBorderWidth()
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": scaleBorderWidth()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": scaleBorderWidth()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": scaleBorderWidth()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": scaleBorderWidth()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": scaleBorderWidth()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": scaleBorderWidth()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": scaleBorderWidth()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...scaleLineStyle(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...scaleLineStyle(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: scaleColor()
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": scaleColor()
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": scaleColor()
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": scaleColor()
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": scaleColor()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": scaleColor()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": scaleColor()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": scaleColor()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": scaleColor()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: scaleColor()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...scaleLineStyle(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", isNumber, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: [themeColor]
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          themeShadow,
          isArbitraryVariableShadow,
          isArbitraryShadow
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: scaleColor()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", isArbitraryVariable, isArbitraryValue, themeInsetShadow]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": scaleColor()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: scaleBorderWidth()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: scaleColor()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [isNumber, isArbitraryLength]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": scaleColor()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": scaleBorderWidth()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": scaleColor()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...scaleBlendMode(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": scaleBlendMode()
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: scaleBlur()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          themeDropShadow,
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": scaleBlur()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": scaleUnambiguousSpacing()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [isNumber, "initial", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", themeEase, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", themeAnimate, isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [themePerspective, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": scaleOrigin()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: scaleRotate()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": scaleRotate()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": scaleRotate()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": scaleRotate()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: scaleScale()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": scaleScale()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": scaleScale()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": scaleScale()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: scaleSkew()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": scaleSkew()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": scaleSkew()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [isArbitraryVariable, isArbitraryValue, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: scaleOrigin()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: scaleTranslate()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": scaleTranslate()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": scaleTranslate()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": scaleTranslate()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: scaleColor()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: scaleColor()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", isArbitraryVariable, isArbitraryValue]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...scaleColor()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [isNumber, isArbitraryVariableLength, isArbitraryLength, isArbitraryNumber]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...scaleColor()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    },
    orderSensitiveModifiers: ["before", "after", "placeholder", "file", "marker", "selection", "first-line", "first-letter", "backdrop", "*", "**"]
  };
};
const twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const ManageConsent = ({
  theme = "light",
  tFunction,
  onSave,
  onCancel,
  initialPreferences = {
    Analytics: false,
    Social: false,
    Advertising: false
  },
  detailedConsent,
  classNames
}) => {
  const [consent, setConsent] = useState(initialPreferences);
  const handleToggle = (category) => {
    setConsent((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  const handleSave = () => {
    onSave(consent);
  };
  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString(void 0, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Invalid date";
    }
  };
  const renderConsentStatus = (category) => {
    if (!detailedConsent || !detailedConsent[category]) return null;
    const status = detailedConsent[category];
    return /* @__PURE__ */ jsx(
      "p",
      {
        className: (classNames == null ? void 0 : classNames.manageCookieStatusText) ? cn(classNames.manageCookieStatusText) : cn(
          "text-xs mt-1 text-left",
          theme === "light" ? "text-gray-500" : "text-gray-500"
        ),
        children: tFunction("manageCookiesStatus", {
          status: status.consented ? tFunction("manageCookiesStatusConsented") : tFunction("manageCookiesStatusDeclined"),
          date: formatDate(status.timestamp)
        })
      }
    );
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: (classNames == null ? void 0 : classNames.manageCookieContainer) ? cn(classNames.manageCookieContainer) : "flex flex-col gap-6",
      children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "h3",
            {
              className: (classNames == null ? void 0 : classNames.manageCookieTitle) ? cn(classNames.manageCookieTitle) : cn(
                "text-sm font-semibold mb-2",
                theme === "light" ? "text-gray-900" : "text-white"
              ),
              children: tFunction("manageTitle")
            }
          ),
          /* @__PURE__ */ jsx(
            "p",
            {
              className: (classNames == null ? void 0 : classNames.manageCookieMessage) ? cn(classNames.manageCookieMessage) : cn(
                "text-xs",
                theme === "light" ? "text-gray-700" : "text-gray-200"
              ),
              children: tFunction("manageMessage")
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4", children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: (classNames == null ? void 0 : classNames.manageCookieCategory) ? cn(classNames.manageCookieCategory) : "flex items-start justify-between",
              children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(
                    "h4",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieCategoryTitle) ? cn(classNames.manageCookieCategoryTitle) : cn(
                        "text-xs font-medium text-left",
                        theme === "light" ? "text-gray-900" : "text-white"
                      ),
                      children: tFunction("manageEssentialTitle")
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "p",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieCategorySubtitle) ? cn(classNames.manageCookieCategorySubtitle) : cn(
                        "text-xs text-left",
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      ),
                      children: tFunction("manageEssentialSubtitle")
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "p",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieStatusText) ? cn(classNames.manageCookieStatusText) : cn(
                        "text-xs mt-1 text-left",
                        theme === "light" ? "text-gray-500" : "text-gray-500"
                      ),
                      children: tFunction("manageEssentialStatus")
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: `px-3 py-1 text-xs text-center font-medium rounded-full ${theme === "light" ? "bg-gray-200 text-gray-600" : "bg-gray-800 text-gray-300"}`,
                    children: tFunction("manageEssentialStatusButtonText")
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: (classNames == null ? void 0 : classNames.manageCookieCategory) ? cn(classNames.manageCookieCategory) : "flex items-start justify-between",
              children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(
                    "h4",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieCategoryTitle) ? cn(classNames.manageCookieCategoryTitle) : cn(
                        "text-xs font-medium text-left",
                        theme === "light" ? "text-gray-900" : "text-white"
                      ),
                      children: tFunction("manageAnalyticsTitle")
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "p",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieCategorySubtitle) ? cn(classNames.manageCookieCategorySubtitle) : cn(
                        "text-xs text-left",
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      ),
                      children: tFunction("manageAnalyticsSubtitle")
                    }
                  ),
                  renderConsentStatus("Analytics")
                ] }),
                /* @__PURE__ */ jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: consent.Analytics,
                      onChange: () => handleToggle("Analytics"),
                      className: "sr-only peer"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieToggle) ? cn(
                        classNames.manageCookieToggle,
                        consent.Analytics && classNames.manageCookieToggleChecked
                      ) : cn(`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 
                ${theme === "light" ? "bg-gray-200 peer-checked:bg-blue-500" : "bg-gray-700 peer-checked:bg-blue-500"} 
                peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 
                after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 
                after:transition-all`)
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: (classNames == null ? void 0 : classNames.manageCookieCategory) ? cn(classNames.manageCookieCategory) : "flex items-start justify-between",
              children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(
                    "h4",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieCategoryTitle) ? cn(classNames.manageCookieCategoryTitle) : cn(
                        "text-xs font-medium text-left",
                        theme === "light" ? "text-gray-900" : "text-white"
                      ),
                      children: tFunction("manageSocialTitle")
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "p",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieCategorySubtitle) ? cn(classNames.manageCookieCategorySubtitle) : cn(
                        "text-xs text-left",
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      ),
                      children: tFunction("manageSocialSubtitle")
                    }
                  ),
                  renderConsentStatus("Social")
                ] }),
                /* @__PURE__ */ jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: consent.Social,
                      onChange: () => handleToggle("Social"),
                      className: "sr-only peer"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieToggle) ? cn(
                        classNames.manageCookieToggle,
                        consent.Social && classNames.manageCookieToggleChecked
                      ) : cn(`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 
                ${theme === "light" ? "bg-gray-200 peer-checked:bg-blue-500" : "bg-gray-700 peer-checked:bg-blue-500"} 
                peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 
                after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 
                after:transition-all`)
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: (classNames == null ? void 0 : classNames.manageCookieCategory) ? cn(classNames.manageCookieCategory) : "flex items-start justify-between",
              children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(
                    "h4",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieCategoryTitle) ? cn(classNames.manageCookieCategoryTitle) : cn(
                        "text-xs font-medium text-left",
                        theme === "light" ? "text-gray-900" : "text-white"
                      ),
                      children: tFunction("manageAdvertTitle")
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "p",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieCategorySubtitle) ? cn(classNames.manageCookieCategorySubtitle) : cn(
                        "text-xs text-left",
                        theme === "light" ? "text-gray-600" : "text-gray-400"
                      ),
                      children: tFunction("manageAdvertSubtitle")
                    }
                  ),
                  renderConsentStatus("Advertising")
                ] }),
                /* @__PURE__ */ jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: consent.Advertising,
                      onChange: () => handleToggle("Advertising"),
                      className: "sr-only peer"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: (classNames == null ? void 0 : classNames.manageCookieToggle) ? cn(
                        classNames.manageCookieToggle,
                        consent.Advertising && classNames.manageCookieToggleChecked
                      ) : cn(`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 
                ${theme === "light" ? "bg-gray-200 peer-checked:bg-blue-500" : "bg-gray-700 peer-checked:bg-blue-500"} 
                peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 
                after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 
                after:transition-all`)
                    }
                  )
                ] })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3 mt-2 sm:justify-end", children: [
          onCancel && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onCancel,
              className: (classNames == null ? void 0 : classNames.manageCancelButton) ? cn(classNames.manageCancelButton) : cn(
                `w-full sm:w-auto px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 ${theme === "light" ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : "bg-gray-800 hover:bg-gray-700 text-gray-300"}`
              ),
              children: tFunction("manageCancelButtonText")
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleSave,
              className: (classNames == null ? void 0 : classNames.manageSaveButton) ? cn(classNames.manageSaveButton) : "w-full sm:w-auto px-3 py-2 sm:py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105",
              children: tFunction("manageSaveButtonText")
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-center mt-4", children: /* @__PURE__ */ jsx(
          "a",
          {
            href: "https://cookiekit.io",
            target: "_blank",
            rel: "noopener noreferrer",
            className: (classNames == null ? void 0 : classNames.poweredByLink) ? cn(classNames.poweredByLink) : cn(
              `text-xs transition-opacity duration-200 ${theme === "light" ? "text-gray-500 hover:text-gray-700" : "text-gray-400 hover:text-gray-200"}`
            ),
            children: "Powered by CookieKit"
          }
        ) })
      ]
    }
  );
};
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);
  return isMobile;
};
const MobileModal = ({
  showManageButton,
  privacyPolicyUrl,
  theme,
  tFunction,
  handleAccept,
  handleDecline,
  handleManage,
  isExiting,
  isEntering,
  isManaging,
  handleSavePreferences,
  handleCancelManage,
  displayType = "banner",
  initialPreferences,
  detailedConsent,
  classNames
}) => {
  const title = tFunction("title");
  return /* @__PURE__ */ jsxs("div", { className: "cookie-manager", children: [
    displayType === "modal" && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm" }),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "fixed inset-x-0 bottom-0 px-4 pb-4 pt-2 z-[99999]",
          "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isExiting ? "translate-y-full" : isEntering ? "translate-y-full" : "translate-y-0"
        ),
        children: /* @__PURE__ */ jsx(
          "div",
          {
            className: cn(
              "p-4 mx-auto max-w-[calc(100vw-32px)]",
              theme === "light" ? "bg-white/95 ring-1 ring-black/10" : "bg-black/95 ring-1 ring-white/10",
              "rounded-2xl backdrop-blur-sm backdrop-saturate-150"
            ),
            children: isManaging ? /* @__PURE__ */ jsx(
              ManageConsent,
              {
                theme,
                tFunction,
                onSave: handleSavePreferences,
                onCancel: handleCancelManage,
                initialPreferences,
                detailedConsent,
                classNames
              }
            ) : /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
              title && /* @__PURE__ */ jsx(
                "h3",
                {
                  className: cn(
                    (classNames == null ? void 0 : classNames.bannerTitle) || "font-semibold my-0",
                    theme === "light" ? "text-gray-900" : "text-white"
                  ),
                  children: title
                }
              ),
              /* @__PURE__ */ jsx(
                "p",
                {
                  className: cn(
                    (classNames == null ? void 0 : classNames.bannerMessage) || "text-sm",
                    theme === "light" ? "text-gray-700" : "text-gray-200"
                  ),
                  children: tFunction("message")
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: handleAccept,
                    className: (classNames == null ? void 0 : classNames.acceptButton) ? cn(classNames.acceptButton) : cn(
                      "w-full px-3 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus-visible:outline-none focus:outline-none focus-visible:outline-transparent focus:outline-transparent"
                    ),
                    children: tFunction("buttonText")
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: handleDecline,
                    className: (classNames == null ? void 0 : classNames.declineButton) ? cn(classNames.declineButton) : cn(
                      "w-full px-3 py-2.5 text-sm font-medium rounded-lg focus-visible:outline-none focus:outline-none focus-visible:outline-transparent focus:outline-transparent",
                      theme === "light" ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    ),
                    children: tFunction("declineButtonText")
                  }
                ),
                showManageButton && /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: handleManage,
                    className: (classNames == null ? void 0 : classNames.manageButton) ? cn(classNames.manageButton) : cn(
                      "w-full px-3 py-2.5 text-sm font-medium bg-transparent text-blue-500 border border-blue-500 rounded-lg hover:text-blue-400 hover:border-blue-400 focus-visible:outline-none focus:outline-none focus-visible:outline-transparent focus:outline-transparent"
                    ),
                    children: tFunction("manageButtonText")
                  }
                )
              ] }),
              privacyPolicyUrl && /* @__PURE__ */ jsx(
                "a",
                {
                  href: privacyPolicyUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: (classNames == null ? void 0 : classNames.privacyPolicyLink) ? cn(classNames.privacyPolicyLink) : cn(
                    "text-xs text-right",
                    theme === "light" ? "text-gray-500 hover:text-gray-700" : "text-gray-400 hover:text-gray-200"
                  ),
                  children: tFunction("privacyPolicyText")
                }
              )
            ] })
          }
        )
      }
    )
  ] });
};
const CookieConsenter = ({
  showManageButton = true,
  privacyPolicyUrl,
  displayType = "popup",
  theme = "light",
  tFunction,
  onAccept,
  onDecline,
  onManage,
  initialPreferences = {
    Analytics: false,
    Social: false,
    Advertising: false
  },
  detailedConsent,
  isManaging = false,
  classNames
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);
  const isMobile = useIsMobile();
  useEffect(() => {
    setTimeout(() => {
      setIsEntering(false);
    }, 50);
  }, []);
  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isExiting]);
  const handleAcceptClick = (e) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      if (onAccept) onAccept();
    }, 500);
  };
  const handleDeclineClick = (e) => {
    e.preventDefault();
    onManage();
    console.log("User clicked DeclineButton, but it's going to be handled by the manage button");
    // setIsExiting(true);
    // setTimeout(() => {
    //   if (onDecline) onDecline();
    // }, 500);
  };
  const handleManageClick = (e) => {
    e.preventDefault();
    if (onManage) onManage();
  };
  const handleSavePreferences = (categories) => {
    setIsExiting(true);
    setTimeout(() => {
      if (onManage) {
        onManage(categories);
      }
    }, 500);
  };
  const handleCancelManage = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onManage) onManage();
    }, 500);
  };
  if (!shouldRender) return null;
  if (isManaging) {
    return null;
  }
  if (isMobile) {
    return createPortal(
      /* @__PURE__ */ jsx(
        MobileModal,
        {
          ...{
            showManageButton,
            privacyPolicyUrl,
            theme,
            tFunction,
            handleAccept: handleAcceptClick,
            handleDecline: handleDeclineClick,
            handleManage: handleManageClick,
            isExiting,
            isEntering,
            isManaging: false,
            handleSavePreferences,
            handleCancelManage,
            displayType,
            initialPreferences,
            detailedConsent,
            classNames
          }
        }
      ),
      document.body
    );
  }
  const acceptButtonClasses = (classNames == null ? void 0 : classNames.acceptButton) ? cn(classNames.acceptButton) : cn(
    "px-3 py-1.5 text-xs font-medium rounded-md",
    "bg-blue-500 hover:bg-blue-600 text-white",
    "transition-all duration-200",
    "hover:scale-105 focus-visible:outline-none focus:outline-none",
    "focus-visible:outline-transparent focus:outline-transparent",
    displayType === "popup" ? "flex-1" : ""
  );
  const declineButtonClasses = (classNames == null ? void 0 : classNames.declineButton) ? cn(classNames.declineButton) : cn(
    "px-3 py-1.5 text-xs font-medium rounded-md",
    theme === "light" ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : "bg-gray-800 hover:bg-gray-700 text-gray-300",
    "transition-all duration-200",
    "hover:scale-105 focus-visible:outline-none focus:outline-none",
    "focus-visible:outline-transparent focus:outline-transparent",
    displayType === "popup" ? "flex-1" : ""
  );
  const manageButtonClasses = (classNames == null ? void 0 : classNames.manageButton) ? cn(classNames.manageButton) : cn(
    "px-3 py-1.5 text-xs font-medium rounded-md",
    "border border-blue-500 text-blue-500",
    "bg-transparent",
    "hover:text-blue-600 hover:border-blue-600",
    "transition-all duration-200",
    "hover:scale-105 focus-visible:outline-none focus:outline-none",
    "focus-visible:outline-transparent focus:outline-transparent",
    displayType === "popup" ? "flex-1" : ""
  );
  const privacyLinkClasses = (classNames == null ? void 0 : classNames.privacyPolicyLink) ? cn(classNames.privacyPolicyLink) : cn(
    "text-xs font-medium",
    theme === "light" ? "text-gray-500 hover:text-gray-700" : "text-gray-400 hover:text-gray-200",
    "transition-colors duration-200"
  );
  const modalBaseClasses = (classNames == null ? void 0 : classNames.modalContainer) ? cn(classNames.modalContainer) : cn(
    "fixed inset-0 flex items-center justify-center p-4",
    theme === "light" ? "bg-black/20 backdrop-blur-sm" : "bg-black/40 backdrop-blur-sm",
    "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "z-[99999]",
    isExiting ? "opacity-0" : isEntering ? "opacity-0" : "opacity-100"
  );
  const modalContentClasses = (classNames == null ? void 0 : classNames.modalContent) ? cn(classNames.modalContent) : cn(
    "w-full max-w-lg rounded-xl p-6",
    theme === "light" ? "bg-white/95 ring-2 ring-gray-200" : "bg-black/95 ring-1 ring-white/10",
    isExiting ? "scale-95" : isEntering ? "scale-95" : "scale-100",
    "transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
  );
  const modalTitleClasses = (classNames == null ? void 0 : classNames.modalTitle) ? cn(classNames.modalTitle) : cn(
    "text-lg font-semibold mb-3",
    theme === "light" ? "text-gray-900" : "text-white"
  );
  const modalMessageClasses = (classNames == null ? void 0 : classNames.modalMessage) ? cn(classNames.modalMessage) : cn(
    "text-sm font-medium mb-6",
    theme === "light" ? "text-gray-700" : "text-gray-200"
  );
  const popupBaseClasses = (classNames == null ? void 0 : classNames.popupContainer) ? cn(classNames.popupContainer) : cn(
    "fixed bottom-4 left-4 w-80",
    theme === "light" ? "bg-white/95 ring-1 ring-black/10 shadow-lg" : "bg-black/95 ring-1 ring-white/10",
    "rounded-lg backdrop-blur-sm backdrop-saturate-150",
    "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "z-[99999] hover:-translate-y-2",
    isExiting ? "opacity-0 scale-95" : isEntering ? "opacity-0 scale-95" : "opacity-100 scale-100"
  );
  const bannerBaseClasses = (classNames == null ? void 0 : classNames.bannerContainer) ? cn(classNames.bannerContainer) : cn(
    "fixed bottom-4 left-1/2 -translate-x-1/2 w-full md:max-w-2xl",
    theme === "light" ? "bg-white/95 border border-black/10 shadow-lg" : "bg-black/95 ring-1 ring-white/10",
    "rounded-lg backdrop-blur-sm backdrop-saturate-150",
    "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "z-[99999] hover:-translate-y-2",
    isExiting ? "opacity-0 transform translate-y-full" : isEntering ? "opacity-0 transform translate-y-full" : "opacity-100 transform translate-y-0"
  );
  const bannerContentClasses = (classNames == null ? void 0 : classNames.bannerContent) ? cn(classNames.bannerContent) : cn(
    "flex flex-col gap-4 p-4",
    theme === "light" ? "text-gray-600" : "text-gray-300"
  );
  const popupContentClasses = (classNames == null ? void 0 : classNames.popupContent) ? cn(classNames.popupContent) : cn(
    "flex flex-col items-start gap-4 p-4",
    theme === "light" ? "text-gray-600" : "text-gray-300"
  );
  const bannerTitleClasses = (classNames == null ? void 0 : classNames.bannerTitle) ? cn(classNames.bannerTitle) : cn(
    "text-sm font-semibold mb-1",
    theme === "light" ? "text-gray-900" : "text-white"
  );
  const popupTitleClasses = (classNames == null ? void 0 : classNames.popupTitle) ? cn(classNames.popupTitle) : cn(
    "text-sm font-semibold mb-2",
    theme === "light" ? "text-gray-900" : "text-white"
  );
  const bannerMessageClasses = (classNames == null ? void 0 : classNames.bannerMessage) ? cn(classNames.bannerMessage) : cn(
    "text-xs sm:text-sm font-medium text-center sm:text-left",
    theme === "light" ? "text-gray-700" : "text-gray-200"
  );
  const popupMessageClasses = (classNames == null ? void 0 : classNames.popupMessage) ? cn(classNames.popupMessage) : cn(
    "text-xs font-medium",
    theme === "light" ? "text-gray-700" : "text-gray-200"
  );
  const getBaseClasses = () => {
    switch (displayType) {
      case "modal":
        return modalBaseClasses;
      case "popup":
        return popupBaseClasses;
      default:
        return bannerBaseClasses;
    }
  };
  const getContentClasses = () => {
    switch (displayType) {
      case "modal":
        return modalContentClasses;
      case "popup":
        return popupContentClasses;
      default:
        return bannerContentClasses;
    }
  };
  const getTitleClasses = () => {
    switch (displayType) {
      case "modal":
        return modalTitleClasses;
      case "popup":
        return popupTitleClasses;
      default:
        return bannerTitleClasses;
    }
  };
  const getMessageClasses = () => {
    switch (displayType) {
      case "modal":
        return modalMessageClasses;
      case "popup":
        return popupMessageClasses;
      default:
        return bannerMessageClasses;
    }
  };
  const renderContent = () => {
    const title = tFunction("title");
    if (displayType === "banner") {
      return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          title && /* @__PURE__ */ jsx("p", { className: getTitleClasses(), children: title }),
          /* @__PURE__ */ jsx("p", { className: getMessageClasses(), children: tFunction("message") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between w-full", children: [
          privacyPolicyUrl && /* @__PURE__ */ jsx(
            "a",
            {
              href: privacyPolicyUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: privacyLinkClasses,
              children: tFunction("privacyPolicyText")
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 ml-auto", children: [
            showManageButton && /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleManageClick,
                className: manageButtonClasses,
                children: tFunction("manageButtonText")
              }
            ),
            // /* @__PURE__ */ jsx(
            //   "button",
            //   {
            //     onClick: handleManageClick,
            //     className: declineButtonClasses,
            //     children: tFunction("manageButtonText")
            //   }
            // ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleAcceptClick,
                className: acceptButtonClasses,
                children: tFunction("buttonText")
              }
            )
          ] })
        ] })
      ] });
    }
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
      title && /* @__PURE__ */ jsx("p", { className: getTitleClasses(), children: title }),
      /* @__PURE__ */ jsx("p", { className: getMessageClasses(), children: tFunction("message") })
    ] });
  };
  const renderButtons = () => {
    if (displayType === "popup") {
      return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 w-full", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 justify-end", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleManageClick,
              className: manageButtonClasses,
              children: tFunction("declineButtonText")
            }
          ),
          /* @__PURE__ */ jsx("button", { onClick: handleAcceptClick, className: acceptButtonClasses, children: tFunction("buttonText") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 w-full", children: [
          showManageButton && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleManageClick,
              className: `${manageButtonClasses} w-full justify-center`,
              children: tFunction("manageButtonText")
            }
          ),
          privacyPolicyUrl && /* @__PURE__ */ jsx(
            "a",
            {
              href: privacyPolicyUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: `${privacyLinkClasses.trim()} text-right`,
              children: tFunction("privacyPolicyText")
            }
          )
        ] })
      ] });
    }
    if (displayType === "modal") {
      return /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end", children: [
        privacyPolicyUrl && /* @__PURE__ */ jsx(
          "a",
          {
            href: privacyPolicyUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            className: `${privacyLinkClasses.trim()} mr-auto`,
            children: tFunction("privacyPolicyText")
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          showManageButton && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleManageClick,
              className: manageButtonClasses,
              children: tFunction("manageButtonText")
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleDeclineClick,
              className: declineButtonClasses,
              children: tFunction("declineButtonText")
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleAcceptClick,
              className: acceptButtonClasses,
              children: tFunction("buttonText")
            }
          )
        ] })
      ] }) });
    }
    return null;
  };
  const content = /* @__PURE__ */ jsx("div", { className: "cookie-manager", children: /* @__PURE__ */ jsx("div", { className: getBaseClasses(), children: displayType === "modal" ? /* @__PURE__ */ jsxs("div", { className: getContentClasses(), children: [
    renderContent(),
    renderButtons()
  ] }) : /* @__PURE__ */ jsxs("div", { className: getContentClasses(), children: [
    renderContent(),
    renderButtons()
  ] }) }) });
  return createPortal(content, document.body);
};
const FloatingCookieButton = ({
  theme = "light",
  onClick,
  onClose,
  classNames
}) => {
  const [isHovered, setIsHovered] = useState(false);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      onClick,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      className: (classNames == null ? void 0 : classNames.floatingButton) ? cn(classNames.floatingButton) : cn(`
              fixed bottom-6 left-6 z-[99999]
              w-12 h-12 rounded-full
              flex items-center justify-center
              transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
              hover:scale-110 focus:outline-none
              group cursor-pointer
              ${theme === "light" ? "bg-white/95 shadow-lg ring-1 ring-black/10 text-gray-700 hover:text-gray-900" : "bg-black/95 shadow-lg ring-1 ring-white/10 text-gray-300 hover:text-white"}
            `),
      style: {
        animation: "slide-in-bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards"
      },
      "aria-label": "Manage cookie preferences",
      role: "button",
      tabIndex: 0,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      },
      children: [
        isHovered && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              onClose == null ? void 0 : onClose();
            },
            className: (classNames == null ? void 0 : classNames.floatingButtonCloseButton) ? cn(classNames.floatingButtonCloseButton) : cn(`
                  fixed -top-2 -right-2
                  w-6 h-6 rounded-full
                  flex items-center justify-center
                  transition-all duration-300
                  hover:scale-110
                  ${theme === "light" ? "bg-gray-200 text-gray-600 hover:bg-gray-300" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}
                `),
            "aria-label": "Close cookie button",
            children: /* @__PURE__ */ jsxs(
              "svg",
              {
                width: "12",
                height: "12",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                children: [
                  /* @__PURE__ */ jsx("path", { d: "M18 6L6 18" }),
                  /* @__PURE__ */ jsx("path", { d: "M6 6L18 18" })
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsx("style", { children: `
          @keyframes slide-in-bottom {
            0% {
              transform: translateY(100%);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
        ` }),
        /* @__PURE__ */ jsxs(
          "svg",
          {
            width: "24",
            height: "24",
            viewBox: "0 0 100 100",
            fill: "currentColor",
            className: "transform rotate-0 hover:rotate-12 transition-transform duration-300",
            children: [
              /* @__PURE__ */ jsx("circle", { cx: "45.6", cy: "24.1", r: "4" }),
              /* @__PURE__ */ jsx("circle", { cx: "52.3", cy: "49.9", r: "4" }),
              /* @__PURE__ */ jsx("circle", { cx: "27.4", cy: "59.1", r: "4" }),
              /* @__PURE__ */ jsx("circle", { cx: "27.4", cy: "37.3", r: "4" }),
              /* @__PURE__ */ jsx("circle", { cx: "40.6", cy: "76.6", r: "4" }),
              /* @__PURE__ */ jsx("circle", { cx: "69.5", cy: "71.6", r: "4" }),
              /* @__PURE__ */ jsx(
                "path",
                {
                  d: "\n            M48.9 95.5c-24 0-44-18.7-45.5-42.7C2.6 39.7 7.6 26.8 17 17.5c9.5-9.3 22.5-14 35.6-13\n            c4.3 0.4 8.6 1.3 12.6 2.9c0.7 0.3 1.2 0.9 1.3 1.6c0.1 0.7-0.2 1.4-0.7 1.9c-1.4 1.2-2.2 2.9-2.2 4.7\n            c0 1.8 0.8 3.6 2.2 4.7c0.4 0.3 0.7 0.9 0.7 1.4c0 0.5-0.1 1.1-0.5 1.5c-1 1.1-1.6 2.6-1.6 4.1\n            c0 1.9 0.9 3.7 2.5 4.9c0.5 0.4 0.8 1 0.8 1.6c0 0.6-0.3 1.2-0.8 1.6c-1.6 1.2-2.5 3-2.5 4.9\n            c0 3.4 2.7 6.1 6.1 6.1l0.2 0c0.9 0 1.7 0.6 2 1.4c0.8 2.6 3.2 4.4 5.8 4.4c1.6 0 3.1-0.6 4.3-1.8\n            c0.5-0.5 1.3-0.7 2-0.5c0.7 0.2 1.2 0.7 1.4 1.4c0.7 2.5 2.9 4.3 5.5 4.5c0.6 0 1.1 0.3 1.5 0.8\n            c0.3 0.4 0.5 1 0.4 1.6C89.8 79.8 70.9 95.5 48.9 95.5z\n            M49 8.3c-10.8 0-21.3 4.3-29.1 12C11.2 28.8 6.6 40.6 7.4 52.6C8.8 74.4 27 91.5 48.9 91.5\n            c19.4 0 36.2-13.4 40.5-32.1c-2.4-0.7-4.5-2.3-5.8-4.5c-1.5 0.8-3.1 1.2-4.9 1.2c-4 0-7.5-2.4-9.2-5.9\n            c-5.1-0.5-9-4.8-9-10c0-2.4 0.8-4.7 2.4-6.5c-1.5-1.8-2.4-4.1-2.4-6.5c0-1.8 0.5-3.6 1.5-5.2\n            c-1.5-1.8-2.4-4.1-2.4-6.5c0-1.9 0.5-3.8 1.5-5.3c-2.9-0.9-5.8-1.5-8.8-1.7C51.2 8.4 50.1 8.3 49 8.3z\n          "
                }
              ),
              /* @__PURE__ */ jsxs("g", { opacity: "0.3", children: [
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M35 30 Q 40 35 45 30",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "0.8"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M50 60 Q 55 65 60 60",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "0.8"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M30 50 Q 35 55 40 50",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "0.8"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: "M45 70 Q 50 75 55 70",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "0.8"
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
};
const trackers = {
  categories: {
    Analytics: [
      "63squares.com",
      "abtasty.com",
      "3dstats.com",
      "addfreestats.com",
      "adobedc.net",
      "livefyre.com",
      "mktoresp.com",
      "sitestat.com",
      "bluecava.com",
      "advombat.ru",
      "aidata.me",
      "abmr.net",
      "akstat.io",
      "go-mpulse.net",
      "pxlclnmdecom-a.akamaihd.net",
      "websitealive.com",
      "websitealive0.com",
      "websitealive1.com",
      "websitealive2.com",
      "websitealive3.com",
      "websitealive4.com",
      "websitealive5.com",
      "websitealive6.com",
      "websitealive7.com",
      "websitealive8.com",
      "websitealive9.com",
      "amazingcounters.com",
      "alexa.com",
      "alexametrics.com",
      "ttvnw.net",
      "amocrm.ru",
      "amplitude.com",
      "anormal-media.de",
      "anormal-tracker.de",
      "atoomic.com",
      "attracta.com",
      "audioeye.com",
      "aamapiv2.com",
      "clicktracks.com",
      "lyris.com",
      "intensedebate.com",
      "polldaddy.com",
      "w3roi.com",
      "b3mxnuvcer.com",
      "baidu.com",
      "bdstatic.com",
      "tns-cs.net",
      "tnsglobal.com",
      "curalate.com",
      "belstat.be",
      "belstat.com",
      "belstat.de",
      "belstat.fr",
      "belstat.nl",
      "betssonpalantir.com",
      "bitrix.info",
      "blogcounter.de",
      "blueconic.net",
      "bluemetrix.com",
      "bmmetrix.com",
      "btttag.com",
      "compuware.com",
      "ml314.com",
      "branica.com",
      "bubblestat.com",
      "bufferapp.com",
      "bunchball.com",
      "buysafe.com",
      "cbox.ws",
      "cbsinteractive.com",
      "com.com",
      "cedexis.com",
      "cedexis.net",
      "chartbeat.com",
      "chartbeat.net",
      "smartlook.com",
      "clickdensity.com",
      "clixmetrix.com",
      "clixpy.com",
      "cloudflareinsights.com",
      "clustrmaps.com",
      "cnzz.com",
      "collarity.com",
      "collective.com",
      "certifica.com",
      "comscore.com",
      "mdotlabs.com",
      "scorecardresearch.com",
      "voicefive.com",
      "conduit-banners.com",
      "conduit-services.com",
      "conduit.com",
      "wibiya.com",
      "clicktale.com",
      "clicktale.net",
      "contentsquare.net",
      "pantherssl.com",
      "convertexperiments.com",
      "convert.com",
      "reedge.com",
      "conviva.com",
      "cetrk.com",
      "crazyegg.com",
      "crowdscience.com",
      "betrad.com",
      "cuebiq.com",
      "browser-intake-datadoghq.com",
      "datadoghq-browser-agent.com",
      "datadoghq.com",
      "datadoghq.eu",
      "collserve.com",
      "dataium.com",
      "leadfeeder.com",
      "company-target.com",
      "demandbase.com",
      "lightboxcdn.com",
      "ipcounter.de",
      "distiltag.com",
      "trackedweb.net",
      "doubleverify.com",
      "drift.com",
      "driftt.com",
      "dtscdn.com",
      "dwstat.cn",
      "researchnow.com",
      "valuedopinions.co.uk",
      "axf8.net",
      "dynatrace.com",
      "gomez.com",
      "webclicktracker.com",
      "clickability.com",
      "limelight.com",
      "llnwd.net",
      "do-not-tracker.org",
      "eviltracker.net",
      "trackersimulator.org",
      "eproof.com",
      "etracker.com",
      "etracker.de",
      "sedotracker.com",
      "sedotracker.de",
      "eulerian.com",
      "eulerian.net",
      "extreme-dm.com",
      "extremetracking.com",
      "eyeota.net",
      "feedjit.com",
      "fpnpmcdn.net",
      "openfpcdn.io",
      "flattr.com",
      "footprintlive.com",
      "yabidos.com",
      "freeonlineusers.com",
      "free-pagerank.com",
      "antifraudjs.friends2follow.com",
      "fullstory.com",
      "sentry-cdn.com",
      "sentry.io",
      "fndrsp.net",
      "audienceinsights.net",
      "geetest.com",
      "boldchat.com",
      "getsatisfaction.com",
      "getsitecontrol.com",
      "daphnecm.com",
      "gfk.com",
      "gfkdaphne.com",
      "sessioncam.com",
      "trafficfacts.com",
      "analytics.google.com",
      "crashlytics.com",
      "google-analytics.com",
      "googleoptimize.com",
      "merchant-center-analytics.goog",
      "postrank.com",
      "gorgias.chat",
      "gosquared.com",
      "gostats.com",
      "graphenedigitalanalytics.in",
      "gtop.ro",
      "gtopstats.com",
      "haloscan.com",
      "heapanalytics.com",
      "raasnet.com",
      "helpscout.net",
      "histats.com",
      "hitslink.com",
      "hitsniffer.com",
      "hotjar.com",
      "hotjar.io",
      "hs-analytics.net",
      "hsforms.net",
      "hubspot.com",
      "usemessages.com",
      "adxyield.com",
      "adzmath.com",
      "clean.gg",
      "whiteops.com",
      "cmcore.com",
      "coremetrics.com",
      "ibm.com",
      "ipinfo.io",
      "infernotions.com",
      "infonline.de",
      "ioam.de",
      "iocnt.net",
      "ivwbox.de",
      "hotlog.ru",
      "infostars.ru",
      "inrix.com",
      "inspectlet.com",
      "domodomain.com",
      "onthe.io",
      "ipify.org",
      "ipqualityscore.com",
      "ipregistry.co",
      "islay.tech",
      "itisatracker.com",
      "jivosite.com",
      "js-kit.com",
      "judge.me",
      "jwpltx.com",
      "longtailvideo.com",
      "ltassrv.com",
      "keymetric.net",
      "linezing.com",
      "contactatonce.com",
      "liveperson.com",
      "liveperson.net",
      "lpsnmedia.net",
      "nuconomy.com",
      "logdy.com",
      "luckyorange.com",
      "luckyorange.net",
      "lynchpin.com",
      "lypn.com",
      "webtrekk.com",
      "webtrekk.net",
      "wsod.com",
      "9c9media.ca",
      "markmonitor.com",
      "marktest.com",
      "marktest.pt",
      "piwik.org",
      "geoip-js.com",
      "maxmind.com",
      "mmapiws.com",
      "scanalert.com",
      "kampyle.com",
      "medallia.com",
      "estat.com",
      "y-track.com",
      "sesamestats.com",
      "tns-counter.ru",
      "datasift.com",
      "tweetmeme.com",
      "merkleinc.com",
      "clarity.ms",
      "footprintdns.com",
      "gaug.es",
      "inq.com",
      "live.net",
      "microsoftstore.com",
      "officelive.com",
      "touchcommerce.com",
      "visualstudio.com",
      "mixpanel.com",
      "mxpnl.com",
      "mongoosemetrics.com",
      "monitus.net",
      "monsido.com",
      "mouseflow.com",
      "mparticle.com",
      "mycounter.com.ua",
      "myfonts.net",
      "mypagerank.net",
      "narrative.io",
      "newsinc.com",
      "ubermedia.com",
      "nedstatbasic.net",
      "hitsprocessor.com",
      "netapplications.com",
      "newrelic.com",
      "nr-data.net",
      "apnewsregistry.com",
      "glanceguide.com",
      "nielsen.com",
      "nocodelytics.com",
      "nofraud.com",
      "noibu.com",
      "notolytix.com",
      "kissmetrics.com",
      "nurago.com",
      "nurago.de",
      "sensic.net",
      "observerapp.com",
      "behavioralengine.com",
      "ooyala.com",
      "openstat.ru",
      "spylog.com",
      "opentracker.net",
      "atgsvcs.com",
      "eloqua.com",
      "instantservice.com",
      "oewa.at",
      "p7cloud.net",
      "parsely.com",
      "peerius.com",
      "pendo.io",
      "persianstat.com",
      "phonalytics.com",
      "phpmyvisites.us",
      "at-o.net",
      "aticdn.net",
      "atinternet.com",
      "piano.io",
      "tinypass.com",
      "xiti.com",
      "pixanalytics.com",
      "turnto.com",
      "opolen.com.br",
      "v12data.com",
      "v12group.com",
      "blaze.com",
      "kissinsights.com",
      "qualaroo.com",
      "qualtrics.com",
      "quantummetric.com",
      "thecounter.com",
      "quintelligence.com",
      "gogrid.com",
      "radarurl.com",
      "perfdrive.com",
      "slickstream.com",
      "thirdwatch.ai",
      "ringier.cz",
      "riskified.com",
      "rollick.io",
      "getclicky.com",
      "roxr.net",
      "staticstuff.net",
      "sageanalyst.net",
      "cquotient.com",
      "evgnet.com",
      "igodigital.com",
      "salesforce.com",
      "salesforceliveagent.com",
      "sardine.ai",
      "seevolution.com",
      "svlu.net",
      "shinystat.com",
      "sift.com",
      "simpleanalyticscdn.com",
      "simply.com",
      "siteimproveanalytics.com",
      "siteimproveanalytics.io",
      "bugsnag.com",
      "snoobi.com",
      "snplow.net",
      "pingdom.net",
      "solarwinds.com",
      "speedcurve.com",
      "pdst.fm",
      "sputnik.ru",
      "stat-track.com",
      "4u.pl",
      "statcounter.com",
      "statisfy.net",
      "statsit.com",
      "usabilla.com",
      "storeland.ru",
      "stratigent.com",
      "swymrelay.com",
      "synacor.com",
      "tealiumiq.com",
      "techsolutions.com.tw",
      "tensquare.com",
      "heronpartners.com.au",
      "tracemyip.org",
      "tracify.ai",
      "roia.biz",
      "trackingsoft.com",
      "trackset.com",
      "transcend.io",
      "iesnare.com",
      "iovation.com",
      "trustarc.com",
      "truste.com",
      "segment.io",
      "umbel.com",
      "friendshipmale.com",
      "unseenreport.com",
      "formalyzer.com",
      "onestat.com",
      "uptrends.com",
      "usabilitysciences.com",
      "webiqonline.com",
      "usbrowserspeed.com",
      "nakanohito.jp",
      "verticalacuity.com",
      "vertster.com",
      "visitstreamer.com",
      "vizisense.net",
      "punchtab.com",
      "webgozar.com",
      "webgozar.ir",
      "onlinewebstats.com",
      "web-stat.com",
      "webtrackingservices.com",
      "reinvigorate.net",
      "webtrends.com",
      "webtrendslive.com",
      "amung.us",
      "visualwebsiteoptimizer.com",
      "wingify.com",
      "woopra-ns.com",
      "woopra.com",
      "compete.com",
      "dl-rms.com",
      "dlqm.net",
      "questionmarket.com",
      "safecount.net",
      "statistik-gallup.net",
      "wysistat.com",
      "xfyun.cn",
      "adap.tv",
      "analytics.yahoo.com",
      "aol.com",
      "autoblog.com",
      "convertro.com",
      "homesessive.com",
      "mandatory.com",
      "shoutcast.com",
      "yahoofs.com",
      "informer.yandex.ru",
      "yandex.ua",
      "yellowtracker.com",
      "yoox.it",
      "zdassets.com",
      "zendesk.com",
      "zopim.com",
      "zoominfo.com"
    ],
    Social: [
      "causes.com",
      "digg.com",
      "developers.google.com",
      "gmail.com",
      "googlemail.com",
      "plus.google.com",
      "plusone.google.com",
      "smartlock.google.com",
      "voice.google.com",
      "lockerz.com",
      "atdmt.com",
      "facebook.com",
      "facebook.de",
      "facebook.fr",
      "facebook.net",
      "fb.com",
      "fbsbx.com",
      "friendfeed.com",
      "licdn.com",
      "linkedin.com",
      "addthis.com",
      "addthiscdn.com",
      "addthisedge.com",
      "clearspring.com",
      "reddit.com",
      "shareaholic.com",
      "sharethis.com",
      "snapchat.com",
      "stumble-upon.com",
      "stumbleupon.com",
      "tiktok.com",
      "twimg.com",
      "twitter.com",
      "twitter.jp",
      "x.com",
      "list.ru",
      "mail.ru",
      "userapi.com",
      "vk.com",
      "vkontakte.ru",
      "avatars.yahoo.com",
      "buzz.yahoo.com",
      "calendar.yahoo.com",
      "edit.yahoo.com",
      "login.yahoo.com",
      "mail.yahoo.com",
      "my.yahoo.com",
      "mybloglog.com",
      "pulse.yahoo.com",
      "rocketmail.com",
      "webmessenger.yahoo.com",
      "ymail.com"
    ],
    ConsentManagers: [
      "cookielaw.org",
      "onetrust.com",
      "onetrust.io",
      "osano.com",
      "privacy-mgmt.com",
      "summerhamster.com",
      "cookiebot.com",
      "cookiebot.eu"
    ],
    Email: [
      "10web.io",
      "4dem.it",
      "8d8.biz",
      "open.mkt10008.com",
      "open.mkt10039.com",
      "open.mkt10049.com",
      "open.mkt10067.com",
      "open.mkt10114.com",
      "open.mkt10153.com",
      "open.mkt10663.com",
      "open.mkt10781.com",
      "open.mkt1248.com",
      "open.mkt1365.com",
      "open.mkt1937.com",
      "open.mkt1946.com",
      "open.mkt2178.com",
      "open.mkt2478.com",
      "open.mkt2685.com",
      "open.mkt2724.com",
      "open.mkt32.net",
      "open.mkt3469.com",
      "open.mkt3536.com",
      "open.mkt3797.com",
      "open.mkt3798.com",
      "open.mkt3838.com",
      "open.mkt4091.com",
      "open.mkt41.net",
      "open.mkt4158.com",
      "open.mkt4261.com",
      "open.mkt4424.com",
      "open.mkt4463.com",
      "open.mkt4477.com",
      "open.mkt4644.com",
      "open.mkt5089.com",
      "open.mkt51.net",
      "open.mkt5216.com",
      "open.mkt5224.com",
      "open.mkt5297.com",
      "open.mkt5379.com",
      "open.mkt5419.com",
      "open.mkt5514.com",
      "open.mkt5566.com",
      "open.mkt5654.com",
      "open.mkt5657.com",
      "open.mkt5906.com",
      "open.mkt6031.com",
      "open.mkt61.net",
      "open.mkt6260.com",
      "open.mkt6264.com",
      "open.mkt6288.com",
      "open.mkt6316.com",
      "open.mkt6478.com",
      "open.mkt6688.com",
      "open.mkt6735.com",
      "open.mkt6793.com",
      "open.mkt685.com",
      "open.mkt6882.com",
      "open.mkt6903.com",
      "open.mkt6917.com",
      "open.mkt6967.com",
      "open.mkt71.net",
      "open.mkt7234.com",
      "open.mkt7580.com",
      "open.mkt7596.com",
      "open.mkt7752.com",
      "open.mkt7783.com",
      "open.mkt7832.com",
      "open.mkt7842.com",
      "open.mkt7883.com",
      "open.mkt7946.com",
      "open.mkt7971.com",
      "open.mkt7972.com",
      "open.mkt7974.com",
      "open.mkt8007.com",
      "open.mkt8008.com",
      "open.mkt8043.com",
      "open.mkt8062.com",
      "open.mkt8063.com",
      "open.mkt8064.com",
      "open.mkt8096.com",
      "open.mkt81.net",
      "open.mkt8133.com",
      "open.mkt8163.com",
      "open.mkt8267.com",
      "open.mkt829.com",
      "open.mkt8345.com",
      "open.mkt8369.com",
      "open.mkt8586.com",
      "open.mkt8628.com",
      "open.mkt8756.com",
      "open.mkt8763.com",
      "open.mkt8988.com",
      "open.mkt9026.com",
      "open.mkt9054.com",
      "open.mkt912.com",
      "open.mkt9203.com",
      "open.mkt922.com",
      "open.mkt941.com",
      "open.mkt9430.com",
      "open.mkt9775.com",
      "open.mkt9862.com",
      "open.mkt9923.com",
      "open.mkt9942.com",
      "basiscommunicatie.nl",
      "acblnk.com",
      "acmbtrc.com",
      "acmtrk.com",
      "clickacumba.com",
      "emlmkt.com",
      "mailmktool.com",
      "trckacbm.com",
      "adform.net",
      "2o7.net",
      "demdex.net",
      "omtrdc.net",
      "adspeed.net",
      "adsugar.ch",
      "aforesponse.com",
      "agilemeasure.com",
      "authoremail.com",
      "apms5.com",
      "autopilotmail.io",
      "bandzoogle.com",
      "barilliance.com",
      "sitescout.com",
      "bemail.it",
      "bentonow.com",
      "cdn.uk.exponea.com",
      "sptracking.getblueshift.com",
      "cp20.com",
      "cpro20.com",
      "cpro30.com",
      "skem1.com",
      "api.carrotquest.io",
      "cdnwidget.com",
      "cl1-api.connectif.cloud",
      "eu2-api.connectif.cloud",
      "eu3-api.connectif.cloud",
      "eu4-api.connectif.cloud",
      "convertkit-mail.com",
      "convertkit-mail2.com",
      "convertkit-mail3.com",
      "convertkit-mail4.com",
      "convertkit-mail5.com",
      "convertkit-mail6.com",
      "e.customeriomail.com",
      "mailer.lassocrm.com",
      "edrone.me",
      "emaillabs.co",
      "engagingnetworks.app",
      "ot.gliq.com",
      "track.gliq.com",
      "doubleclick.net",
      "google-analytics.com",
      "gasv1.com",
      "infernotions.com",
      "email-messaging.com",
      "ixactcontact.com",
      "track-mb.bra2hmail.com",
      "liadm.com",
      "pippio.com",
      "m3651.net",
      "m3652.net",
      "mailblue.eu",
      "eds5.mailcamp.nl",
      "agentofficemail.com",
      "mailcamp.net.pl",
      "mailtracker.pl",
      "senderit.pl",
      "xylionmail.pl",
      "mathtag.com",
      "api-01.moengage.com",
      "adroll.com",
      "myvisualiq.net",
      "nyl.as",
      "openeducat.org",
      "pvd.to",
      "leadersend.com",
      "pstmrk.it",
      "pushnami.com",
      "opens.responder.co.il",
      "system.send24.pl",
      "tracking.retailrocket.net",
      "sailplay.ru",
      "krxd.net",
      "pixel.inbox.exacttarget.com",
      "ondemand.com",
      "sendcloud.net",
      "sendfox.com",
      "sendiio.app",
      "sendpul.se",
      "smlists.com",
      "smartsendy.com",
      "smtp2go.com",
      "smtp2go.net",
      "servedbyadbutler.com",
      "strikestack.com",
      "hodes.com",
      "tealiumiq.com",
      "adventure-novels.com",
      "agkn.com",
      "thebrighttag.com",
      "segment.io",
      "returnpath.net",
      "vinc.fr",
      "viralhosts.com",
      "trac.visme.co",
      "stable.cz",
      "campaign-tracking.woowup.com",
      "e.wordfly.com",
      "xpressmail.hu",
      "xtremepush.com",
      "em.yotpo.com",
      "p.yotpo.com",
      "1-2-1marketing.com",
      "accelo.com",
      "mkt10008.com",
      "mkt10039.com",
      "mkt10049.com",
      "mkt10067.com",
      "mkt10114.com",
      "mkt10153.com",
      "mkt10663.com",
      "mkt10781.com",
      "mkt1248.com",
      "mkt1365.com",
      "mkt1937.com",
      "mkt1946.com",
      "mkt2178.com",
      "mkt2478.com",
      "mkt2685.com",
      "mkt2724.com",
      "mkt32.net",
      "mkt3469.com",
      "mkt3536.com",
      "mkt3797.com",
      "mkt3798.com",
      "mkt3838.com",
      "mkt4091.com",
      "mkt41.net",
      "mkt4158.com",
      "mkt4261.com",
      "mkt4424.com",
      "mkt4463.com",
      "mkt4477.com",
      "mkt4644.com",
      "mkt5089.com",
      "mkt51.net",
      "mkt5216.com",
      "mkt5224.com",
      "mkt5297.com",
      "mkt5379.com",
      "mkt5419.com",
      "mkt5514.com",
      "mkt5566.com",
      "mkt5654.com",
      "mkt5657.com",
      "mkt5906.com",
      "mkt6031.com",
      "mkt61.net",
      "mkt6260.com",
      "mkt6264.com",
      "mkt6288.com",
      "mkt6316.com",
      "mkt6478.com",
      "mkt6688.com",
      "mkt6735.com",
      "mkt6793.com",
      "mkt685.com",
      "mkt6882.com",
      "mkt6903.com",
      "mkt6917.com",
      "mkt6967.com",
      "mkt71.net",
      "mkt7234.com",
      "mkt7580.com",
      "mkt7596.com",
      "mkt7752.com",
      "mkt7783.com",
      "mkt7832.com",
      "mkt7842.com",
      "mkt7883.com",
      "mkt7946.com",
      "mkt7971.com",
      "mkt7972.com",
      "mkt7974.com",
      "mkt8007.com",
      "mkt8008.com",
      "mkt8043.com",
      "mkt8062.com",
      "mkt8063.com",
      "mkt8064.com",
      "mkt8096.com",
      "mkt81.net",
      "mkt8133.com",
      "mkt8163.com",
      "mkt8267.com",
      "mkt829.com",
      "mkt8345.com",
      "mkt8369.com",
      "mkt8586.com",
      "mkt8628.com",
      "mkt8756.com",
      "mkt8763.com",
      "mkt8988.com",
      "mkt9026.com",
      "mkt9054.com",
      "mkt912.com",
      "mkt9203.com",
      "mkt922.com",
      "mkt941.com",
      "mkt9430.com",
      "mkt9775.com",
      "mkt9862.com",
      "mkt9923.com",
      "mkt9942.com",
      "acemlna.com",
      "acemlnb.com",
      "acemlnc.com",
      "acemlnd.com",
      "activehosted.com",
      "emlnk1.com",
      "acsmedia.us",
      "activedemand.com",
      "adobe.com",
      "affinity.co",
      "agilecrm.com",
      "aisleahead.com",
      "awstrack.me",
      "atomicpark.email",
      "autoklose.com",
      "bitrix24.com",
      "exponea.com",
      "getblueshift.com",
      "mailstat.us",
      "buttondown.email",
      "campaignmonitor.com",
      "cmail1.com",
      "cmail10.com",
      "cmail11.com",
      "cmail12.com",
      "cmail13.com",
      "cmail14.com",
      "cmail15.com",
      "cmail16.com",
      "cmail17.com",
      "cmail18.com",
      "cmail19.com",
      "cmail2.com",
      "cmail20.com",
      "cmail21.com",
      "cmail22.com",
      "cmail23.com",
      "cmail24.com",
      "cmail25.com",
      "cmail26.com",
      "cmail27.com",
      "cmail28.com",
      "cmail29.com",
      "cmail3.com",
      "cmail30.com",
      "cmail4.com",
      "cmail5.com",
      "cmail6.com",
      "cmail7.com",
      "cmail8.com",
      "cmail9.com",
      "confirmsubscription.com",
      "createsend1.com",
      "createsend10.com",
      "createsend11.com",
      "createsend12.com",
      "createsend13.com",
      "createsend14.com",
      "createsend15.com",
      "createsend16.com",
      "createsend17.com",
      "createsend18.com",
      "createsend19.com",
      "createsend2.com",
      "createsend20.com",
      "createsend21.com",
      "createsend22.com",
      "createsend23.com",
      "createsend24.com",
      "createsend25.com",
      "createsend26.com",
      "createsend27.com",
      "createsend28.com",
      "createsend29.com",
      "createsend3.com",
      "createsend30.com",
      "createsend4.com",
      "createsend5.com",
      "createsend6.com",
      "createsend7.com",
      "createsend8.com",
      "createsend9.com",
      "forwardtomyfriend.com",
      "carrotquest.io",
      "cirrusinsight.com",
      "close.io",
      "connectif.cloud",
      "constantcontact.com",
      "rs6.net",
      "contactmonkey.com",
      "copper.com",
      "customer.io",
      "customeriomail.com",
      "e-mail-servers.com",
      "lassocrm.com",
      "email-signature-image.com",
      "my-email-signature.link",
      "engagebay.com",
      "ezymarketer.net",
      "emailinc.net",
      "followup.cc",
      "frontapp.com",
      "email81.com",
      "gliq.com",
      "hsms06.com",
      "hubspotemail.net",
      "hunter.io",
      "mltrk.io",
      "intercom.io",
      "infusionsoft.com",
      "leadboxer.com",
      "bra2hmail.com",
      "emltrk.com",
      "mailbutler.io",
      "mailcamp.nl",
      "answerbook.com",
      "list-manage.com",
      "list-manage1.com",
      "mandrillapp.com",
      "tinyletter.com",
      "mailerlite.com",
      "mailtag.io",
      "mailtrack.io",
      "mixmax.com",
      "mixpanel.com",
      "moengage.com",
      "nhlnka.com",
      "outrch.com",
      "outreach.io",
      "persistiq.com",
      "polymail.io",
      "propelleremail.co.uk",
      "lahar.com.br",
      "responder.co.il",
      "send24.pl",
      "reply.io",
      "retailrocket.net",
      "revenuegrid.com",
      "rightinbox.com",
      "sailthru.com",
      "exacttarget.com",
      "exct.net",
      "pardot.com",
      "salesforceiq.com",
      "shetrk.com",
      "salesloft.com",
      "salesloftlinks.com",
      "mailfoogae.appspot.com",
      "substack.com",
      "superhuman.com",
      "tradiewebguys.com.au",
      "sendgrid.net",
      "user.com",
      "visme.co",
      "vocus.io",
      "woowup.com",
      "wordfly.com",
      "bounceexchange.com",
      "yesware.com",
      "yotpo.com",
      "zendable.com",
      "icptrack.com",
      "maillist-manage.com",
      "maillist-manage.com.au",
      "maillist-manage.eu",
      "maillist-manage.in"
    ],
    Advertising: [
      "24log.com",
      "2leep.com",
      "33across.com",
      "tynt.com",
      "360.cn",
      "51yes.com",
      "6sc.co",
      "6sense.com",
      "a-ads.com",
      "abaxinteractive.com",
      "accelia.net",
      "durasite.net",
      "adaptly.com",
      "acsbapp.com",
      "mkt51.net",
      "pages05.net",
      "silverpop.com",
      "vtrenz.net",
      "acquisio.com",
      "actisens.com",
      "gestionpub.com",
      "app-us1.com",
      "trackcmp.net",
      "activeconversion.com",
      "activemeter.com",
      "activengage.com",
      "act-on.com",
      "actonsoftware.com",
      "acuity.com",
      "acuityads.com",
      "acuityplatform.com",
      "acxiom.com",
      "acxiomapac.com",
      "ad2onegroup.com",
      "ad4game.com",
      "ad6media.fr",
      "adacado.com",
      "4dex.io",
      "adality.de",
      "adrtx.net",
      "ad-alliance.de",
      "adalliance.io",
      "technical-service.net",
      "adaptiveads.com",
      "a-mo.net",
      "a-mx.com",
      "rtb.mx",
      "adaramedia.com",
      "yieldoptimizer.com",
      "adbot.tw",
      "adcash.com",
      "ufpcdn.com",
      "a2dfp.net",
      "addecisive.com",
      "ad-delivery.net",
      "addtoany.com",
      "addvantagemedia.com",
      "addynamo.com",
      "addynamo.net",
      "adelement.com",
      "adengage.com",
      "adextent.com",
      "adfonic.com",
      "adform.com",
      "adform.net",
      "adformdsp.net",
      "seadform.net",
      "adfrontiers.com",
      "shorttailmedia.com",
      "adglare.com",
      "adglare.net",
      "adhood.com",
      "adblade.com",
      "adiant.com",
      "adimpact.com",
      "adjug.com",
      "adjuggler.com",
      "adjuggler.net",
      "adjust.com",
      "adkernel.com",
      "adknife.com",
      "adknowledge.com",
      "bidsystem.com",
      "adleave.com",
      "adloox.com",
      "adlooxtracking.com",
      "adlucent.com",
      "admagnet.com",
      "admagnet.net",
      "adman.gr",
      "admanmedia.com",
      "admarketplace.com",
      "admarketplace.net",
      "ampxchange.com",
      "admatrix.jp",
      "ad-maven.com",
      "wrethicap.info",
      "admaximizer.com",
      "admedia.com",
      "admedo.com",
      "admeta.com",
      "atemda.com",
      "2znp09oa.com",
      "4jnzhl0d0.com",
      "5mcwl.pw",
      "6ldu6qa.com",
      "82o9v830.com",
      "abilityscale.com",
      "aboardamusement.com",
      "aboardlevel.com",
      "abovechat.com",
      "abruptroad.com",
      "absentairport.com",
      "absorbingband.com",
      "absorbingprison.com",
      "abstractedamount.com",
      "abstractedauthority.com",
      "absurdapple.com",
      "abundantcoin.com",
      "accurateanimal.com",
      "accuratecoal.com",
      "achieverknee.com",
      "acidicstraw.com",
      "acridangle.com",
      "acridtwist.com",
      "actuallysheep.com",
      "actuallysnake.com",
      "actuallything.com",
      "adamantsnail.com",
      "addictedattention.com",
      "admiral.pub",
      "adorableanger.com",
      "adorableattention.com",
      "adventurousamount.com",
      "afraidlanguage.com",
      "agilebreeze.com",
      "agreeablearch.com",
      "agreeabletouch.com",
      "aheadday.com",
      "aheadmachine.com",
      "ak0gsh40.com",
      "aliasanvil.com",
      "aliveachiever.com",
      "alleythecat.com",
      "alluringbucket.com",
      "aloofmetal.com",
      "aloofvest.com",
      "alpineactor.com",
      "ambientdusk.com",
      "ambientlagoon.com",
      "ambiguousafternoon.com",
      "ambiguousanger.com",
      "ambiguousdinosaurs.com",
      "ambiguousincome.com",
      "ambrosialsummit.com",
      "amethystzenith.com",
      "amuckafternoon.com",
      "amusedbucket.com",
      "analogwonder.com",
      "analyzecorona.com",
      "ancientact.com",
      "annoyingacoustics.com",
      "annoyingclover.com",
      "anxiousapples.com",
      "aquaticowl.com",
      "ar1nvz5.com",
      "archswimming.com",
      "aromamirror.com",
      "arrivegrowth.com",
      "artthevoid.com",
      "aspiringapples.com",
      "aspiringattempt.com",
      "aspiringtoy.com",
      "astonishingfood.com",
      "astrallullaby.com",
      "attendchase.com",
      "attractionbanana.com",
      "attractivecap.com",
      "audioarctic.com",
      "automaticside.com",
      "automaticturkey.com",
      "availablerest.com",
      "avalonalbum.com",
      "averageactivity.com",
      "awarealley.com",
      "awzbijw.com",
      "axiomaticalley.com",
      "axiomaticanger.com",
      "azuremystique.com",
      "badgeboat.com",
      "badgerabbit.com",
      "bagbeam.com",
      "baitbaseball.com",
      "balloonbelieve.com",
      "ballsbanana.com",
      "bananabarrel.com",
      "bandborder.com",
      "barbarousbase.com",
      "basilfish.com",
      "basketballbelieve.com",
      "baskettexture.com",
      "bawdybalance.com",
      "bawdybeast.com",
      "beamvolcano.com",
      "beancontrol.com",
      "bedsberry.com",
      "beginnerpancake.com",
      "berserkhydrant.com",
      "bespokesandals.com",
      "bestboundary.com",
      "bewilderedbattle.com",
      "bewilderedblade.com",
      "bhcumsc.com",
      "bikepaws.com",
      "bikesboard.com",
      "billowybead.com",
      "billowybelief.com",
      "binspiredtees.com",
      "birthdaybelief.com",
      "blackbrake.com",
      "bleachbubble.com",
      "bleachscarecrow.com",
      "bleedlight.com",
      "blesspizzas.com",
      "blissfulcrescendo.com",
      "blissfullagoon.com",
      "blueeyedblow.com",
      "blushingbeast.com",
      "blushingbread.com",
      "boatsvest.com",
      "boilingbeetle.com",
      "boostbehavior.com",
      "boredcrown.com",
      "bouncyproperty.com",
      "boundarybusiness.com",
      "boundlessargument.com",
      "boundlessbrake.com",
      "boundlessveil.com",
      "brainybasin.com",
      "brainynut.com",
      "branchborder.com",
      "brandsfive.com",
      "brandybison.com",
      "bravebone.com",
      "breadbalance.com",
      "breakableinsurance.com",
      "breakfastboat.com",
      "breezygrove.com",
      "brianwould.com",
      "brighttoe.com",
      "briskstorm.com",
      "broadborder.com",
      "broadboundary.com",
      "broadcastbed.com",
      "broaddoor.com",
      "brotherslocket.com",
      "bruisebaseball.com",
      "brunchforher.com",
      "buildingknife.com",
      "bulbbait.com",
      "burgersalt.com",
      "burlywhistle.com",
      "burnbubble.com",
      "bushesbag.com",
      "bustlingbook.com",
      "butterbulb.com",
      "butterburst.com",
      "cakesdrum.com",
      "calculatingcircle.com",
      "calculatingtoothbrush.com",
      "callousbrake.com",
      "calmcactus.com",
      "calypsocapsule.com",
      "cannonchange.com",
      "capriciouscorn.com",
      "captivatingcanyon.com",
      "captivatingillusion.com",
      "captivatingpanorama.com",
      "captivatingperformance.com",
      "carefuldolls.com",
      "caringcast.com",
      "caringzinc.com",
      "carloforward.com",
      "carscannon.com",
      "cartkitten.com",
      "carvecakes.com",
      "catalogcake.com",
      "catschickens.com",
      "cattlecommittee.com",
      "causecherry.com",
      "cautiouscamera.com",
      "cautiouscherries.com",
      "cautiouscrate.com",
      "cautiouscredit.com",
      "cavecurtain.com",
      "ceciliavenus.com",
      "celestialeuphony.com",
      "celestialquasar.com",
      "celestialspectra.com",
      "chaireggnog.com",
      "chairscrack.com",
      "chairsdonkey.com",
      "chalkoil.com",
      "changeablecats.com",
      "channelcamp.com",
      "chargecracker.com",
      "charmingplate.com",
      "charscroll.com",
      "cheerycraze.com",
      "chessbranch.com",
      "chesscolor.com",
      "chesscrowd.com",
      "childlikecrowd.com",
      "childlikeexample.com",
      "childlikeform.com",
      "chilledliquid.com",
      "chingovernment.com",
      "chinsnakes.com",
      "chipperisle.com",
      "chivalrouscord.com",
      "chubbycreature.com",
      "chunkycactus.com",
      "cicdserver.com",
      "cinemabonus.com",
      "circlelevel.com",
      "clammychicken.com",
      "cleanhaircut.com",
      "cloisteredcurve.com",
      "closedcows.com",
      "closefriction.com",
      "cloudhustles.com",
      "cloudjumbo.com",
      "clumsycar.com",
      "coatfood.com",
      "cobaltoverture.com",
      "coffeesidehustle.com",
      "coldbalance.com",
      "coldcreatives.com",
      "colorfulafterthought.com",
      "colossalclouds.com",
      "colossalcoat.com",
      "colossalcry.com",
      "combativecar.com",
      "combativedetail.com",
      "combbit.com",
      "combcattle.com",
      "combcompetition.com",
      "comfortablecheese.com",
      "comparereaction.com",
      "compiledoctor.com",
      "concernedchange.com",
      "concernedchickens.com",
      "condemnedcomb.com",
      "conditionchange.com",
      "conditioncrush.com",
      "confesschairs.com",
      "configchain.com",
      "connectashelf.com",
      "consciouschairs.com",
      "consciouscheese.com",
      "consumerzero.com",
      "controlcola.com",
      "controlhall.com",
      "convertbatch.com",
      "cooingcoal.com",
      "coordinatedbedroom.com",
      "coordinatedcoat.com",
      "copycarpenter.com",
      "copyrightaccesscontrols.com",
      "coralreverie.com",
      "corgibeachday.com",
      "cosmicsculptor.com",
      "cosmosjackson.com",
      "courageousbaby.com",
      "cozydusk.com",
      "cozyhillside.com",
      "cozytryst.com",
      "crabbychin.com",
      "crackedsafe.com",
      "crafthenry.com",
      "crashchance.com",
      "cratecamera.com",
      "craterbox.com",
      "creatorcherry.com",
      "creatorpassenger.com",
      "creaturecabbage.com",
      "crimsonmeadow.com",
      "critictruck.com",
      "crookedcreature.com",
      "crowdedmass.com",
      "cryptvalue.com",
      "crystalboulevard.com",
      "cubchannel.com",
      "cubepins.com",
      "cuddlycake.com",
      "cuddlylunchroom.com",
      "culturedcamera.com",
      "culturedfeather.com",
      "cumbersomecar.com",
      "cumbersomecarpenter.com",
      "curiouschalk.com",
      "curioussuccess.com",
      "curlycannon.com",
      "currentcollar.com",
      "curtaincows.com",
      "curvedhoney.com",
      "curvycord.com",
      "curvycry.com",
      "cushiondrum.com",
      "cushionpig.com",
      "cutechin.com",
      "cyclopsdial.com",
      "dailydivision.com",
      "damagedadvice.com",
      "damageddistance.com",
      "dampdock.com",
      "dancemistake.com",
      "dandydune.com",
      "dandyglow.com",
      "dapperdiscussion.com",
      "datastoried.com",
      "daughterstone.com",
      "daymodern.com",
      "dazzlingbook.com",
      "deafeningdock.com",
      "deafeningdowntown.com",
      "debonairdust.com",
      "debonairtree.com",
      "debugentity.com",
      "decidedrum.com",
      "decisivedrawer.com",
      "decisiveducks.com",
      "decoycreation.com",
      "deerbeginner.com",
      "defeatedbadge.com",
      "defensevest.com",
      "degreechariot.com",
      "delegatediscussion.com",
      "delicatecascade.com",
      "deliciousducks.com",
      "deltafault.com",
      "deluxecrate.com",
      "dependenttrip.com",
      "desirebucket.com",
      "desiredirt.com",
      "detailedgovernment.com",
      "detectdinner.com",
      "detourgame.com",
      "deviceseal.com",
      "deviceworkshop.com",
      "devilishdinner.com",
      "dewdroplagoon.com",
      "difficultfog.com",
      "digestiondrawer.com",
      "dinnerquartz.com",
      "diplomahawaii.com",
      "direfuldesk.com",
      "disagreeabledrop.com",
      "discreetquarter.com",
      "distributionneck.com",
      "distributionpocket.com",
      "distributiontomatoes.com",
      "disturbedquiet.com",
      "divehope.com",
      "dk4ywix.com",
      "dockdigestion.com",
      "dogsonclouds.com",
      "dollardelta.com",
      "doubledefend.com",
      "doubtdrawer.com",
      "dq95d35.com",
      "drainpaste.com",
      "dramaticdirection.com",
      "driftpizza.com",
      "drollwharf.com",
      "drydrum.com",
      "dustydime.com",
      "dustyhammer.com",
      "eagereden.com",
      "eagerflame.com",
      "eagerknight.com",
      "earthyfarm.com",
      "eatablesquare.com",
      "echoinghaven.com",
      "effervescentcoral.com",
      "effervescentvista.com",
      "effulgentnook.com",
      "effulgenttempest.com",
      "ejyymghi.com",
      "elasticchange.com",
      "elderlybean.com",
      "elderlytown.com",
      "elephantqueue.com",
      "elusivebreeze.com",
      "elusivecascade.com",
      "elysiantraverse.com",
      "embellishedmeadow.com",
      "embermosaic.com",
      "emberwhisper.com",
      "eminentbubble.com",
      "eminentend.com",
      "emptyescort.com",
      "enchantedskyline.com",
      "enchantingdiscovery.com",
      "enchantingenchantment.com",
      "enchantingmystique.com",
      "enchantingtundra.com",
      "enchantingvalley.com",
      "encourageshock.com",
      "encouragingthread.com",
      "endlesstrust.com",
      "endurablebulb.com",
      "energeticexample.com",
      "energeticladybug.com",
      "engineergrape.com",
      "engineertrick.com",
      "enigmaticblossom.com",
      "enigmaticcanyon.com",
      "enigmaticvoyage.com",
      "enormousearth.com",
      "enormousfoot.com",
      "enterdrama.com",
      "entertainskin.com",
      "enthusiastictemper.com",
      "enviousshape.com",
      "enviousthread.com",
      "equablekettle.com",
      "etherealbamboo.com",
      "ethereallagoon.com",
      "etherealpinnacle.com",
      "etherealquasar.com",
      "etherealripple.com",
      "evanescentedge.com",
      "evasivejar.com",
      "eventexistence.com",
      "exampleshake.com",
      "excitingtub.com",
      "exclusivebrass.com",
      "executeknowledge.com",
      "exhibitsneeze.com",
      "expansioneggnog.com",
      "exquisiteartisanship.com",
      "extractobservation.com",
      "extralocker.com",
      "extramonies.com",
      "exuberantedge.com",
      "facilitatebreakfast.com",
      "fadechildren.com",
      "fadedsnow.com",
      "fadewaves.com",
      "fairfeeling.com",
      "fairiesbranch.com",
      "fairytaleflame.com",
      "fallaciousfifth.com",
      "falseframe.com",
      "familiarrod.com",
      "fancyactivity.com",
      "fancydune.com",
      "fancygrove.com",
      "fangfeeling.com",
      "fantastictone.com",
      "farethief.com",
      "farmergoldfish.com",
      "farshake.com",
      "farsnails.com",
      "fastenfather.com",
      "fasterfineart.com",
      "fasterjson.com",
      "fatcoil.com",
      "faucetfoot.com",
      "faultycanvas.com",
      "fearfulfish.com",
      "fearfulmint.com",
      "fearlessfaucet.com",
      "fearlesstramp.com",
      "featherstage.com",
      "feeblestamp.com",
      "feignedfaucet.com",
      "fewjuice.com",
      "fewkittens.com",
      "finalizeforce.com",
      "finestpiece.com",
      "finitecube.com",
      "firecatfilms.com",
      "fireworkcamp.com",
      "firstendpoint.com",
      "firstfrogs.com",
      "firsttexture.com",
      "fivesidedsquare.com",
      "fixedfold.com",
      "flakyfeast.com",
      "flameuncle.com",
      "flimsycircle.com",
      "flimsythought.com",
      "flippedfunnel.com",
      "floodprincipal.com",
      "flourishingcollaboration.com",
      "flourishingendeavor.com",
      "flourishinginnovation.com",
      "flourishingpartnership.com",
      "flowersornament.com",
      "flowerycreature.com",
      "floweryfact.com",
      "floweryoperation.com",
      "flutteringfireman.com",
      "foambench.com",
      "followborder.com",
      "forecasttiger.com",
      "foretellfifth.com",
      "forevergears.com",
      "forgetfulflowers.com",
      "forgetfulsnail.com",
      "fortunatemark.com",
      "fractalcoast.com",
      "framebanana.com",
      "franticroof.com",
      "frazzleart.com",
      "freezingbuilding.com",
      "frequentflesh.com",
      "friendlycrayon.com",
      "friendlyfold.com",
      "frightenedpotato.com",
      "frogtray.com",
      "fronttoad.com",
      "frugalfiestas.com",
      "fumblingform.com",
      "functionalcrown.com",
      "functionalfeather.com",
      "funoverbored.com",
      "funoverflow.com",
      "furryfork.com",
      "furryhorses.com",
      "futuristicapparatus.com",
      "futuristicfairies.com",
      "futuristicfifth.com",
      "futuristicframe.com",
      "fuzzyaudio.com",
      "fuzzybasketball.com",
      "fuzzyerror.com",
      "fvl1f.pw",
      "gardenovens.com",
      "gaudyairplane.com",
      "geekactive.com",
      "generalprose.com",
      "generateoffice.com",
      "giantsvessel.com",
      "giddycoat.com",
      "giraffepiano.com",
      "gitcrumbs.com",
      "givevacation.com",
      "gladglen.com",
      "gladysway.com",
      "glamhawk.com",
      "gleamingcow.com",
      "gleaminghaven.com",
      "glisteningguide.com",
      "glisteningsign.com",
      "glitteringbrook.com",
      "gloriousbeef.com",
      "glowingmeadow.com",
      "gluedpixel.com",
      "goldfishgrowth.com",
      "gondolagnome.com",
      "goodbark.com",
      "gracefulmilk.com",
      "grainmass.com",
      "grandfatherguitar.com",
      "gravitykick.com",
      "grayoranges.com",
      "grayreceipt.com",
      "greyinstrument.com",
      "gripcorn.com",
      "groovyornament.com",
      "grouchybrothers.com",
      "grouchypush.com",
      "grumpydime.com",
      "grumpydrawer.com",
      "guardeddirection.com",
      "guardedschool.com",
      "guessdetail.com",
      "guidecent.com",
      "guildalpha.com",
      "guiltlessbasketball.com",
      "gulliblegrip.com",
      "gustocooking.com",
      "gustygrandmother.com",
      "h78xb.pw",
      "habitualhumor.com",
      "halcyoncanyon.com",
      "halcyonsculpture.com",
      "hallowedinvention.com",
      "haltingdivision.com",
      "hammerhearing.com",
      "handleteeth.com",
      "handnorth.com",
      "handsomehose.com",
      "handsomeindustry.com",
      "handsomelyhealth.com",
      "handsomelythumb.com",
      "handsomeyam.com",
      "handyfireman.com",
      "handyincrease.com",
      "haplesshydrant.com",
      "haplessland.com",
      "happysponge.com",
      "harborcub.com",
      "harmonicbamboo.com",
      "harmonywing.com",
      "headydegree.com",
      "headyhook.com",
      "healflowers.com",
      "hearinglizards.com",
      "heartbreakingmind.com",
      "heavydetail.com",
      "heavyplayground.com",
      "helpcollar.com",
      "helpflame.com",
      "hfc195b.com",
      "highfalutinbox.com",
      "highfalutinhoney.com",
      "hilariouszinc.com",
      "historicalbeam.com",
      "hollowafterthought.com",
      "homelycrown.com",
      "honeybulb.com",
      "honeywhipped.com",
      "honorablehydrant.com",
      "hospitablehall.com",
      "hospitablehat.com",
      "howdyinbox.com",
      "humdrumhobbies.com",
      "humdrumtouch.com",
      "hurtgrape.com",
      "hypnoticwound.com",
      "hystericalcloth.com",
      "hystericalfinger.com",
      "i9w8p.pw",
      "idolscene.com",
      "idyllicjazz.com",
      "illinvention.com",
      "illustriousoatmeal.com",
      "immensehoney.com",
      "imminentshake.com",
      "importantmeat.com",
      "importedincrease.com",
      "importedinsect.com",
      "importlocate.com",
      "impossibleexpansion.com",
      "impossiblemove.com",
      "impulsejewel.com",
      "impulselumber.com",
      "incomehippo.com",
      "incompetentjoke.com",
      "inconclusiveaction.com",
      "infamousstream.com",
      "innocentlamp.com",
      "innocentwax.com",
      "inputicicle.com",
      "inquisitiveice.com",
      "inquisitiveinvention.com",
      "intelligentscissors.com",
      "interestdust.com",
      "internalcondition.com",
      "internalsink.com",
      "irritatingfog.com",
      "itemslice.com",
      "ivykiosk.com",
      "j93557g.com",
      "jadeitite.com",
      "jaderooster.com",
      "jailbulb.com",
      "joblessdrum.com",
      "jollylens.com",
      "joyfulkeen.com",
      "joyoussurprise.com",
      "jubilantaura.com",
      "jubilantcanyon.com",
      "jubilantcascade.com",
      "jubilantglimmer.com",
      "jubilanttempest.com",
      "jubilantwhisper.com",
      "justicejudo.com",
      "k54nw.pw",
      "kaputquill.com",
      "keenquill.com",
      "kindhush.com",
      "kitesquirrel.com",
      "knitstamp.com",
      "knottyswing.com",
      "laboredlocket.com",
      "lameletters.com",
      "lamplow.com",
      "largebrass.com",
      "lasttaco.com",
      "leaplunchroom.com",
      "leftliquid.com",
      "lemonpackage.com",
      "lemonsandjoy.com",
      "liftedknowledge.com",
      "lightenafterthought.com",
      "lighttalon.com",
      "livelumber.com",
      "livelylaugh.com",
      "livelyreward.com",
      "livingsleet.com",
      "lizardslaugh.com",
      "loadsurprise.com",
      "lonelyflavor.com",
      "longingtrees.com",
      "lorenzourban.com",
      "losslace.com",
      "loudlunch.com",
      "lovelydrum.com",
      "loveseashore.com",
      "lp3tdqle.com",
      "ludicrousarch.com",
      "lumberamount.com",
      "luminousboulevard.com",
      "luminouscatalyst.com",
      "luminoussculptor.com",
      "lumpygnome.com",
      "lumpylumber.com",
      "lunchroomlock.com",
      "lustroushaven.com",
      "lyricshook.com",
      "madebyintent.com",
      "magicaljoin.com",
      "magnetairport.com",
      "majesticmountainrange.com",
      "majesticwaterscape.com",
      "majesticwilderness.com",
      "maliciousmusic.com",
      "managedpush.com",
      "mantrafox.com",
      "marblediscussion.com",
      "markedmeasure.com",
      "marketspiders.com",
      "marriedmailbox.com",
      "marriedvalue.com",
      "massivemark.com",
      "materialisticmoon.com",
      "materialmilk.com",
      "materialplayground.com",
      "meadowlullaby.com",
      "measlymiddle.com",
      "meatydime.com",
      "meddleplant.com",
      "mediatescarf.com",
      "mediumshort.com",
      "mellowhush.com",
      "mellowmailbox.com",
      "melodiouschorus.com",
      "melodiouscomposition.com",
      "meltmilk.com",
      "memopilot.com",
      "memorizematch.com",
      "memorizeneck.com",
      "mentorsticks.com",
      "meremark.com",
      "merequartz.com",
      "merryopal.com",
      "merryvault.com",
      "messagenovice.com",
      "messyoranges.com",
      "mightyspiders.com",
      "mimosamajor.com",
      "mindfulgem.com",
      "minorcattle.com",
      "minusmental.com",
      "minuteburst.com",
      "miscreantmoon.com",
      "mistyhorizon.com",
      "mittencattle.com",
      "mixedreading.com",
      "modularmental.com",
      "monacobeatles.com",
      "moorshoes.com",
      "morefriendly.com",
      "motionflowers.com",
      "motionlessbelief.com",
      "motionlessmeeting.com",
      "movemeal.com",
      "muddledaftermath.com",
      "muddledmemory.com",
      "mundanenail.com",
      "mundanepollution.com",
      "mushywaste.com",
      "muteknife.com",
      "mutemailbox.com",
      "mysticalagoon.com",
      "naivestatement.com",
      "nappyattack.com",
      "nappyneck.com",
      "neatshade.com",
      "nebulacrescent.com",
      "nebulajubilee.com",
      "nebulousamusement.com",
      "nebulousgarden.com",
      "nebulousquasar.com",
      "nebulousripple.com",
      "needlessnorth.com",
      "needyneedle.com",
      "neighborlywatch.com",
      "niftygraphs.com",
      "niftyhospital.com",
      "niftyjelly.com",
      "nightwound.com",
      "nimbleplot.com",
      "nocturnalloom.com",
      "nocturnalmystique.com",
      "noiselessplough.com",
      "nonchalantnerve.com",
      "nondescriptcrowd.com",
      "nondescriptnote.com",
      "nondescriptstocking.com",
      "nostalgicknot.com",
      "nostalgicneed.com",
      "notifyglass.com",
      "nudgeduck.com",
      "nullnorth.com",
      "numerousnest.com",
      "oafishchance.com",
      "oafishobservation.com",
      "obscenesidewalk.com",
      "observantice.com",
      "oldfashionedoffer.com",
      "omgthink.com",
      "omniscientfeeling.com",
      "onlywoofs.com",
      "opalquill.com",
      "operationchicken.com",
      "operationnail.com",
      "oppositeoperation.com",
      "optimallimit.com",
      "opulentsylvan.com",
      "orientedargument.com",
      "orionember.com",
      "ourblogthing.com",
      "overkick.com",
      "overratedchalk.com",
      "owlsr.us",
      "oxygenfuse.com",
      "pailcrime.com",
      "pailpatch.com",
      "painstakingpickle.com",
      "paintpear.com",
      "paleleaf.com",
      "pamelarandom.com",
      "panoramicplane.com",
      "parallelbulb.com",
      "pardonpopular.com",
      "parentpicture.com",
      "parsimoniouspolice.com",
      "partplanes.com",
      "passivepolo.com",
      "pastoralroad.com",
      "pawsnug.com",
      "peacefullimit.com",
      "pedromister.com",
      "pedropanther.com",
      "perceivequarter.com",
      "perkyjade.com",
      "petiteumbrella.com",
      "photographpan.com",
      "piespower.com",
      "piquantgrove.com",
      "piquantmeadow.com",
      "piquantpigs.com",
      "piquantprice.com",
      "piquantvortex.com",
      "pixeledhub.com",
      "pizzasnut.com",
      "placeframe.com",
      "placidactivity.com",
      "placidperson.com",
      "planebasin.com",
      "playfulriver.com",
      "pleasantpump.com",
      "plotparent.com",
      "plotrabbit.com",
      "pluckypocket.com",
      "pluckyzone.com",
      "pocketfaucet.com",
      "poeticpackage.com",
      "pointdigestion.com",
      "pointlesshour.com",
      "pointlesspocket.com",
      "pointlessprofit.com",
      "pointlessrifle.com",
      "polarismagnet.com",
      "polishedcrescent.com",
      "polishedfolly.com",
      "politeplanes.com",
      "politicalporter.com",
      "popplantation.com",
      "possiblepencil.com",
      "potatoinvention.com",
      "powderjourney.com",
      "powerfulblends.com",
      "preciousplanes.com",
      "prefixpatriot.com",
      "prepareplanes.com",
      "presetrabbits.com",
      "previousplayground.com",
      "pricklypollution.com",
      "pristinegale.com",
      "probablepartner.com",
      "processplantation.com",
      "producepickle.com",
      "productsurfer.com",
      "profitrumour.com",
      "promiseair.com",
      "propertypotato.com",
      "protestcopy.com",
      "psychedelicarithmetic.com",
      "psychedelicchess.com",
      "publicsofa.com",
      "puffyloss.com",
      "puffypaste.com",
      "puffypull.com",
      "puffypurpose.com",
      "pulsatingmeadow.com",
      "pumpedpancake.com",
      "pumpedpurpose.com",
      "punyplant.com",
      "puppytooth.com",
      "purposepipe.com",
      "quaintcan.com",
      "quaintlake.com",
      "quantumlagoon.com",
      "quantumshine.com",
      "queenskart.com",
      "quillkick.com",
      "quirkybliss.com",
      "quirkysugar.com",
      "quixoticnebula.com",
      "rabbitbreath.com",
      "rabbitrifle.com",
      "radiantcanopy.com",
      "radiantlullaby.com",
      "radiateprose.com",
      "railwaygiraffe.com",
      "railwayreason.com",
      "raintwig.com",
      "rainyhand.com",
      "rainyrule.com",
      "rambunctiousflock.com",
      "rangecake.com",
      "rangeplayground.com",
      "raresummer.com",
      "reactjspdf.com",
      "readingguilt.com",
      "readymoon.com",
      "readysnails.com",
      "realizedoor.com",
      "realizerecess.com",
      "rebelclover.com",
      "rebelhen.com",
      "rebelswing.com",
      "receiptcent.com",
      "receptiveink.com",
      "receptivereaction.com",
      "recessrain.com",
      "reconditeprison.com",
      "reconditerake.com",
      "reconditerespect.com",
      "refundradar.com",
      "regularplants.com",
      "regulatesleet.com",
      "rehabilitatereason.com",
      "relationrest.com",
      "releasepath.com",
      "reloadphoto.com",
      "rememberdiscussion.com",
      "rentinfinity.com",
      "replaceroute.com",
      "resonantbrush.com",
      "resonantrock.com",
      "respectrain.com",
      "resplendentecho.com",
      "restrainstorm.com",
      "restructureinvention.com",
      "retrievemint.com",
      "rhetoricalactivity.com",
      "rhetoricalloss.com",
      "rhetoricalveil.com",
      "rhymezebra.com",
      "rhythmrule.com",
      "richstring.com",
      "righteouscrayon.com",
      "rigidrobin.com",
      "rigidveil.com",
      "rigorlab.com",
      "ringplant.com",
      "ringsrecord.com",
      "ritzykey.com",
      "ritzyrepresentative.com",
      "ritzyveil.com",
      "rockpebbles.com",
      "rollconnection.com",
      "roseincome.com",
      "rottenray.com",
      "ruralrobin.com",
      "rusticprice.com",
      "ruthlessdegree.com",
      "ruthlessmilk.com",
      "sableloss.com",
      "sablesmile.com",
      "sadloaf.com",
      "saffronrefuge.com",
      "sagargift.com",
      "saltsacademy.com",
      "samesticks.com",
      "samplesamba.com",
      "sandstrophies.com",
      "satisfycork.com",
      "scarcecard.com",
      "scarceshock.com",
      "scarcesign.com",
      "scarcestructure.com",
      "scarcesurprise.com",
      "scaredcomfort.com",
      "scaredsidewalk.com",
      "scaredslip.com",
      "scaredsnake.com",
      "scaredsnakes.com",
      "scaredsong.com",
      "scaredstomach.com",
      "scaredswing.com",
      "scarefowl.com",
      "scarfsmash.com",
      "scatteredheat.com",
      "scatteredstream.com",
      "scenicapparel.com",
      "scientificshirt.com",
      "scintillatingscissors.com",
      "scintillatingsilver.com",
      "scissorsstatement.com",
      "scrapesleep.com",
      "scratchsofa.com",
      "screechingfurniture.com",
      "screechingstocking.com",
      "screechingstove.com",
      "scribblestring.com",
      "scrollservice.com",
      "scrubswim.com",
      "secondhandfall.com",
      "secretivesheep.com",
      "secretspiders.com",
      "secretturtle.com",
      "seedscissors.com",
      "selfishsea.com",
      "sendingspire.com",
      "sensorsmile.com",
      "separatesort.com",
      "seraphichorizon.com",
      "seraphicjubilee.com",
      "serendipityecho.com",
      "serenecascade.com",
      "serenepebble.com",
      "serenesurf.com",
      "serioussuit.com",
      "serpentshampoo.com",
      "settleshoes.com",
      "shadeship.com",
      "shaggytank.com",
      "shakyseat.com",
      "shakysurprise.com",
      "shakytaste.com",
      "shallowblade.com",
      "shamerain.com",
      "shapecomb.com",
      "sheargovernor.com",
      "shesubscriptions.com",
      "shinypond.com",
      "shirtsidewalk.com",
      "shiveringspot.com",
      "shiverscissors.com",
      "shockinggrass.com",
      "shockingship.com",
      "shredquiz.com",
      "shrillspoon.com",
      "shydinosaurs.com",
      "sierrakermit.com",
      "signaturepod.com",
      "siliconslow.com",
      "sillyscrew.com",
      "simplesidewalk.com",
      "simulateswing.com",
      "sincerebuffalo.com",
      "sincerepelican.com",
      "sinceresubstance.com",
      "singroot.com",
      "sixscissors.com",
      "sizzlingsmoke.com",
      "skillfuldrop.com",
      "skisofa.com",
      "slaysweater.com",
      "slimyscarf.com",
      "slinksuggestion.com",
      "slopesoap.com",
      "smallershops.com",
      "smashshoe.com",
      "smashsurprise.com",
      "smoggysnakes.com",
      "smoggysongs.com",
      "smoggystation.com",
      "snacktoken.com",
      "snakemineral.com",
      "snakeslang.com",
      "snoresmile.com",
      "snowmentor.com",
      "soggysponge.com",
      "solarislabyrinth.com",
      "somberscarecrow.com",
      "sombersticks.com",
      "songsterritory.com",
      "soothingglade.com",
      "soresidewalk.com",
      "soresneeze.com",
      "sorethunder.com",
      "soretrain.com",
      "sortsummer.com",
      "sparklingshelf.com",
      "specialscissors.com",
      "spellmist.com",
      "spellsalsa.com",
      "spiffymachine.com",
      "spirebaboon.com",
      "spookyexchange.com",
      "spookyskate.com",
      "spoonsilk.com",
      "spotlessstamp.com",
      "spottednoise.com",
      "springolive.com",
      "springsister.com",
      "springsnails.com",
      "sproutingbag.com",
      "sprydelta.com",
      "spuriousair.com",
      "spuriousbase.com",
      "spuriousstranger.com",
      "squalidscrew.com",
      "stakingbasket.com",
      "stakingshock.com",
      "stakingsmile.com",
      "staleshow.com",
      "stalesummer.com",
      "starkscale.com",
      "startingcars.com",
      "stayaction.com",
      "steadfastseat.com",
      "steadfastsystem.com",
      "stealsteel.com",
      "stepcattle.com",
      "stepwisevideo.com",
      "stereoproxy.com",
      "stereotypedsugar.com",
      "stiffgame.com",
      "stiffstem.com",
      "stimulatingsneeze.com",
      "stingsquirrel.com",
      "stingycrush.com",
      "stingyshoe.com",
      "stingyspoon.com",
      "stockingsleet.com",
      "stockingsneeze.com",
      "stomachscience.com",
      "stonechin.com",
      "stopstomach.com",
      "stormyachiever.com",
      "straightnest.com",
      "strangeclocks.com",
      "strangersponge.com",
      "strangesink.com",
      "streetsort.com",
      "stretchsister.com",
      "stretchsneeze.com",
      "stretchsquirrel.com",
      "strivesidewalk.com",
      "strokesystem.com",
      "stupendoussnow.com",
      "stupidscene.com",
      "sublimequartz.com",
      "subsequentswim.com",
      "substantialcarpenter.com",
      "substantialgrade.com",
      "successfulscent.com",
      "suggestionbridge.com",
      "sulkycook.com",
      "summerobject.com",
      "superchichair.com",
      "superficialspring.com",
      "superficialsquare.com",
      "swankysquare.com",
      "swellstocking.com",
      "swingslip.com",
      "swordgoose.com",
      "synonymoussticks.com",
      "tangibleteam.com",
      "tangycover.com",
      "tastelesstrees.com",
      "tastelesstrucks.com",
      "tastesnake.com",
      "tearfulglass.com",
      "tediousbear.com",
      "tediousticket.com",
      "teenytinycellar.com",
      "teenytinyshirt.com",
      "tempertrick.com",
      "tempttalk.com",
      "terrifictooth.com",
      "testadmiral.com",
      "texturetrick.com",
      "thicktrucks.com",
      "thingsafterthought.com",
      "thinkitwice.com",
      "thirdrespect.com",
      "thoughtlessknot.com",
      "threetruck.com",
      "ticketaunt.com",
      "ticklesign.com",
      "tiredthroat.com",
      "tiresomethunder.com",
      "toolcapital.com",
      "tradetooth.com",
      "tranquilcan.com",
      "tranquilcanyon.com",
      "tranquilside.com",
      "tranquilveil.com",
      "treadbun.com",
      "tritebadge.com",
      "tritetongue.com",
      "troubleshade.com",
      "truckstomatoes.com",
      "truculentrate.com",
      "tumbleicicle.com",
      "twistloss.com",
      "twistsweater.com",
      "ubiquitoussea.com",
      "ubiquitousyard.com",
      "unablehope.com",
      "unaccountablecreator.com",
      "unaccountablepie.com",
      "unarmedindustry.com",
      "unbecominghall.com",
      "unbecominglamp.com",
      "uncoveredexpert.com",
      "understoodocean.com",
      "unequalbrake.com",
      "unequaltrail.com",
      "unknowncontrol.com",
      "unknowncrate.com",
      "unknowntray.com",
      "untidyquestion.com",
      "untidyrice.com",
      "unusualtitle.com",
      "unwieldyhealth.com",
      "unwieldyimpulse.com",
      "unwieldyplastic.com",
      "uselesslumber.com",
      "validmemo.com",
      "vanfireworks.com",
      "velvetnova.com",
      "velvetquasar.com",
      "vengefulgrass.com",
      "venomousvessel.com",
      "venusgloria.com",
      "verdantanswer.com",
      "verdantloom.com",
      "verseballs.com",
      "vibrantcelebration.com",
      "vibrantpact.com",
      "vibranttalisman.com",
      "vibrantvale.com",
      "virtualvincent.com",
      "vividfrost.com",
      "volatileprofit.com",
      "volatilevessel.com",
      "voraciousgrip.com",
      "wantingwindow.com",
      "warmafterthought.com",
      "warmquiver.com",
      "wateryvan.com",
      "websitesdude.com",
      "wellgroomedapparel.com",
      "wellgroomedhydrant.com",
      "whimsicalcanyon.com",
      "whimsicalgrove.com",
      "whirlwealth.com",
      "whisperingcascade.com",
      "whisperingquasar.com",
      "whisperingsummit.com",
      "wildcommittee.com",
      "wirecomic.com",
      "wiredforcoffee.com",
      "wittypopcorn.com",
      "worriednumber.com",
      "wretchedfloor.com",
      "wtaccesscontrol.com",
      "xovq5nemr.com",
      "yieldingwoman.com",
      "zephyrlabyrinth.com",
      "zestycrime.com",
      "zlp6s.pw",
      "admixer.co.kr",
      "admixer.net",
      "admobile.com",
      "admotion.com",
      "adnami.io",
      "adnet.de",
      "adnetwork.net",
      "adnium.com",
      "adnologies.com",
      "heias.com",
      "2o7.net",
      "adsymptotic.com",
      "auditude.com",
      "bizible.com",
      "bizibly.com",
      "demdex.com",
      "demdex.net",
      "dmtracker.com",
      "efrontier.com",
      "everestads.net",
      "everestjs.net",
      "everesttech.net",
      "fyre.co",
      "hitbox.com",
      "marketo.com",
      "marketo.net",
      "omniture.com",
      "omtrdc.net",
      "tmogul.com",
      "touchclarity.com",
      "tubemogul.com",
      "adomik.com",
      "adonion.com",
      "adop.cc",
      "clickotmedia.com",
      "adotmob.com",
      "adpepper.com",
      "adpepper.us",
      "adperfect.com",
      "adperium.com",
      "adpersia.com",
      "adprs.net",
      "aprecision.net",
      "adpredictive.com",
      "adreactor.com",
      "adrevolution.com",
      "adriver.ru",
      "adscale.de",
      "adscience.nl",
      "adserverpub.com",
      "adshuffle.com",
      "adside.com",
      "adskeeper.co.uk",
      "adskeeper.com",
      "adsfac.eu",
      "adsfac.net",
      "adsfac.us",
      "facilitatedigital.com",
      "adspeed.com",
      "adspeed.net",
      "adsperity.com",
      "adbroker.de",
      "adspirit.com",
      "adspirit.de",
      "adspirit.net",
      "adsquare.com",
      "adsrevenue.net",
      "adstanding.com",
      "ad-stir.com",
      "adstours.com",
      "clickintext.net",
      "4dsply.com",
      "adsupply.com",
      "adtegrity.com",
      "adtegrity.net",
      "adtelligence.de",
      "adtelligent.com",
      "vertamedia.com",
      "adentifi.com",
      "adtiger.de",
      "zadn.vn",
      "adtruth.com",
      "adultadworld.com",
      "adultmoda.com",
      "ad4m.at",
      "ad4mat.de",
      "advangelists.com",
      "adventive.com",
      "adventori.com",
      "adnext.fr",
      "adv-adserver.com",
      "adversal.com",
      "adsmart.com",
      "adverticum.com",
      "adverticum.net",
      "advertise.com",
      "advertisespace.com",
      "advertstream.com",
      "advisormedia.cz",
      "adworx.at",
      "adworx.be",
      "adworx.nl",
      "adx1.com",
      "adxbid.info",
      "adxpansion.com",
      "00px.net",
      "adxvalue.com",
      "adxvalue.de",
      "adyard.de",
      "adyield.com",
      "adyoulike.com",
      "omnitagjs.com",
      "adzcentral.com",
      "adzly.com",
      "aerifymedia.com",
      "anonymous-media.com",
      "affilimate.io",
      "affine.tv",
      "affinesystems.com",
      "affinity.com",
      "atomex.net",
      "afdads.com",
      "afterdownload.com",
      "afterpay.com",
      "adgibbon.com",
      "365media.com",
      "aidata.io",
      "aidemsrv.com",
      "aim4media.com",
      "airpush.com",
      "albacross.com",
      "allstarmediagroup.com",
      "aloodo.com",
      "altergeo.ru",
      "travelaudience.com",
      "a2z.com",
      "amazon-adsystem.com",
      "amazon.ca",
      "amazon.co.jp",
      "amazon.co.uk",
      "amazon.de",
      "amazon.dev",
      "amazon.es",
      "amazon.fr",
      "amazon.it",
      "assoc-amazon.com",
      "imdb.com",
      "serving-sys.com",
      "adnetwork.vn",
      "ambientdigital.com.vn",
      "clearsearchmedia.com",
      "andbeyond.media",
      "aniview.com",
      "admission.net",
      "ansira.com",
      "ynxs.io",
      "dsply.com",
      "pixel.anyclip.com",
      "appcast.io",
      "appenda.com",
      "appflood.com",
      "appier.com",
      "appier.net",
      "applifier.com",
      "applovin.com",
      "mopub.com",
      "appsflyer.com",
      "appssavvy.com",
      "adfusion.com",
      "acint.net",
      "adxcel-ec2.com",
      "thesearchagency.com",
      "thesearchagency.net",
      "rapleaf.com",
      "atedra.com",
      "affiliatetracking.com",
      "atrinsic.com",
      "attn.tv",
      "attentivemobile.com",
      "audience2media.com",
      "audienceadnetwork.com",
      "userreport.com",
      "audrte.com",
      "audiencescience.com",
      "revsci.net",
      "targetingmarketplace.com",
      "wunderloop.net",
      "ad.gt",
      "hadronid.net",
      "cpmadvisors.com",
      "cpmatic.com",
      "optim.al",
      "orbengine.com",
      "xa.net",
      "jpush.cn",
      "am.ua",
      "autocentre.ua",
      "automattic.com",
      "pubmine.com",
      "avantlink.com",
      "avmws.com",
      "adspdbl.com",
      "avidglobalmedia.com",
      "avidglobalmedia.eu",
      "metadsp.co.uk",
      "avct.cloud",
      "avocet.io",
      "avsads.com",
      "aweber.com",
      "affili.net",
      "affilinet-inside.de",
      "banner-rotation.com",
      "buy.at",
      "digitalwindow.com",
      "dwin1.com",
      "perfiliate.com",
      "successfultogether.co.uk",
      "zanox-affiliate.de",
      "zanox.com",
      "awio.com",
      "w3counter.com",
      "ayads.co",
      "de17a.com",
      "hi-media.com",
      "inskinmedia.com",
      "madvertise.com",
      "quantum-advertising.com",
      "sublime.xyz",
      "widespace.com",
      "rsz.sk",
      "b2.ai",
      "backbeatmedia.com",
      "mediago.io",
      "popin.cc",
      "insightexpress.com",
      "insightexpressai.com",
      "bannerconnect.net",
      "barilliance.com",
      "baronsoffers.com",
      "adbrite.com",
      "basis.net",
      "sitescout.com",
      "batanga.com",
      "batanganetwork.com",
      "sumo.com",
      "sumome.com",
      "beachfront.com",
      "bfmio.com",
      "beanstockmedia.com",
      "begun.ru",
      "adbutler.de",
      "belboon.com",
      "7a75ebcbd7.com",
      "beop.io",
      "betgenius.com",
      "connextra.com",
      "betweendigital.com",
      "aivalabs.com",
      "bidfluence.com",
      "fksnk.com",
      "bidtellect.com",
      "bttrack.com",
      "bidtheatre.com",
      "bidvertiser.com",
      "bigcrunch.com",
      "bigmir.net",
      "vendemore.com",
      "bitcoinplus.com",
      "bitmedia.io",
      "blacklabelads.com",
      "blismedia.com",
      "btloader.com",
      "pagefair.com",
      "pagefair.net",
      "videoplayerhub.com",
      "blogcatalog.com",
      "theblogfrog.com",
      "blogherads.com",
      "p.brsrvr.com",
      "bluecore.com",
      "blutrumpet.com",
      "boldapps.net",
      "searchserverapi.com",
      "adlightning.com",
      "boo-box.com",
      "bookmsg.com",
      "boostbox.com.br",
      "medianet.com",
      "dep-x.com",
      "app.link",
      "branch.io",
      "brandaffinity.net",
      "brandmetrics.com",
      "rtbidder.net",
      "appboycdn.com",
      "braze.com",
      "breaktime.com.tw",
      "scupio.com",
      "adserverplus.com",
      "oridian.com",
      "ybrantdigital.com",
      "b0e8.com",
      "bc0a.com",
      "brightedge.com",
      "browsiprod.com",
      "bucksense.com",
      "burstly.com",
      "burstdirectads.com",
      "burstmedia.com",
      "burstnet.com",
      "giantrealm.com",
      "businessol.com",
      "usebutton.com",
      "beaconads.com",
      "buysellads.com",
      "carbonads.com",
      "yoggrt.com",
      "buysight.com",
      "permuto.com",
      "pulsemgr.com",
      "buzzoola.com",
      "bvmedia.ca",
      "networldmedia.com",
      "networldmedia.net",
      "pangle-ads.com",
      "c1exchange.com",
      "c3metrics.com",
      "c3tag.com",
      "cabnnr.com",
      "4info.com",
      "adhaven.com",
      "brealtime.com",
      "clearstream.tv",
      "emxdgt.com",
      "emxdigital.com",
      "cadreon.com",
      "callrail.com",
      "communicatorcorp.com",
      "campaigngrid.com",
      "capitalaudience.com",
      "capitaldata.fr",
      "cpx.to",
      "carambo.la",
      "caraytech.com.ar",
      "e-planning.net",
      "cardlytics.com",
      "zucks.net",
      "cart.ro",
      "statistics.ro",
      "carts.guru",
      "cbproads.com",
      "ccgateway.net",
      "adpdealerservices.com",
      "cobalt.com",
      "cedato.com",
      "channeladvisor.com",
      "searchmarketing.com",
      "chartboost.com",
      "chaturbate.com",
      "checkm8.com",
      "cheqzone.com",
      "clickcease.com",
      "defybrick.com",
      "ensighten.com",
      "chitika.com",
      "chitika.net",
      "choicestream.com",
      "choozle.com",
      "vpdcp.com",
      "cintnetworks.com",
      "samplicio.us",
      "cityspark.com",
      "trkn.us",
      "clearlink.com",
      "1dmp.io",
      "clickyab.com",
      "clickcertain.com",
      "clickdimensions.com",
      "bashirian.biz",
      "buckridge.link",
      "clickfrog.ru",
      "franecki.net",
      "quitzon.net",
      "reichelcormier.bid",
      "wisokykulas.bid",
      "conversiondashboard.com",
      "clickguard.com",
      "clickinc.com",
      "clicksor.com",
      "clicksor.net",
      "clicktripz.com",
      "clickwinks.com",
      "clicmanager.fr",
      "clixtell.com",
      "cloud-media.fr",
      "clovenetwork.com",
      "cognitivlabs.com",
      "cmmeglobal.com",
      "collective-media.net",
      "tumri.com",
      "tumri.net",
      "colossusssp.com",
      "bidr.io",
      "freewheel.tv",
      "fwmrm.net",
      "stickyadstv.com",
      "commander1.com",
      "compasslabs.com",
      "complex.com",
      "complexmedianetwork.com",
      "adxpose.com",
      "proximic.com",
      "clarium.io",
      "confiant-integrations.net",
      "connatix.com",
      "connectad.io",
      "ctctcdn.com",
      "consumable.com",
      "serverbid.com",
      "adrolays.com",
      "df-srv.de",
      "contaxe.com",
      "contentabc.com",
      "contentexchange.me",
      "contentful.com",
      "admailtiser.com",
      "contextin.com",
      "agencytradingdesk.net",
      "contextuads.com",
      "convergedirect.com",
      "convergetrack.com",
      "conversionruler.com",
      "conversive.nl",
      "convertkit.com",
      "cootlogix.com",
      "coremotives.com",
      "analytics-au.cloud.coveo.com",
      "analytics-ca.cloud.coveo.com",
      "analytics-eu.cloud.coveo.com",
      "analytics.cloud.coveo.com",
      "analytics.org.coveo.com",
      "analytics.orgdev.coveo.com",
      "analytics.orghipaa.coveo.com",
      "analytics.orgstg.coveo.com",
      "analyticsdev-eu.cloud.coveo.com",
      "analyticsdev.cloud.coveo.com",
      "analyticshipaa.cloud.coveo.com",
      "analyticsstg.cloud.coveo.com",
      "usageanalytics.coveo.com",
      "usageanalyticsdev.coveo.com",
      "usageanalyticshipaa.coveo.com",
      "adify.com",
      "afy11.net",
      "coxdigitalsolutions.com",
      "esm1.net",
      "thinkrealtime.com",
      "cpmstar.com",
      "crimtan.com",
      "ctnsnet.com",
      "crispmedia.com",
      "bidswitch.net",
      "criteo.com",
      "criteo.net",
      "fg8dgt.com",
      "hlserve.com",
      "hooklogic.com",
      "iponweb.com",
      "iponweb.net",
      "storetail.io",
      "crosspixel.net",
      "crosspixelmedia.com",
      "crsspxl.com",
      "kitewheel.com",
      "adtdp.com",
      "dada.pro",
      "dmxleo.com",
      "infogroup.com",
      "datamind.ru",
      "aroa.io",
      "datonics.com",
      "pro-market.net",
      "dc-storm.com",
      "stormiq.com",
      "lockerdome.com",
      "dedicatedmedia.com",
      "dedicatednetworks.com",
      "deepintent.com",
      "deliverimp.com",
      "delivr.com",
      "percentmobile.com",
      "domdex.com",
      "magnetic.com",
      "orangesoda.com",
      "otracking.com",
      "demandmedia.com",
      "indieclick.com",
      "accordantmedia.com",
      "bluestreak.com",
      "dp-dhl.com",
      "developermedia.com",
      "lqcdn.com",
      "dgit.com",
      "eyeblaster.com",
      "mdadx.com",
      "unicast.com",
      "dianomi.com",
      "did-it.com",
      "didit.com",
      "privacy-center.org",
      "wtp101.com",
      "digiseg.net",
      "impact-ad.jp",
      "digitaleast.mobi",
      "adready.com",
      "adreadypixels.com",
      "adreadytractions.com",
      "cpxadroit.com",
      "cpxinteractive.com",
      "digitalriver.com",
      "keywordmax.com",
      "netflame.cc",
      "digitaltarget.ru",
      "adcolony.com",
      "admarvel.com",
      "fyber.com",
      "heyzap.com",
      "inner-active.com",
      "tpbid.com",
      "digitize.ie",
      "directadvert.ru",
      "directresponsegroup.com",
      "ppctracking.net",
      "directtrack.com",
      "disqus.com",
      "disqusads.com",
      "disquscdn.com",
      "jsrdn.com",
      "dmpxs.com",
      "adhese.com",
      "selectablemedia.com",
      "dotmetrics.net",
      "doublepimp.com",
      "doublepositive.com",
      "lookery.com",
      "driveniq.com",
      "dstillery.com",
      "m6d.com",
      "media6degrees.com",
      "dtscout.com",
      "dtssrv.com",
      "durationmedia.net",
      "dxkulture.com",
      "dynadmic.com",
      "dyntrk.com",
      "exitjunction.com",
      "dynata.com",
      "earnify.com",
      "ebay.com",
      "ebayadservices.com",
      "ebayimg.com",
      "ebaystatic.com",
      "uplynk.com",
      "effectivemeasure.com",
      "effectivemeasure.net",
      "e-kolay.net",
      "ekolay.net",
      "eleavers.com",
      "getelevar.com",
      "usemax.de",
      "emerse.com",
      "xplosion.de",
      "enecto.com",
      "bnmla.com",
      "engagebdr.com",
      "appmetrx.com",
      "engago.com",
      "entireweb.com",
      "smadex.com",
      "epicadvertising.com",
      "theepicmediagroup.com",
      "trafficmp.com",
      "epsilon.com",
      "eqads.com",
      "sascdn.com",
      "smartadserver.com",
      "leadplace.fr",
      "ero-advertising.com",
      "eskimi.com",
      "etarget.eu",
      "etargetnet.com",
      "adtng.com",
      "trafficjunky.com",
      "trafficjunky.net",
      "adwitserver.com",
      "etineria.com",
      "etrigue.com",
      "euid.eu",
      "engineseeker.com",
      "e-volution.ai",
      "evolvemediametrics.com",
      "gorillanation.com",
      "ewaydirect.com",
      "ixs1.net",
      "777seo.com",
      "ewebse.com",
      "exdynsrv.com",
      "exoclick.com",
      "exosrv.com",
      "realsrv.com",
      "wpncdn.com",
      "audienceiq.com",
      "expo-max.com",
      "extensionfactory.com",
      "extole.io",
      "eyenewton.ru",
      "eyeviewdigital.com",
      "ezodn.com",
      "ezoic.com",
      "ezoic.net",
      "fanplayr.com",
      "fathomdelivers.com",
      "fathomseo.com",
      "fetchback.com",
      "fiftyt.com",
      "fiksu.com",
      "financialcontent.com",
      "first-id.fr",
      "adcell.de",
      "flashtalking.com",
      "spongecell.com",
      "pontiflex.com",
      "adiquity.com",
      "flite.com",
      "widgetserver.com",
      "adingo.jp",
      "fluct.jp",
      "goldspotmedia.com",
      "adparlor.com",
      "flux-cdn.com",
      "flux.jp",
      "flytxt.com",
      "fimserve.com",
      "foxonestop.com",
      "mobsmith.com",
      "myads.com",
      "glotgrx.com",
      "fout.jp",
      "deployads.com",
      "floors.dev",
      "pub.network",
      "adultfriendfinder.com",
      "ffn.com",
      "pop6.com",
      "tracking.friends2follow.com",
      "double-check.com",
      "frogsex.com",
      "fuseplatform.net",
      "futureads.com",
      "resultlinks.com",
      "servebom.com",
      "semasio.com",
      "semasio.net",
      "game-advertising-online.com",
      "games2win.com",
      "inviziads.com",
      "gammaplatform.com",
      "gamned.com",
      "pointroll.com",
      "reachlocal.com",
      "rlcdn.net",
      "rlets.com",
      "gb-world.net",
      "geistm.com",
      "adocean-global.com",
      "adocean.pl",
      "gemius.com",
      "gemius.pl",
      "genesismedia.com",
      "genesismediaus.com",
      "geniee.co.jp",
      "gssprt.jp",
      "geniusmonkey.com",
      "geoads.com",
      "geoedge.be",
      "getglue.com",
      "smrtlnks.com",
      "adhigh.net",
      "getintent.com",
      "glam.com",
      "glammedia.com",
      "fraudjs.io",
      "gleam.io",
      "glomex.com",
      "gmossp-sp.jp",
      "reemo-ad.jp",
      "gnezdo.ru",
      "godaddy.com",
      "godatafeed.com",
      "2mdn.net",
      "admeld.com",
      "admob.com",
      "adometry.com",
      "adservice.google.com",
      "adwords.google.com",
      "channelintelligence.com",
      "dartsearch.net",
      "destinationurl.com",
      "doubleclick.net",
      "fcmatch.google.com",
      "fcmatch.youtube.com",
      "google.com/pagead/1p-user-list",
      "googleadservices.com",
      "googlesyndication.com",
      "googletagservices.com",
      "invitemedia.com",
      "teracent.com",
      "teracent.net",
      "ytsa.net",
      "crm4d.com",
      "groceryshopping.net",
      "groovinads.com",
      "xad.com",
      "guj.de",
      "globo.com",
      "gumgum.com",
      "justpremium.com",
      "hands.com.br",
      "harrenmedia.com",
      "harrenmedianetwork.com",
      "htlbid.com",
      "ic-live.com",
      "icrossing.com",
      "sptag3.com",
      "hellobar.com",
      "hextom.com",
      "hilltopads.com",
      "hilltopads.net",
      "horyzon-media.com",
      "hotmart.com",
      "hotwords.com",
      "hotwords.es",
      "htplayground.com",
      "httpool.com",
      "clearbit.com",
      "clearbitjs.com",
      "hs-banner.com",
      "hs-scripts.com",
      "hsadspixel.net",
      "hsappstatic.net",
      "hscollectedforms.net",
      "hsforms.com",
      "hsleadflows.net",
      "hubapi.com",
      "huntmads.com",
      "hurra.com",
      "hybrid.ai",
      "affec.tv",
      "digitru.st",
      "iac.com",
      "i-behavior.com",
      "ib-ibi.com",
      "unica.com",
      "eu-1-id5-sync.com",
      "id5-sync.com",
      "idg.com",
      "idgtechnetwork.com",
      "kickfire.com",
      "sa-as.com",
      "visistat.com",
      "600z.com",
      "ientry.com",
      "ignitad.com",
      "illumin.com",
      "viewablemedia.net",
      "visiblemeasures.com",
      "i-mobile.co.jp",
      "clearsaleing.com",
      "csdata1.com",
      "csdata2.com",
      "csdata3.com",
      "fqtag.com",
      "impactcdn.com",
      "impactradius-event.com",
      "impactradius-go.com",
      "ojrq.net",
      "pxf.io",
      "trackonomics.net",
      "360yield.com",
      "improvedigital.com",
      "adotsolution.com",
      "casalemedia.com",
      "indexexchange.com",
      "indexww.com",
      "impressiondesk.com",
      "infectiousmedia.com",
      "gimbal.com",
      "adinsight.com",
      "adinsight.eu",
      "infolinks.com",
      "owneriq.com",
      "owneriq.net",
      "ninthdecimal.com",
      "aerserv.com",
      "inmobi.com",
      "sproutinc.com",
      "revjet.com",
      "innity.com",
      "innovid.com",
      "tvsquared.com",
      "instinctive.io",
      "instinctiveads.com",
      "insurads.com",
      "adsafemedia.com",
      "adsafeprotected.com",
      "iasds01.com",
      "integralads.com",
      "intentiq.com",
      "smct.io",
      "intentmedia.com",
      "intentmedia.net",
      "vlitag.com",
      "intergi.com",
      "intermarkets.net",
      "intermundomedia.com",
      "ibpxl.com",
      "internetbrands.com",
      "interpolls.com",
      "im-apps.net",
      "inuvo.com",
      "netseer.com",
      "investingchannel.com",
      "videostep.com",
      "videoplaza.tv",
      "invocacdn.com",
      "iperceptions.com",
      "centraliprom.com",
      "iprom.net",
      "iprom.si",
      "mediaiprom.com",
      "ipromote.com",
      "precisionclick.com",
      "iprospect.com",
      "iqm.com",
      "iqzone.com",
      "fengkongcloud.com",
      "adversalservers.com",
      "digbro.com",
      "ismatlab.com",
      "ispot.tv",
      "i.ua",
      "ivitrack.com",
      "oberon-media.com",
      "jaroop.com",
      "jasperlabs.com",
      "tradelab.fr",
      "jink.de",
      "jinkads.com",
      "jivox.com",
      "jobthread.com",
      "jads.co",
      "juicyads.com",
      "justuno.com",
      "uuidksinc.net",
      "kameleoon.com",
      "kameleoon.eu",
      "kameleoon.io",
      "kargo.com",
      "revoffers.com",
      "adzerk.com",
      "adzerk.net",
      "keyade.com",
      "keywee.co",
      "kissmyads.com",
      "103092804.com",
      "kitd.com",
      "peerset.com",
      "durchsichtig.xyz",
      "klarnaservices.com",
      "klaviyo.com",
      "config-cdn.ksearchnet.com",
      "ipv4check.ksearchnet.com",
      "ipv6check.ksearchnet.com",
      "klavyio.klevu.com",
      "moi-ai.ksearchnet.com",
      "moicustomizations.klevu.com",
      "pqa-analytics.service.ksearchnet.com",
      "stats.klevu.com",
      "stats.ksearchnet.com",
      "statsjs.klevu.com",
      "visitor.service.ksearchnet.com",
      "zjs.klevu.com",
      "zstats.klevu.com",
      "brand-display.com",
      "admost.com",
      "kokteyl.com",
      "komli.com",
      "kontera.com",
      "adsummos.net",
      "krushmedia.com",
      "ktkjmp.com",
      "kueezrtb.com",
      "getlasso.co",
      "lasso.link",
      "layer-ads.net",
      "leadbolt.com",
      "leadforensics.com",
      "leadinfo.net",
      "leanplum.com",
      "lemmatechnologies.com",
      "levexis.com",
      "lexosmedia.com",
      "lfstmedia.com",
      "lifestreetmedia.com",
      "adizio.com",
      "open-adsyield.com",
      "ortb.net",
      "linkconnector.com",
      "adf.ly",
      "listenlayer.com",
      "espssl.com",
      "listrak.com",
      "listrakbi.com",
      "livechatinc.com",
      "liadm.com",
      "liveintent.com",
      "liveinternet.ru",
      "yadro.ru",
      "liveramp.com",
      "pippio.com",
      "privacymanager.io",
      "rlcdn.com",
      "tvpixel.com",
      "lytiks.com",
      "localyokelmedia.com",
      "loomia.com",
      "loopfuse.net",
      "loopme.com",
      "loopme.me",
      "tk0x1.com",
      "crwdcntrl.net",
      "lotame.com",
      "lotlinx.com",
      "lowermybills.com",
      "lptracker.io",
      "lunamedia.live",
      "ppcprotect.com",
      "line-scdn.net",
      "line.me",
      "yahoo.co.jp",
      "madhouse.cn",
      "dinclinx.com",
      "madisonlogic.com",
      "magnify360.com",
      "adsbyisocket.com",
      "freeskreen.com",
      "isocket.com",
      "rubiconproject.com",
      "spotx.tv",
      "spotxchange.com",
      "campaign-archive1.com",
      "chimpstatic.com",
      "list-manage.com",
      "mailchimp.com",
      "bannerbank.ru",
      "manifest.ru",
      "industrybrains.com",
      "marchex.com",
      "mrf.io",
      "newsroom.bi",
      "marinsm.com",
      "mapixl.com",
      "marketiq.com",
      "martiniadnetwork.com",
      "mashero.com",
      "dynamicyield.com",
      "chemistry.com",
      "match.com",
      "meetic-partners.com",
      "matheranalytics.com",
      "matomy.com",
      "matomymarket.com",
      "optimatic.com",
      "xtendmedia.com",
      "maxbounty.com",
      "mb01.com",
      "mdhv.io",
      "mdotm.com",
      "mediabrix.com",
      "mfadsrvr.com",
      "medialets.com",
      "alocdn.com",
      "designbloxlive.com",
      "mathtag.com",
      "mediamath.com",
      "media.net",
      "adbuyer.com",
      "mediaocean.com",
      "media-servers.net",
      "mediashakers.com",
      "mediatrust.com",
      "grow.me",
      "mediavine.com",
      "mediawallah.com",
      "mediawallahscript.com",
      "origo.hu",
      "medicxmedia.com",
      "megaindex.ru",
      "merchantadvantage.com",
      "rimmkaufman.com",
      "rkdms.com",
      "securedvisit.com",
      "atlassolutions.com",
      "liverail.com",
      "roiservice.com",
      "clickdistrict.com",
      "creative-serving.com",
      "dt00.net",
      "dt07.net",
      "marketgid.com",
      "mgid.com",
      "microad.jp",
      "adbureau.net",
      "adecn.com",
      "adlantic.nl",
      "adnxs-simple.com",
      "adnxs.com",
      "adrdgt.com",
      "alenty.com",
      "appnexus.com",
      "aquantive.com",
      "bat.bing.com",
      "bizo.com",
      "bizographics.com",
      "drawbrid.ge",
      "msads.net",
      "xandr.com",
      "mmismm.com",
      "minutemedia-prebid.com",
      "sendtonews.com",
      "mirando.de",
      "mountain.com",
      "steelhouse.com",
      "steelhousemedia.com",
      "mobfox.com",
      "mobials.com",
      "mobileadtrading.com",
      "showmeinn.com",
      "mobilestorm.com",
      "adfunky.com",
      "mochila.com",
      "mojiva.com",
      "certona.com",
      "monetate.com",
      "monetate.net",
      "res-x.com",
      "cpalead.com",
      "monetizemore.com",
      "monoloop.com",
      "monster.com",
      "moolahmedia.com",
      "singlefeed.com",
      "vendio.com",
      "micpn.com",
      "affbuzzads.com",
      "mrtnsvr.com",
      "mts.ru",
      "multiplestreammktg.com",
      "mundomedia.com",
      "mypressplus.com",
      "ppjol.net",
      "mythings.com",
      "mywebgrocer.com",
      "audiencemanager.de",
      "nativeads.com",
      "ntv.io",
      "postrelease.com",
      "navdmp.com",
      "navegg.com",
      "newscgp.com",
      "ad-srv.net",
      "netaffiliation.com",
      "netbina.com",
      "adelixir.com",
      "netelixir.com",
      "netmining.com",
      "netmng.com",
      "netpub.media",
      "cdnma.com",
      "net-results.com",
      "nr7.us",
      "mixpo.com",
      "newtention.net",
      "federatedmedia.net",
      "fmpub.net",
      "ibsys.com",
      "lakana.com",
      "nextdoor.com",
      "brainlyads.com",
      "nextmillmedia.com",
      "powerad.ai",
      "adroll.com",
      "1rx.io",
      "adconion.com",
      "amgdgt.com",
      "amobee.com",
      "euroclick.com",
      "gwallet.com",
      "lucidmedia.com",
      "po.st",
      "radiumone.com",
      "rhythmnewmedia.com",
      "rhythmone.com",
      "rhythmxchange.com",
      "scanscout.com",
      "tremorhub.com",
      "tremormedia.com",
      "tremorvideo.com",
      "turn.com",
      "unrulymedia.com",
      "yume.com",
      "yumenetworks.com",
      "exelate.com",
      "exelator.com",
      "imrworldwide.com",
      "vdna-assets.com",
      "visualdna.com",
      "fairfax.com.au",
      "fxj.com.au",
      "samurai-factory.jp",
      "shinobi.jp",
      "networkedblogs.com",
      "nitropay.com",
      "noktamedya.com",
      "virgul.com",
      "nordicdataresources.net",
      "stackla.com",
      "adleadevent.com",
      "mediavoice.com",
      "polarcdn-engine.com",
      "polarcdn-pentos.com",
      "polarcdn-terrax.com",
      "polarcdn.com",
      "polarmobile.com",
      "nrelate.com",
      "nrich.ai",
      "nuffnang.com",
      "nuffnang.com.my",
      "nugg.ad",
      "nuggad.net",
      "presage.io",
      "adohana.com",
      "ohana-media.com",
      "ohanaqb.com",
      "accuenmedia.com",
      "omnicomgroup.com",
      "omnisnippet1.com",
      "onaudience.com",
      "airpr.com",
      "guoshipartners.com",
      "onevision.com.tw",
      "onef.pro",
      "itsoneiota.com",
      "oneiota.co.uk",
      "onesignal.com",
      "onetag-sys.com",
      "oneupweb.com",
      "sodoit.com",
      "online-metrix.net",
      "adsafety.net",
      "onnetwork.tv",
      "spot.im",
      "spotim.market",
      "liftdna.com",
      "openx.com",
      "openx.net",
      "openx.org",
      "openxcdn.net",
      "openxenterprise.com",
      "pubnation.com",
      "servedbyopenx.com",
      "mobiletheory.com",
      "opera.com",
      "operamediaworks.com",
      "operasoftware.com",
      "opinary.com",
      "advg.jp",
      "opt.ne.jp",
      "p-advg.com",
      "opti-digital.com",
      "optify.net",
      "episerver.net",
      "optimizely.com",
      "optimumresponse.com",
      "optmd.com",
      "bkrtx.com",
      "bluekai.com",
      "en25.com",
      "estara.com",
      "grapeshot.co.uk",
      "maxymiser.com",
      "moat.com",
      "moatads.com",
      "moatpixel.com",
      "nexac.com",
      "responsys.com",
      "orbsrv.com",
      "otm-r.com",
      "otto.de",
      "ligatus.com",
      "outbrain.com",
      "outbrainimg.com",
      "sphere.com",
      "visualrevenue.com",
      "zemanta.com",
      "out-there-media.com",
      "affiliatly.com",
      "dsnextgen.com",
      "oversee.net",
      "ownpage.fr",
      "adconnexa.com",
      "adsbwm.com",
      "the-ozone-project.com",
      "paid-to-promote.net",
      "papayads.net",
      "pepperjam.com",
      "pjatr.com",
      "pjtra.com",
      "pntra.com",
      "pntrac.com",
      "pntrs.com",
      "iivt.com",
      "lzjl.com",
      "paypopup.com",
      "pbbl.co",
      "peer39.com",
      "peer39.net",
      "peerfly.com",
      "theweathernetwork.com",
      "performancing.com",
      "adtoll.com",
      "clickbooth.com",
      "legolas-media.com",
      "permodo.com",
      "permutive.app",
      "permutive.com",
      "prmutv.co",
      "pheedo.com",
      "cxense.com",
      "emediate.biz",
      "emediate.com",
      "emediate.dk",
      "emediate.eu",
      "hit-parade.com",
      "npttech.com",
      "pinpoll.com",
      "pixel.ad",
      "pixel.sg",
      "pixfuture.com",
      "piximedia.com",
      "pixlee.com",
      "turntonetworks.com",
      "platform-one.co.jp",
      "playground.xyz",
      "intergient.com",
      "playwire.com",
      "plista.com",
      "pocketcents.com",
      "popads.net",
      "popadscdn.net",
      "popcash.net",
      "poprule.com",
      "popunder.ru",
      "powerlinks.com",
      "2trk.info",
      "predictad.com",
      "blogads.com",
      "pressflex.com",
      "primis.tech",
      "sekindo.com",
      "privy.com",
      "proclivitymedia.com",
      "proclivitysystems.com",
      "pswec.com",
      "projectwonderful.com",
      "prometheusintelligencetechnology.com",
      "propellerads.com",
      "rtmark.net",
      "ad-score.com",
      "protected.media",
      "somoaudience.com",
      "publicidees.com",
      "adserver.com",
      "apmebf.com",
      "awltovhc.com",
      "cj.com",
      "conversantmedia.com",
      "dotomi.com",
      "dtmpub.com",
      "emjcd.com",
      "fastclick.com",
      "fastclick.net",
      "ftjcfx.com",
      "greystripe.com",
      "lduhtrp.net",
      "mczbf.com",
      "mediaplex.com",
      "qksz.com",
      "qksz.net",
      "runads.com",
      "rundsp.com",
      "tqlkg.com",
      "valueclick.com",
      "valueclick.net",
      "valueclickmedia.com",
      "yceml.net",
      "pch.com",
      "pubmatic.com",
      "revinet.com",
      "pbstck.com",
      "pubwise.io",
      "kanoodle.com",
      "pulse360.com",
      "seevast.com",
      "syndigonetworks.com",
      "contextweb.com",
      "datranmedia.com",
      "displaymarketplace.com",
      "pulsepoint.com",
      "p-n.io",
      "flocktory.com",
      "binlayer.com",
      "quantcast.com",
      "quantcount.com",
      "quantserve.com",
      "struq.com",
      "quantumdex.io",
      "qnsr.com",
      "qsstats.com",
      "quinstreet.com",
      "quisma.com",
      "quismatch.com",
      "xaded.com",
      "xmladed.com",
      "quora.com",
      "qwtag.com",
      "gsicommerce.com",
      "matchbin.com",
      "radiusmarketing.com",
      "linkshare.com",
      "linksynergy.com",
      "mediaforge.com",
      "nextperformance.com",
      "nxtck.com",
      "rakuten.com",
      "rmtag.com",
      "rambler.ru",
      "adthrive.com",
      "reaktion.com",
      "rebid.co",
      "rebuyengine.com",
      "redditstatic.com",
      "reduxmedia.com",
      "refersion.com",
      "convertglobal.com",
      "rekko.com",
      "reklamport.com",
      "reklamstore.com",
      "reklamz.com",
      "relestar.com",
      "relevad.com",
      "relevant-digital.com",
      "bumlam.com",
      "advertserve.com",
      "renegadeinternet.com",
      "buzzcity.com",
      "resetdigital.co",
      "nonstoppartner.net",
      "resolutionmedia.com",
      "reson8.com",
      "resonateinsights.com",
      "retargeter.com",
      "retargetly.com",
      "retirement-living.com",
      "omappapi.com",
      "optinmonster.com",
      "optnmstr.com",
      "revcontent.com",
      "revenuemax.de",
      "revtrax.com",
      "richaudience.com",
      "richrelevance.com",
      "rightaction.com",
      "mercent.com",
      "rmbn.net",
      "rmmonline.com",
      "getrockerbox.com",
      "dataxu.com",
      "dataxu.net",
      "mexad.com",
      "w55c.net",
      "rqtrk.eu",
      "rovion.com",
      "creativecdn.com",
      "rtbhouse.com",
      "rtbsystem.com",
      "rtk.io",
      "rudderlabs.com",
      "rutarget.ru",
      "saambaa.com",
      "sabavision.com",
      "reztrack.com",
      "sabre.com",
      "sabrehospitality.com",
      "shop.pe",
      "sail-horizon.com",
      "sail-personalize.com",
      "evergage.com",
      "krux.com",
      "kruxdigital.com",
      "krxd.net",
      "leadforce1.com",
      "mybuys.com",
      "plugin.management",
      "samba.tv",
      "adgear.com",
      "adgrx.com",
      "runadtag.com",
      "emarsys.net",
      "gigcount.com",
      "leadformix.com",
      "scarabresearch.com",
      "sape.ru",
      "bridgetrack.com",
      "sapient.com",
      "aimatch.com",
      "sas.com",
      "saymedia.com",
      "scandinavianadnetworks.com",
      "reflow.tv",
      "scribol.com",
      "sda.fyi",
      "searchforce.com",
      "searchforce.net",
      "seedtag.com",
      "selectmedia.asia",
      "semantiqo.com",
      "rtactivate.com",
      "sendpulse.com",
      "seoptiks.com",
      "servenobid.com",
      "sevenads.net",
      "sexinyourcity.com",
      "libertystmedia.com",
      "shareasale.com",
      "districtm.io",
      "sharethrough.com",
      "nowspots.com",
      "xiaoyuanzhao.com",
      "getshogun.com",
      "shopzilla.com",
      "shorte.st",
      "viralize.tv",
      "chocolateplatform.com",
      "ivdopia.com",
      "vdopia.com",
      "simpli.fi",
      "extend.tv",
      "zypmedia.com",
      "singular.net",
      "sng.link",
      "cookieless-data.com",
      "sddan.com",
      "adswizz.com",
      "kenshoo.com",
      "xg4ken.com",
      "skupenet.com",
      "slunecnice.cz",
      "smartclip.com",
      "smartclip.net",
      "ck-ie.com",
      "smartyads.com",
      "smi2.ru",
      "smile.io",
      "smilewanted.com",
      "smowtion.com",
      "sc-static.net",
      "snapchat.com",
      "snapengage.com",
      "cdnsnapwidget.com",
      "snapwidget.com",
      "snigelweb.com",
      "ratevoice.com",
      "photorank.me",
      "sociomantic.com",
      "socital.com",
      "sojern.com",
      "ladsp.com",
      "sonobi.com",
      "sophus3.com",
      "lijit.com",
      "prosperent.com",
      "s-onetag.com",
      "smrtb.com",
      "sovrn.com",
      "viglink.com",
      "spacechimpmedia.com",
      "adbutler.com",
      "sparklit.com",
      "sparkstudios.com",
      "spectate.com",
      "sponsorads.de",
      "sportradarserving.com",
      "wowanalytics.co.uk",
      "springserve.com",
      "nanigans.com",
      "stackadapt.com",
      "stamped.io",
      "stargamesaffiliate.com",
      "storygize.com",
      "storygize.net",
      "cams.com",
      "streamray.com",
      "strikead.com",
      "stripchat.com",
      "stripst.com",
      "strpst.com",
      "xlivrdr.com",
      "stripe.network",
      "popularmedia.com",
      "suite66.com",
      "summitmedia.co.uk",
      "adclickmedia.com",
      "sundaysky.com",
      "sunmedia.tv",
      "socdm.com",
      "survicate.com",
      "switchadhub.com",
      "switchconcepts.co.uk",
      "switchconcepts.com",
      "swoop.com",
      "cdn-sitegainer.com",
      "sitegainer.com",
      "technorati.com",
      "technoratimedia.com",
      "clickable.net",
      "syncapse.com",
      "t13.io",
      "connexity.com",
      "connexity.net",
      "perfectmarket.com",
      "pricegrabber.com",
      "skimlinks.com",
      "skimresources.com",
      "taboola.com",
      "tailsweep.com",
      "pghub.io",
      "tapad.com",
      "tapit.com",
      "tap.me",
      "tappx.com",
      "taptapnetworks.com",
      "targetix.net",
      "brid.tv",
      "tchibo.de",
      "brainient.com",
      "ebuzzing.com",
      "teads.tv",
      "teamblue.services",
      "tellapart.com",
      "telstra.com.au",
      "terra.com.br",
      "tncid.app",
      "hittail.com",
      "medialead.de",
      "adbrain.com",
      "adbrn.com",
      "adsrvr.org",
      "thetradedesk.com",
      "uidapi.com",
      "thismoment.com",
      "convertbox.com",
      "thrtle.com",
      "sensis.com.au",
      "sensisdata.com.au",
      "tiktok.com",
      "tiktokv.us",
      "clmbtech.com",
      "tiqiq.com",
      "tisoomi.com",
      "tlvmedia.com",
      "adoftheyear.com",
      "metrixlab.com",
      "opinionbar.com",
      "clickfuse.com",
      "tonemedia.com",
      "tail.digital",
      "tailtarget.com",
      "tp88trk.com",
      "trackingsoft.com",
      "tradedoubler.com",
      "tradetracker.com",
      "tradetracker.net",
      "traffichaus.com",
      "traffichouse.com",
      "traffic-media.co.uk",
      "trafficscore.com",
      "trafficfactory.biz",
      "trafficfactory.com",
      "tsyndicate.com",
      "trafmag.com",
      "adadvisor.net",
      "aggregateknowledge.com",
      "agkn.com",
      "brighttag.com",
      "btstatic.com",
      "neustar.biz",
      "thebrighttag.com",
      "truoptik.com",
      "traversedlp.com",
      "traveladvertising.com",
      "treasuredata.com",
      "trendemon.com",
      "triggit.com",
      "addme.com",
      "3lift.com",
      "opecloud.com",
      "triplelift.com",
      "tru.am",
      "adlegend.com",
      "trueffect.com",
      "truffle.bid",
      "trustedsite.com",
      "trustpilot.com",
      "trustx.org",
      "trvdp.com",
      "ttarget.ru",
      "programattik.com",
      "buzzlogic.com",
      "twelvefold.com",
      "segment.com",
      "ads-twitter.com",
      "t.co",
      "twyn.com",
      "goldbach.com",
      "goldbachgroup.com",
      "tyroo.com",
      "aralego.com",
      "ucfunnel.com",
      "unanimis.co.uk",
      "unblockia.com",
      "ubembed.com",
      "unbounce.com",
      "udmserve.net",
      "underdogmedia.com",
      "undertone.com",
      "51network.com",
      "wanmo.com",
      "adeurope.com",
      "uimserv.net",
      "supersonicads.com",
      "yellowblue.io",
      "augme.com",
      "hipcricket.com",
      "leadlander.com",
      "localytics.com",
      "trackalyzer.com",
      "upravel.com",
      "upsellit.com",
      "up-value.de",
      "survata.com",
      "utarget.ru",
      "valuead.com",
      "adimg.net",
      "adlantis.jp",
      "buzzparadise.com",
      "amigos.com",
      "getiton.com",
      "medley.com",
      "nostringsattached.com",
      "various.com",
      "admicro.vn",
      "vcmedia.vn",
      "adotube.com",
      "exponential.com",
      "fulltango.com",
      "tribalfusion.com",
      "vdx.tv",
      "veeseo.com",
      "adsvelocity.com",
      "mobclix.com",
      "velti.com",
      "adinplay.com",
      "venatusmedia.com",
      "veoxa.com",
      "veremedia.com",
      "brand.net",
      "maxpointinteractive.com",
      "mxptint.net",
      "versium.com",
      "verticalhealth.net",
      "verticalresponse.com",
      "vresp.com",
      "lkqd.com",
      "lkqd.net",
      "smaato.com",
      "smaato.net",
      "viafoura.co",
      "viafoura.net",
      "adelphic.com",
      "adviva.net",
      "ipredictive.com",
      "sitemeter.com",
      "specificclick.net",
      "specificmedia.co.uk",
      "specificmedia.com",
      "vindicosuite.com",
      "intellitxt.com",
      "picadmedia.com",
      "vibrantmedia.com",
      "vic-m.co",
      "vidazoo.com",
      "videoamp.com",
      "vi.ai",
      "vidoomy.com",
      "viewbix.com",
      "adition.com",
      "yieldlab.de",
      "yieldlab.net",
      "visarity.com",
      "visbrands.com",
      "vizury.com",
      "vocento.com",
      "vocstatic.com",
      "nytrng.com",
      "vrtcal.com",
      "vserv.com",
      "vserv.mobi",
      "vtex.com.br",
      "mediabong.com",
      "contentwidgets.net",
      "wahoha.com",
      "addynamix.com",
      "adchemy.com",
      "adsnative.com",
      "getpolymorph.com",
      "warumbistdusoarm.space",
      "wayfair.com",
      "zedo.com",
      "zincx.com",
      "feedperfect.com",
      "web.com",
      "goutee.top",
      "webmecanik.com",
      "dsmmadvantage.com",
      "weborama.com",
      "weborama.fr",
      "webtraffic.se",
      "wiredminds.com",
      "wiredminds.de",
      "wisepops.com",
      "wisepops.net",
      "wishabi.com",
      "wishabi.net",
      "wistia.com",
      "wordstream.com",
      "wpadmngr.com",
      "accelerator-media.com",
      "decdna.net",
      "decideinteractive.com",
      "gmads.net",
      "groupm.com",
      "kantarmedia.com",
      "mecglobal.com",
      "mindshare.nl",
      "mookie1.com",
      "pm14.com",
      "realmedia.com",
      "themig.com",
      "xaxis.com",
      "adonnetwork.com",
      "primevisibility.com",
      "urtbk.com",
      "bounceexchange.com",
      "bouncex.com",
      "bouncex.net",
      "wknd.ai",
      "wunderkind.co",
      "admanager-xertive.com",
      "xertivemedia.com",
      "webtraxs.com",
      "adplan-ds.com",
      "adinterax.com",
      "adrevolver.com",
      "ads.yahoo.com",
      "adserver.yahoo.com",
      "adsonar.com",
      "adtech.com",
      "adtech.de",
      "adtechjp.com",
      "adtechus.com",
      "advertising.com",
      "advertising.yahoo.com",
      "aolcloud.net",
      "atwola.com",
      "bluelithium.com",
      "brightroll.com",
      "btrll.com",
      "dapper.net",
      "flurry.com",
      "interclick.com",
      "joystiq.com",
      "js7k.com",
      "jumptap.com",
      "marketingsolutions.yahoo.com",
      "mydas.mobi",
      "nexage.com",
      "oath.com",
      "overture.com",
      "patch.com",
      "pictela.com",
      "pictela.net",
      "rightmedia.com",
      "rmxads.com",
      "tacoda.net",
      "vidible.tv",
      "yahoo.net",
      "ybp.yahoo.com",
      "yieldmanager.com",
      "yieldmanager.net",
      "yldmgrimg.net",
      "adfox.ru",
      "adfox.yandex.ru",
      "an.yandex.ru",
      "awaps.yandex.ru",
      "mc.yandex.md",
      "mc.yandex.ru",
      "moikrug.ru",
      "web-visor.com",
      "webvisor.com",
      "webvisor.org",
      "yandex.ru/ads",
      "yandex.ru/clck/click",
      "yandex.ru/clck/counter",
      "yandex.ru/cycounter",
      "yandex.ru/portal/set/any",
      "yandex.ru/set/s/rsya-tag-users/data",
      "clientgear.com",
      "attracto.com",
      "clickhype.com",
      "yellowhammermg.com",
      "yhmg.com",
      "yesads.com",
      "yieldads.com",
      "yldbt.com",
      "yieldbuild.com",
      "yieldify.com",
      "yieldlove-ad-serving.net",
      "yieldmo.com",
      "visx.net",
      "yoc-performance.com",
      "yoc.com",
      "p.yotpo.com",
      "youknowbest.com",
      "affasi.com",
      "gw-ec.com",
      "zaful.com",
      "zaparena.com",
      "zatnoh.com",
      "adpushup.com",
      "zeotap.com",
      "insightgrit.com",
      "boomtrain.com",
      "ignitionone.com",
      "ignitionone.net",
      "rezync.com",
      "rfihub.com",
      "rfihub.net",
      "rocketfuel.com",
      "ru4.com",
      "searchignite.com",
      "xplusone.com",
      "netshelter.com",
      "netshelter.net",
      "clickagy.com",
      "zumobi.com",
      "adobe.com",
      "scene7.com",
      "typekit.com",
      "affirm.com",
      "techlab-cdn.com",
      "amazon.com",
      "cloudfront.net",
      "twitch.tv",
      "anyclip.com",
      "gravatar.com",
      "tumblr.com",
      "wp.com",
      "searchspring.io",
      "bazaarvoice.com",
      "brightcove.com",
      "zencdn.net",
      "browser-update.org",
      "cloudflare.com",
      "cloudflarestream.com",
      "cloudinary.com",
      "org.coveo.com",
      "platform-eu.cloud.coveo.com",
      "platform.cloud.coveo.com",
      "static.cloud.coveo.com",
      "fundraiseup.com",
      "blogger.com",
      "ggpht.com",
      "google.ad",
      "google.ae",
      "google.al",
      "google.am",
      "google.as",
      "google.at",
      "google.az",
      "google.ba",
      "google.be",
      "google.bf",
      "google.bg",
      "google.bi",
      "google.bj",
      "google.bs",
      "google.bt",
      "google.by",
      "google.ca",
      "google.cat",
      "google.cd",
      "google.cf",
      "google.cg",
      "google.ch",
      "google.ci",
      "google.cl",
      "google.cm",
      "google.cn",
      "google.co.ao",
      "google.co.bw",
      "google.co.ck",
      "google.co.cr",
      "google.co.id",
      "google.co.il",
      "google.co.in",
      "google.co.jp",
      "google.co.ke",
      "google.co.kr",
      "google.co.ls",
      "google.co.ma",
      "google.co.mz",
      "google.co.nz",
      "google.co.th",
      "google.co.tz",
      "google.co.ug",
      "google.co.uk",
      "google.co.uz",
      "google.co.ve",
      "google.co.vi",
      "google.co.za",
      "google.co.zm",
      "google.co.zw",
      "google.com",
      "google.com.af",
      "google.com.ag",
      "google.com.ai",
      "google.com.ar",
      "google.com.au",
      "google.com.bd",
      "google.com.bh",
      "google.com.bn",
      "google.com.bo",
      "google.com.br",
      "google.com.bz",
      "google.com.co",
      "google.com.cu",
      "google.com.cy",
      "google.com.do",
      "google.com.ec",
      "google.com.eg",
      "google.com.et",
      "google.com.fj",
      "google.com.gh",
      "google.com.gi",
      "google.com.gt",
      "google.com.hk",
      "google.com.jm",
      "google.com.kh",
      "google.com.kw",
      "google.com.lb",
      "google.com.ly",
      "google.com.mm",
      "google.com.mt",
      "google.com.mx",
      "google.com.my",
      "google.com.na",
      "google.com.nf",
      "google.com.ng",
      "google.com.ni",
      "google.com.np",
      "google.com.om",
      "google.com.pa",
      "google.com.pe",
      "google.com.pg",
      "google.com.ph",
      "google.com.pk",
      "google.com.pr",
      "google.com.py",
      "google.com.qa",
      "google.com.sa",
      "google.com.sb",
      "google.com.sg",
      "google.com.sl",
      "google.com.sv",
      "google.com.tj",
      "google.com.tr",
      "google.com.tw",
      "google.com.ua",
      "google.com.uy",
      "google.com.vc",
      "google.com.vn",
      "google.cv",
      "google.cz",
      "google.de",
      "google.dj",
      "google.dk",
      "google.dm",
      "google.dz",
      "google.ee",
      "google.es",
      "google.fi",
      "google.fm",
      "google.fr",
      "google.ga",
      "google.ge",
      "google.gg",
      "google.gl",
      "google.gm",
      "google.gp",
      "google.gr",
      "google.gy",
      "google.hn",
      "google.hr",
      "google.ht",
      "google.hu",
      "google.ie",
      "google.im",
      "google.iq",
      "google.is",
      "google.it",
      "google.je",
      "google.jo",
      "google.kg",
      "google.ki",
      "google.kz",
      "google.la",
      "google.li",
      "google.lk",
      "google.lt",
      "google.lu",
      "google.lv",
      "google.md",
      "google.me",
      "google.mg",
      "google.mk",
      "google.ml",
      "google.mn",
      "google.ms",
      "google.mu",
      "google.mv",
      "google.mw",
      "google.ne",
      "google.nl",
      "google.no",
      "google.nr",
      "google.nu",
      "google.pl",
      "google.pn",
      "google.ps",
      "google.pt",
      "google.ro",
      "google.rs",
      "google.ru",
      "google.rw",
      "google.sc",
      "google.se",
      "google.sh",
      "google.si",
      "google.sk",
      "google.sm",
      "google.sn",
      "google.so",
      "google.st",
      "google.td",
      "google.tg",
      "google.tk",
      "google.tl",
      "google.tm",
      "google.tn",
      "google.to",
      "google.tt",
      "google.vg",
      "google.vu",
      "google.ws",
      "googleapis.com",
      "googleusercontent.com",
      "googlevideo.com",
      "gstatic.com",
      "recaptcha.net",
      "youtube-nocookie.com",
      "youtube.com",
      "imgix.net",
      "jwpcdn.com",
      "jwplatform.com",
      "jwplayer.com",
      "jwpsrv.com",
      "kaltura.com",
      "yimg.jp",
      "mcafee.com",
      "cdninstagram.com",
      "fbcdn.net",
      "instagram.com",
      "azure.com",
      "azurefd.net",
      "bing.com",
      "dynamics.com",
      "microsoft.com",
      "msn.com",
      "nuance.com",
      "skype.com",
      "typepad.com",
      "oracle.com",
      "pinimg.com",
      "pinterest.com",
      "gigya.com",
      "shop.app",
      "shopifyapps.com",
      "shopifysvc.com",
      "flickr.com",
      "staticflickr.com",
      "trumba.com",
      "uservoice.com",
      "vgwort.de",
      "vimeo.com",
      "vimeocdn.com",
      "my.mail.ru",
      "5min.com",
      "aolcdn.com",
      "winamp.com",
      "yahoo.com",
      "yahooapis.com",
      "yimg.com",
      "kinopoisk.ru",
      "yandex.by",
      "yandex.com",
      "yandex.com.tr",
      "yandex.net",
      "yandex.ru",
      "yandex.st",
      "montwam.top",
      "adsco.re",
      "bluecava.com",
      "pxlclnmdecom-a.akamaihd.net",
      "amocrm.ru",
      "aamapi.com",
      "aamapiv2.com",
      "aamsitecertifier.com",
      "auditedmedia.com",
      "betssonpalantir.com",
      "browseranalytic.com",
      "leadtrackingdata.com",
      "fpnpmcdn.net",
      "openfpcdn.io",
      "answerscloud.com",
      "foresee.com",
      "antifraudjs.friends2follow.com",
      "geetest.com",
      "graphenedigitalanalytics.in",
      "hotelchamp.com",
      "perimeterx.net",
      "px-cloud.net",
      "imedia.cz",
      "hcaptcha.com",
      "islay.tech",
      "itch.io",
      "k-analytix.com",
      "konduto.com",
      "ztsrv.com",
      "maxmind.com",
      "mmapiws.com",
      "mercadopago.com",
      "negishim.org",
      "nofraud.com",
      "notolytix.com",
      "simility.com",
      "pixanalytics.com",
      "perfdrive.com",
      "thirdwatch.ai",
      "rollick.io",
      "sardine.ai",
      "sift.com",
      "siftscience.com",
      "signifyd.com",
      "24smi.net",
      "storeland.ru",
      "techsolutions.com.tw",
      "fraudmetrix.cn",
      "tongdun.net",
      "tracify.ai",
      "friendshipmale.com",
      "unseenreport.com",
      "sf14g.com",
      "xfyun.cn",
      "yoox.it",
      "zipmoney.com.au",
      "avantmetrics.com",
      "doubleverify.com",
      "developers.google.com",
      "gmail.com",
      "google-analytics.com",
      "googlemail.com",
      "plus.google.com",
      "plusone.google.com",
      "postrank.com",
      "smartlock.google.com",
      "voice.google.com",
      "y-track.com",
      "atdmt.com",
      "facebook.com",
      "facebook.net",
      "fb.com",
      "fbsbx.com",
      "friendfeed.com",
      "kissmetrics.com",
      "polen.com.br",
      "flightzy.date",
      "zymerget.bid",
      "authedmine.com",
      "bmst.pw",
      "cashbeet.com",
      "serv1swork.com",
      "coinpot.co",
      "cryptaloot.pro",
      "crypto-loot.com",
      "gitgrub.pro",
      "reauthenticator.com",
      "statdynamic.com",
      "webmine.pro",
      "crypto-webminer.com",
      "ethtrader.de",
      "adless.io",
      "freecontent.date",
      "freecontent.stream",
      "hashing.win",
      "hostingcloud.racing",
      "hostingcloud.science",
      "jsecoin.com",
      "analytics.blue",
      "besstahete.info",
      "feesocrald.com",
      "gramombird.com",
      "istlandoll.com",
      "mepirtedic.com",
      "pampopholf.com",
      "tercabilis.info",
      "tulip18.com",
      "minescripts.info",
      "nerohut.com",
      "service4refresh.info",
      "sparechange.io",
      "swiftmining.win",
      "authedwebmine.cz",
      "webmine.cz",
      "webminepool.com",
      "webmining.co"
    ]
  }
};
const getBlockedHosts = (preferences) => {
  if (!preferences) {
    return Object.values(trackers.categories).flat();
  }
  const blockedHosts = [];
  if (!preferences.Analytics) {
    blockedHosts.push(...trackers.categories.Analytics);
  }
  if (!preferences.Social) {
    blockedHosts.push(...trackers.categories.Social);
  }
  if (!preferences.Advertising) {
    blockedHosts.push(...trackers.categories.Advertising);
  }
  return [...new Set(blockedHosts)];
};
const getBlockedKeywords = (preferences) => {
  if (!preferences) {
    return Object.values(trackers.categories).flat().map((host) => host.replace(/\.[^.]+$/, ""));
  }
  const blockedHosts = getBlockedHosts(preferences);
  const keywords = [
    ...new Set(blockedHosts.map((host) => host.replace(/\.[^.]+$/, "")))
  ];
  return keywords;
};
const DEFAULT_TRANSLATIONS = {
  title: "We use cookies",
  message: "We use cookies to ensure the best experience, understand how the site is used, and support basic functionality. You can choose to accept all cookies or adjust your settings.",
  buttonText: "Accept",
  declineButtonText: "Decline",
  manageButtonText: "Manage Cookies",
  privacyPolicyText: "Privacy Policy",
  manageTitle: "Cookie Preferences",
  manageMessage: "Manage your cookie preferences below. Essential cookies are always enabled as they are necessary for the website to function properly.",
  manageEssentialTitle: "Essential",
  manageEssentialSubtitle: "Required for the website to function properly",
  manageEssentialStatus: "Status: Always enabled",
  manageEssentialStatusButtonText: "Always On",
  manageAnalyticsTitle: "Analytics",
  manageAnalyticsSubtitle: "Help us understand how visitors interact with our website",
  manageSocialTitle: "Social",
  manageSocialSubtitle: "Enable social media features and sharing",
  manageAdvertTitle: "Advertising",
  manageAdvertSubtitle: "Personalize advertisements and measure their performance",
  manageCookiesStatus: "Status: {{status}} on {{date}}",
  manageCookiesStatusConsented: "Consented",
  manageCookiesStatusDeclined: "Declined",
  manageCancelButtonText: "Cancel",
  manageSaveButtonText: "Save Preferences"
};
function getTranslationValue(tObject, key, params) {
  if (params) {
    return Object.keys(params).reduce((acc, param) => {
      return acc.replace(
        new RegExp(`{{\\s*${param}\\s*}}`, "g"),
        params[param]
      );
    }, tObject[key]);
  }
  return tObject[key];
}
function createTFunction(translations, translationI18NextPrefix) {
  if (typeof translations === "function") {
    return (key, params) => {
      const fullKey = `${translationI18NextPrefix || ""}${key}`;
      let i18nValue = translations(fullKey, params);
      if (i18nValue === fullKey) {
        i18nValue = null;
      }
      return i18nValue || getTranslationValue(DEFAULT_TRANSLATIONS, key, params);
    };
  }
  return (key, params) => {
    return getTranslationValue(
      { ...DEFAULT_TRANSLATIONS, ...translations || {} },
      key,
      params
    );
  };
}
let originalXhrOpen = null;
let originalFetch = null;
const blockTrackingRequests = (blockedHosts) => {
  if (!originalXhrOpen) {
    originalXhrOpen = XMLHttpRequest.prototype.open;
  }
  if (!originalFetch) {
    originalFetch = window.fetch;
  }
  XMLHttpRequest.prototype.open = function(method, url) {
    const urlString = url.toString();
    if (blockedHosts.some((host) => urlString.includes(host))) {
      console.debug(`[CookieKit] Blocked XMLHttpRequest to: ${urlString}`);
      throw new Error(`Request to ${urlString} blocked by consent settings`);
    }
    return originalXhrOpen.apply(this, arguments);
  };
  window.fetch = function(url, options) {
    const urlString = url.toString();
    if (typeof urlString === "string" && blockedHosts.some((host) => urlString.includes(host))) {
      console.debug(`[CookieKit] Blocked fetch request to: ${urlString}`);
      return Promise.resolve(
        new Response(null, {
          status: 403,
          statusText: "Blocked by consent settings"
        })
      );
    }
    return originalFetch.apply(this, arguments);
  };
};
const restoreOriginalRequests = () => {
  if (originalXhrOpen) {
    XMLHttpRequest.prototype.open = originalXhrOpen;
  }
  if (originalFetch) {
    window.fetch = originalFetch;
  }
};
const applyWrapperStyles = (wrapper, width = "100%", height = "315px") => {
  wrapper.style.position = "relative";
  wrapper.style.width = width;
  wrapper.style.height = height;
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.backgroundColor = "rgba(31, 41, 55, 0.95)";
  wrapper.style.borderRadius = "6px";
  wrapper.style.border = "1px solid #4b5563";
  wrapper.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  wrapper.style.overflow = "hidden";
  wrapper.style.backdropFilter = "blur(4px)";
  wrapper.style.textAlign = "center";
  wrapper.style.color = "#f3f4f6";
  wrapper.style.fontSize = "14px";
  wrapper.style.lineHeight = "1.4";
  wrapper.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
};
const createPlaceholderContent = (placeholderId) => {
  return `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 16px; width: 100%; max-width: 95%; box-sizing: border-box;">
      <div style="margin-bottom: 8px; font-size: 28px;">🔒</div>
      <h3 style="font-size: 16px; margin: 0 0 8px 0; font-weight: bold; color: white;">Content Blocked</h3>
      <p style="margin: 0 0 8px 0; font-size: 14px;">This content requires cookies that are currently blocked by your privacy settings. This embedded content may track your activity.</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #d1d5db;">After accepting cookies, please refresh the page to view this content.</p>
      <div id="cookie-settings-${placeholderId}" style="margin-top: 10px; background-color: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s ease; display: inline-block;">
        Manage Cookie Settings
      </div>
    </div>
  `;
};
const addSettingsButtonListeners = (placeholderId) => {
  const settingsButton = document.getElementById(
    `cookie-settings-${placeholderId}`
  );
  if (settingsButton) {
    settingsButton.addEventListener("mouseover", () => {
      settingsButton.style.backgroundColor = "#2563eb";
    });
    settingsButton.addEventListener("mouseout", () => {
      settingsButton.style.backgroundColor = "#3b82f6";
    });
    settingsButton.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("show-cookie-consent"));
    });
  }
};
const positionIframeAbsolutely = (iframe) => {
  iframe.style.position = "absolute";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.visibility = "hidden";
  iframe.style.zIndex = "-1";
};
const createContentPlaceholder = (iframe, originalSrc) => {
  const placeholderId = `cookie-blocked-content-${Math.random().toString(36).substring(2, 11)}`;
  const parentElement = iframe.parentElement;
  if (!parentElement) {
    throw new Error("Iframe has no parent element");
  }
  iframe.setAttribute("data-cookie-blocked", "true");
  iframe.setAttribute("data-original-src", originalSrc);
  iframe.src = "about:blank";
  const wrapper = document.createElement("div");
  applyWrapperStyles(
    wrapper,
    iframe.style.width || "100%",
    iframe.style.height || "315px"
  );
  wrapper.innerHTML = createPlaceholderContent(placeholderId);
  const placeholderElement = document.createElement("div");
  placeholderElement.id = placeholderId;
  placeholderElement.className = "cookie-consent-blocked-iframe";
  placeholderElement.setAttribute("data-cookie-consent-placeholder", "true");
  placeholderElement.setAttribute("data-blocked-src", originalSrc);
  placeholderElement.style.display = "none";
  parentElement.insertBefore(wrapper, iframe);
  positionIframeAbsolutely(iframe);
  wrapper.appendChild(iframe);
  wrapper.appendChild(placeholderElement);
  addSettingsButtonListeners(placeholderId);
  return wrapper;
};
const blockTrackingScripts = (trackingKeywords) => {
  document.querySelectorAll("script").forEach((script) => {
    if (script.src && trackingKeywords.some((keyword) => script.src.includes(keyword))) {
      script.remove();
    }
  });
  document.querySelectorAll("iframe").forEach((iframe) => {
    if (iframe.src && trackingKeywords.some((keyword) => iframe.src.includes(keyword))) {
      createContentPlaceholder(iframe, iframe.src);
    }
  });
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.tagName === "SCRIPT") {
          const src = node.getAttribute("src");
          if (src && trackingKeywords.some((keyword) => src.includes(keyword))) {
            node.remove();
          }
        }
        if (node instanceof HTMLElement && node.tagName === "IFRAME") {
          const src = node.getAttribute("src");
          if (src && trackingKeywords.some((keyword) => src.includes(keyword))) {
            createContentPlaceholder(node, src);
          }
        }
      });
    });
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  return observer;
};
const ensurePlaceholdersVisible = () => {
  const placeholders = document.querySelectorAll(
    '[data-cookie-consent-placeholder="true"]'
  );
  if (placeholders.length > 0) {
    placeholders.forEach((placeholder) => {
      if (placeholder instanceof HTMLElement) {
        placeholder.style.display = "flex";
        placeholder.style.visibility = "visible";
        placeholder.style.opacity = "1";
        placeholder.style.zIndex = "100";
        const wrapper = placeholder.parentElement;
        if (wrapper) {
          applyWrapperStyles(wrapper);
          const hasContent = wrapper.querySelector(".cookie-consent-wrapper-content") !== null || wrapper.innerHTML.includes("Content Blocked");
          if (!hasContent) {
            const placeholderId = placeholder.id || `cookie-blocked-content-${Math.random().toString(36).substring(2, 11)}`;
            placeholder.getAttribute("data-blocked-src") || "unknown source";
            wrapper.innerHTML = createPlaceholderContent(placeholderId);
            wrapper.appendChild(placeholder);
            const iframe2 = wrapper.querySelector(
              "iframe"
            );
            if (iframe2) {
              positionIframeAbsolutely(iframe2);
              if (iframe2.src !== "about:blank" && iframe2.hasAttribute("data-original-src")) {
                iframe2.src = "about:blank";
              }
              wrapper.appendChild(iframe2);
            }
            addSettingsButtonListeners(placeholderId);
          }
          const iframe = wrapper.querySelector(
            "iframe"
          );
          if (iframe) {
            positionIframeAbsolutely(iframe);
            if (iframe.src !== "about:blank" && iframe.hasAttribute("data-original-src")) {
              iframe.src = "about:blank";
            }
          }
        }
      }
    });
  }
};
class CookieBlockingManager {
  constructor() {
    this.observerRef = null;
    this.intervalId = null;
  }
  /**
   * Initializes cookie blocking based on user preferences
   * @param blockedHosts Array of hosts to block
   * @param blockedKeywords Array of keywords to block in scripts and iframes
   */
  initialize(blockedHosts, blockedKeywords) {
    if (blockedHosts.length > 0) {
      blockTrackingRequests(blockedHosts);
    }
    if (blockedKeywords.length > 0) {
      this.observerRef = blockTrackingScripts(blockedKeywords);
      this.startPlaceholderVisibilityCheck();
    }
  }
  /**
   * Starts a periodic check to ensure placeholders remain visible
   */
  startPlaceholderVisibilityCheck() {
    ensurePlaceholdersVisible();
    this.intervalId = window.setInterval(ensurePlaceholdersVisible, 2e3);
  }
  /**
   * Cleans up all cookie blocking functionality
   */
  cleanup() {
    restoreOriginalRequests();
    if (this.observerRef) {
      this.observerRef.disconnect();
      this.observerRef = null;
    }
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
const setCookie = (name, value, days) => {
  if (typeof window === "undefined") return;
  const date = /* @__PURE__ */ new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1e3);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
};
const getCookie = (name) => {
  var _a;
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return ((_a = parts.pop()) == null ? void 0 : _a.split(";").shift()) || null;
  }
  return null;
};
const deleteCookie = (name) => {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};
const timezoneToCountryCodeMap = {
  "Africa/Abidjan": {
    u: 0,
    c: ["CI", "BF", "GH", "GM", "GN", "ML", "MR", "SH", "SL", "SN", "TG"]
  },
  "Africa/Accra": {
    a: "Africa/Abidjan",
    c: ["GH"],
    r: 1
  },
  "Africa/Addis_Ababa": {
    a: "Africa/Nairobi",
    c: ["ET"],
    r: 1
  },
  "Africa/Algiers": {
    u: 60,
    c: ["DZ"]
  },
  "Africa/Asmara": {
    a: "Africa/Nairobi",
    c: ["ER"],
    r: 1
  },
  "Africa/Asmera": {
    a: "Africa/Nairobi",
    c: ["ER"],
    r: 1
  },
  "Africa/Bamako": {
    a: "Africa/Abidjan",
    c: ["ML"],
    r: 1
  },
  "Africa/Bangui": {
    a: "Africa/Lagos",
    c: ["CF"],
    r: 1
  },
  "Africa/Banjul": {
    a: "Africa/Abidjan",
    c: ["GM"],
    r: 1
  },
  "Africa/Bissau": {
    u: 0,
    c: ["GW"]
  },
  "Africa/Blantyre": {
    a: "Africa/Maputo",
    c: ["MW"],
    r: 1
  },
  "Africa/Brazzaville": {
    a: "Africa/Lagos",
    c: ["CG"],
    r: 1
  },
  "Africa/Bujumbura": {
    a: "Africa/Maputo",
    c: ["BI"],
    r: 1
  },
  "Africa/Cairo": {
    u: 120,
    c: ["EG"]
  },
  "Africa/Casablanca": {
    u: 60,
    d: 0,
    c: ["MA"]
  },
  "Africa/Ceuta": {
    u: 60,
    d: 120,
    c: ["ES"]
  },
  "Africa/Conakry": {
    a: "Africa/Abidjan",
    c: ["GN"],
    r: 1
  },
  "Africa/Dakar": {
    a: "Africa/Abidjan",
    c: ["SN"],
    r: 1
  },
  "Africa/Dar_es_Salaam": {
    a: "Africa/Nairobi",
    c: ["TZ"],
    r: 1
  },
  "Africa/Djibouti": {
    a: "Africa/Nairobi",
    c: ["DJ"],
    r: 1
  },
  "Africa/Douala": {
    a: "Africa/Lagos",
    c: ["CM"],
    r: 1
  },
  "Africa/El_Aaiun": {
    u: 60,
    d: 0,
    c: ["EH"]
  },
  "Africa/Freetown": {
    a: "Africa/Abidjan",
    c: ["SL"],
    r: 1
  },
  "Africa/Gaborone": {
    a: "Africa/Maputo",
    c: ["BW"],
    r: 1
  },
  "Africa/Harare": {
    a: "Africa/Maputo",
    c: ["ZW"],
    r: 1
  },
  "Africa/Johannesburg": {
    u: 120,
    c: ["ZA", "LS", "SZ"]
  },
  "Africa/Juba": {
    u: 120,
    c: ["SS"]
  },
  "Africa/Kampala": {
    a: "Africa/Nairobi",
    c: ["UG"],
    r: 1
  },
  "Africa/Khartoum": {
    u: 120,
    c: ["SD"]
  },
  "Africa/Kigali": {
    a: "Africa/Maputo",
    c: ["RW"],
    r: 1
  },
  "Africa/Kinshasa": {
    a: "Africa/Lagos",
    c: ["CD"],
    r: 1
  },
  "Africa/Lagos": {
    u: 60,
    c: ["NG", "AO", "BJ", "CD", "CF", "CG", "CM", "GA", "GQ", "NE"]
  },
  "Africa/Libreville": {
    a: "Africa/Lagos",
    c: ["GA"],
    r: 1
  },
  "Africa/Lome": {
    a: "Africa/Abidjan",
    c: ["TG"],
    r: 1
  },
  "Africa/Luanda": {
    a: "Africa/Lagos",
    c: ["AO"],
    r: 1
  },
  "Africa/Lubumbashi": {
    a: "Africa/Maputo",
    c: ["CD"],
    r: 1
  },
  "Africa/Lusaka": {
    a: "Africa/Maputo",
    c: ["ZM"],
    r: 1
  },
  "Africa/Malabo": {
    a: "Africa/Lagos",
    c: ["GQ"],
    r: 1
  },
  "Africa/Maputo": {
    u: 120,
    c: ["MZ", "BI", "BW", "CD", "MW", "RW", "ZM", "ZW"]
  },
  "Africa/Maseru": {
    a: "Africa/Johannesburg",
    c: ["LS"],
    r: 1
  },
  "Africa/Mbabane": {
    a: "Africa/Johannesburg",
    c: ["SZ"],
    r: 1
  },
  "Africa/Mogadishu": {
    a: "Africa/Nairobi",
    c: ["SO"],
    r: 1
  },
  "Africa/Monrovia": {
    u: 0,
    c: ["LR"]
  },
  "Africa/Nairobi": {
    u: 180,
    c: ["KE", "DJ", "ER", "ET", "KM", "MG", "SO", "TZ", "UG", "YT"]
  },
  "Africa/Ndjamena": {
    u: 60,
    c: ["TD"]
  },
  "Africa/Niamey": {
    a: "Africa/Lagos",
    c: ["NE"],
    r: 1
  },
  "Africa/Nouakchott": {
    a: "Africa/Abidjan",
    c: ["MR"],
    r: 1
  },
  "Africa/Ouagadougou": {
    a: "Africa/Abidjan",
    c: ["BF"],
    r: 1
  },
  "Africa/Porto-Novo": {
    a: "Africa/Lagos",
    c: ["BJ"],
    r: 1
  },
  "Africa/Sao_Tome": {
    u: 0,
    c: ["ST"]
  },
  "Africa/Timbuktu": {
    a: "Africa/Abidjan",
    c: ["ML"],
    r: 1
  },
  "Africa/Tripoli": {
    u: 120,
    c: ["LY"]
  },
  "Africa/Tunis": {
    u: 60,
    c: ["TN"]
  },
  "Africa/Windhoek": {
    u: 120,
    c: ["NA"]
  },
  "America/Adak": {
    u: -600,
    d: -540,
    c: ["US"]
  },
  "America/Anchorage": {
    u: -540,
    d: -480,
    c: ["US"]
  },
  "America/Anguilla": {
    a: "America/Puerto_Rico",
    c: ["AI"],
    r: 1
  },
  "America/Antigua": {
    a: "America/Puerto_Rico",
    c: ["AG"],
    r: 1
  },
  "America/Araguaina": {
    u: -180,
    c: ["BR"]
  },
  "America/Argentina/Buenos_Aires": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/Catamarca": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/ComodRivadavia": {
    a: "America/Argentina/Catamarca",
    r: 1
  },
  "America/Argentina/Cordoba": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/Jujuy": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/La_Rioja": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/Mendoza": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/Rio_Gallegos": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/Salta": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/San_Juan": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/San_Luis": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/Tucuman": {
    u: -180,
    c: ["AR"]
  },
  "America/Argentina/Ushuaia": {
    u: -180,
    c: ["AR"]
  },
  "America/Aruba": {
    a: "America/Puerto_Rico",
    c: ["AW"],
    r: 1
  },
  "America/Asuncion": {
    u: -240,
    d: -180,
    c: ["PY"]
  },
  "America/Atikokan": {
    a: "America/Panama",
    c: ["CA"],
    r: 1
  },
  "America/Atka": {
    a: "America/Adak",
    r: 1
  },
  "America/Bahia": {
    u: -180,
    c: ["BR"]
  },
  "America/Bahia_Banderas": {
    u: -360,
    d: -300,
    c: ["MX"]
  },
  "America/Barbados": {
    u: -240,
    c: ["BB"]
  },
  "America/Belem": {
    u: -180,
    c: ["BR"]
  },
  "America/Belize": {
    u: -360,
    c: ["BZ"]
  },
  "America/Blanc-Sablon": {
    a: "America/Puerto_Rico",
    c: ["CA"],
    r: 1
  },
  "America/Boa_Vista": {
    u: -240,
    c: ["BR"]
  },
  "America/Bogota": {
    u: -300,
    c: ["CO"]
  },
  "America/Boise": {
    u: -420,
    d: -360,
    c: ["US"]
  },
  "America/Buenos_Aires": {
    a: "America/Argentina/Buenos_Aires",
    r: 1
  },
  "America/Cambridge_Bay": {
    u: -420,
    d: -360,
    c: ["CA"]
  },
  "America/Campo_Grande": {
    u: -240,
    c: ["BR"]
  },
  "America/Cancun": {
    u: -300,
    c: ["MX"]
  },
  "America/Caracas": {
    u: -240,
    c: ["VE"]
  },
  "America/Catamarca": {
    a: "America/Argentina/Catamarca",
    r: 1
  },
  "America/Cayenne": {
    u: -180,
    c: ["GF"]
  },
  "America/Cayman": {
    a: "America/Panama",
    c: ["KY"],
    r: 1
  },
  "America/Chicago": {
    u: -360,
    d: -300,
    c: ["US"]
  },
  "America/Chihuahua": {
    u: -420,
    d: -360,
    c: ["MX"]
  },
  "America/Coral_Harbour": {
    a: "America/Panama",
    c: ["CA"],
    r: 1
  },
  "America/Cordoba": {
    a: "America/Argentina/Cordoba",
    r: 1
  },
  "America/Costa_Rica": {
    u: -360,
    c: ["CR"]
  },
  "America/Creston": {
    a: "America/Phoenix",
    c: ["CA"],
    r: 1
  },
  "America/Cuiaba": {
    u: -240,
    c: ["BR"]
  },
  "America/Curacao": {
    a: "America/Puerto_Rico",
    c: ["CW"],
    r: 1
  },
  "America/Danmarkshavn": {
    u: 0,
    c: ["GL"]
  },
  "America/Dawson": {
    u: -420,
    c: ["CA"]
  },
  "America/Dawson_Creek": {
    u: -420,
    c: ["CA"]
  },
  "America/Denver": {
    u: -420,
    d: -360,
    c: ["US"]
  },
  "America/Detroit": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Dominica": {
    a: "America/Puerto_Rico",
    c: ["DM"],
    r: 1
  },
  "America/Edmonton": {
    u: -420,
    d: -360,
    c: ["CA"]
  },
  "America/Eirunepe": {
    u: -300,
    c: ["BR"]
  },
  "America/El_Salvador": {
    u: -360,
    c: ["SV"]
  },
  "America/Ensenada": {
    a: "America/Tijuana",
    r: 1
  },
  "America/Fort_Nelson": {
    u: -420,
    c: ["CA"]
  },
  "America/Fort_Wayne": {
    a: "America/Indiana/Indianapolis",
    r: 1
  },
  "America/Fortaleza": {
    u: -180,
    c: ["BR"]
  },
  "America/Glace_Bay": {
    u: -240,
    d: -180,
    c: ["CA"]
  },
  "America/Godthab": {
    a: "America/Nuuk",
    r: 1
  },
  "America/Goose_Bay": {
    u: -240,
    d: -180,
    c: ["CA"]
  },
  "America/Grand_Turk": {
    u: -300,
    d: -240,
    c: ["TC"]
  },
  "America/Grenada": {
    a: "America/Puerto_Rico",
    c: ["GD"],
    r: 1
  },
  "America/Guadeloupe": {
    a: "America/Puerto_Rico",
    c: ["GP"],
    r: 1
  },
  "America/Guatemala": {
    u: -360,
    c: ["GT"]
  },
  "America/Guayaquil": {
    u: -300,
    c: ["EC"]
  },
  "America/Guyana": {
    u: -240,
    c: ["GY"]
  },
  "America/Halifax": {
    u: -240,
    d: -180,
    c: ["CA"]
  },
  "America/Havana": {
    u: -300,
    d: -240,
    c: ["CU"]
  },
  "America/Hermosillo": {
    u: -420,
    c: ["MX"]
  },
  "America/Indiana/Indianapolis": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Indiana/Knox": {
    u: -360,
    d: -300,
    c: ["US"]
  },
  "America/Indiana/Marengo": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Indiana/Petersburg": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Indiana/Tell_City": {
    u: -360,
    d: -300,
    c: ["US"]
  },
  "America/Indiana/Vevay": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Indiana/Vincennes": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Indiana/Winamac": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Indianapolis": {
    a: "America/Indiana/Indianapolis",
    r: 1
  },
  "America/Inuvik": {
    u: -420,
    d: -360,
    c: ["CA"]
  },
  "America/Iqaluit": {
    u: -300,
    d: -240,
    c: ["CA"]
  },
  "America/Jamaica": {
    u: -300,
    c: ["JM"]
  },
  "America/Jujuy": {
    a: "America/Argentina/Jujuy",
    r: 1
  },
  "America/Juneau": {
    u: -540,
    d: -480,
    c: ["US"]
  },
  "America/Kentucky/Louisville": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Kentucky/Monticello": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Knox_IN": {
    a: "America/Indiana/Knox",
    r: 1
  },
  "America/Kralendijk": {
    a: "America/Puerto_Rico",
    c: ["BQ"],
    r: 1
  },
  "America/La_Paz": {
    u: -240,
    c: ["BO"]
  },
  "America/Lima": {
    u: -300,
    c: ["PE"]
  },
  "America/Los_Angeles": {
    u: -480,
    d: -420,
    c: ["US"]
  },
  "America/Louisville": {
    a: "America/Kentucky/Louisville",
    r: 1
  },
  "America/Lower_Princes": {
    a: "America/Puerto_Rico",
    c: ["SX"],
    r: 1
  },
  "America/Maceio": {
    u: -180,
    c: ["BR"]
  },
  "America/Managua": {
    u: -360,
    c: ["NI"]
  },
  "America/Manaus": {
    u: -240,
    c: ["BR"]
  },
  "America/Marigot": {
    a: "America/Puerto_Rico",
    c: ["MF"],
    r: 1
  },
  "America/Martinique": {
    u: -240,
    c: ["MQ"]
  },
  "America/Matamoros": {
    u: -360,
    d: -300,
    c: ["MX"]
  },
  "America/Mazatlan": {
    u: -420,
    d: -360,
    c: ["MX"]
  },
  "America/Mendoza": {
    a: "America/Argentina/Mendoza",
    r: 1
  },
  "America/Menominee": {
    u: -360,
    d: -300,
    c: ["US"]
  },
  "America/Merida": {
    u: -360,
    d: -300,
    c: ["MX"]
  },
  "America/Metlakatla": {
    u: -540,
    d: -480,
    c: ["US"]
  },
  "America/Mexico_City": {
    u: -360,
    d: -300,
    c: ["MX"]
  },
  "America/Miquelon": {
    u: -180,
    d: -120,
    c: ["PM"]
  },
  "America/Moncton": {
    u: -240,
    d: -180,
    c: ["CA"]
  },
  "America/Monterrey": {
    u: -360,
    d: -300,
    c: ["MX"]
  },
  "America/Montevideo": {
    u: -180,
    c: ["UY"]
  },
  "America/Montreal": {
    a: "America/Toronto",
    c: ["CA"],
    r: 1
  },
  "America/Montserrat": {
    a: "America/Puerto_Rico",
    c: ["MS"],
    r: 1
  },
  "America/Nassau": {
    a: "America/Toronto",
    c: ["BS"],
    r: 1
  },
  "America/New_York": {
    u: -300,
    d: -240,
    c: ["US"]
  },
  "America/Nipigon": {
    u: -300,
    d: -240,
    c: ["CA"]
  },
  "America/Nome": {
    u: -540,
    d: -480,
    c: ["US"]
  },
  "America/Noronha": {
    u: -120,
    c: ["BR"]
  },
  "America/North_Dakota/Beulah": {
    u: -360,
    d: -300,
    c: ["US"]
  },
  "America/North_Dakota/Center": {
    u: -360,
    d: -300,
    c: ["US"]
  },
  "America/North_Dakota/New_Salem": {
    u: -360,
    d: -300,
    c: ["US"]
  },
  "America/Nuuk": {
    u: -180,
    d: -120,
    c: ["GL"]
  },
  "America/Ojinaga": {
    u: -420,
    d: -360,
    c: ["MX"]
  },
  "America/Panama": {
    u: -300,
    c: ["PA", "CA", "KY"]
  },
  "America/Pangnirtung": {
    u: -300,
    d: -240,
    c: ["CA"]
  },
  "America/Paramaribo": {
    u: -180,
    c: ["SR"]
  },
  "America/Phoenix": {
    u: -420,
    c: ["US", "CA"]
  },
  "America/Port-au-Prince": {
    u: -300,
    d: -240,
    c: ["HT"]
  },
  "America/Port_of_Spain": {
    a: "America/Puerto_Rico",
    c: ["TT"],
    r: 1
  },
  "America/Porto_Acre": {
    a: "America/Rio_Branco",
    r: 1
  },
  "America/Porto_Velho": {
    u: -240,
    c: ["BR"]
  },
  "America/Puerto_Rico": {
    u: -240,
    c: [
      "PR",
      "AG",
      "CA",
      "AI",
      "AW",
      "BL",
      "BQ",
      "CW",
      "DM",
      "GD",
      "GP",
      "KN",
      "LC",
      "MF",
      "MS",
      "SX",
      "TT",
      "VC",
      "VG",
      "VI"
    ]
  },
  "America/Punta_Arenas": {
    u: -180,
    c: ["CL"]
  },
  "America/Rainy_River": {
    u: -360,
    d: -300,
    c: ["CA"]
  },
  "America/Rankin_Inlet": {
    u: -360,
    d: -300,
    c: ["CA"]
  },
  "America/Recife": {
    u: -180,
    c: ["BR"]
  },
  "America/Regina": {
    u: -360,
    c: ["CA"]
  },
  "America/Resolute": {
    u: -360,
    d: -300,
    c: ["CA"]
  },
  "America/Rio_Branco": {
    u: -300,
    c: ["BR"]
  },
  "America/Rosario": {
    a: "America/Argentina/Cordoba",
    r: 1
  },
  "America/Santa_Isabel": {
    a: "America/Tijuana",
    r: 1
  },
  "America/Santarem": {
    u: -180,
    c: ["BR"]
  },
  "America/Santiago": {
    u: -240,
    d: -180,
    c: ["CL"]
  },
  "America/Santo_Domingo": {
    u: -240,
    c: ["DO"]
  },
  "America/Sao_Paulo": {
    u: -180,
    c: ["BR"]
  },
  "America/Scoresbysund": {
    u: -60,
    d: 0,
    c: ["GL"]
  },
  "America/Shiprock": {
    a: "America/Denver",
    r: 1
  },
  "America/Sitka": {
    u: -540,
    d: -480,
    c: ["US"]
  },
  "America/St_Barthelemy": {
    a: "America/Puerto_Rico",
    c: ["BL"],
    r: 1
  },
  "America/St_Johns": {
    u: -150,
    d: -90,
    c: ["CA"]
  },
  "America/St_Kitts": {
    a: "America/Puerto_Rico",
    c: ["KN"],
    r: 1
  },
  "America/St_Lucia": {
    a: "America/Puerto_Rico",
    c: ["LC"],
    r: 1
  },
  "America/St_Thomas": {
    a: "America/Puerto_Rico",
    c: ["VI"],
    r: 1
  },
  "America/St_Vincent": {
    a: "America/Puerto_Rico",
    c: ["VC"],
    r: 1
  },
  "America/Swift_Current": {
    u: -360,
    c: ["CA"]
  },
  "America/Tegucigalpa": {
    u: -360,
    c: ["HN"]
  },
  "America/Thule": {
    u: -240,
    d: -180,
    c: ["GL"]
  },
  "America/Thunder_Bay": {
    u: -300,
    d: -240,
    c: ["CA"]
  },
  "America/Tijuana": {
    u: -480,
    d: -420,
    c: ["MX"]
  },
  "America/Toronto": {
    u: -300,
    d: -240,
    c: ["CA", "BS"]
  },
  "America/Tortola": {
    a: "America/Puerto_Rico",
    c: ["VG"],
    r: 1
  },
  "America/Vancouver": {
    u: -480,
    d: -420,
    c: ["CA"]
  },
  "America/Virgin": {
    a: "America/Puerto_Rico",
    c: ["VI"],
    r: 1
  },
  "America/Whitehorse": {
    u: -420,
    c: ["CA"]
  },
  "America/Winnipeg": {
    u: -360,
    d: -300,
    c: ["CA"]
  },
  "America/Yakutat": {
    u: -540,
    d: -480,
    c: ["US"]
  },
  "America/Yellowknife": {
    u: -420,
    d: -360,
    c: ["CA"]
  },
  "Antarctica/Casey": {
    u: 660,
    c: ["AQ"]
  },
  "Antarctica/Davis": {
    u: 420,
    c: ["AQ"]
  },
  "Antarctica/DumontDUrville": {
    a: "Pacific/Port_Moresby",
    c: ["AQ"],
    r: 1
  },
  "Antarctica/Macquarie": {
    u: 600,
    d: 660,
    c: ["AU"]
  },
  "Antarctica/Mawson": {
    u: 300,
    c: ["AQ"]
  },
  "Antarctica/McMurdo": {
    a: "Pacific/Auckland",
    c: ["AQ"],
    r: 1
  },
  "Antarctica/Palmer": {
    u: -180,
    c: ["AQ"]
  },
  "Antarctica/Rothera": {
    u: -180,
    c: ["AQ"]
  },
  "Antarctica/South_Pole": {
    a: "Pacific/Auckland",
    c: ["AQ"],
    r: 1
  },
  "Antarctica/Syowa": {
    a: "Asia/Riyadh",
    c: ["AQ"],
    r: 1
  },
  "Antarctica/Troll": {
    u: 0,
    d: 120,
    c: ["AQ"]
  },
  "Antarctica/Vostok": {
    u: 360,
    c: ["AQ"]
  },
  "Arctic/Longyearbyen": {
    a: "Europe/Oslo",
    c: ["SJ"],
    r: 1
  },
  "Asia/Aden": {
    a: "Asia/Riyadh",
    c: ["YE"],
    r: 1
  },
  "Asia/Almaty": {
    u: 360,
    c: ["KZ"]
  },
  "Asia/Amman": {
    u: 120,
    d: 180,
    c: ["JO"]
  },
  "Asia/Anadyr": {
    u: 720,
    c: ["RU"]
  },
  "Asia/Aqtau": {
    u: 300,
    c: ["KZ"]
  },
  "Asia/Aqtobe": {
    u: 300,
    c: ["KZ"]
  },
  "Asia/Ashgabat": {
    u: 300,
    c: ["TM"]
  },
  "Asia/Ashkhabad": {
    a: "Asia/Ashgabat",
    r: 1
  },
  "Asia/Atyrau": {
    u: 300,
    c: ["KZ"]
  },
  "Asia/Baghdad": {
    u: 180,
    c: ["IQ"]
  },
  "Asia/Bahrain": {
    a: "Asia/Qatar",
    c: ["BH"],
    r: 1
  },
  "Asia/Baku": {
    u: 240,
    c: ["AZ"]
  },
  "Asia/Bangkok": {
    u: 420,
    c: ["TH", "KH", "LA", "VN"]
  },
  "Asia/Barnaul": {
    u: 420,
    c: ["RU"]
  },
  "Asia/Beirut": {
    u: 120,
    d: 180,
    c: ["LB"]
  },
  "Asia/Bishkek": {
    u: 360,
    c: ["KG"]
  },
  "Asia/Brunei": {
    u: 480,
    c: ["BN"]
  },
  "Asia/Calcutta": {
    a: "Asia/Kolkata",
    r: 1
  },
  "Asia/Chita": {
    u: 540,
    c: ["RU"]
  },
  "Asia/Choibalsan": {
    u: 480,
    c: ["MN"]
  },
  "Asia/Chongqing": {
    a: "Asia/Shanghai",
    r: 1
  },
  "Asia/Chungking": {
    a: "Asia/Shanghai",
    r: 1
  },
  "Asia/Colombo": {
    u: 330,
    c: ["LK"]
  },
  "Asia/Dacca": {
    a: "Asia/Dhaka",
    r: 1
  },
  "Asia/Damascus": {
    u: 120,
    d: 180,
    c: ["SY"]
  },
  "Asia/Dhaka": {
    u: 360,
    c: ["BD"]
  },
  "Asia/Dili": {
    u: 540,
    c: ["TL"]
  },
  "Asia/Dubai": {
    u: 240,
    c: ["AE", "OM"]
  },
  "Asia/Dushanbe": {
    u: 300,
    c: ["TJ"]
  },
  "Asia/Famagusta": {
    u: 120,
    d: 180,
    c: ["CY"]
  },
  "Asia/Gaza": {
    u: 120,
    d: 180,
    c: ["PS"]
  },
  "Asia/Harbin": {
    a: "Asia/Shanghai",
    r: 1
  },
  "Asia/Hebron": {
    u: 120,
    d: 180,
    c: ["PS"]
  },
  "Asia/Ho_Chi_Minh": {
    u: 420,
    c: ["VN"]
  },
  "Asia/Hong_Kong": {
    u: 480,
    c: ["HK"]
  },
  "Asia/Hovd": {
    u: 420,
    c: ["MN"]
  },
  "Asia/Irkutsk": {
    u: 480,
    c: ["RU"]
  },
  "Asia/Istanbul": {
    a: "Europe/Istanbul",
    r: 1
  },
  "Asia/Jakarta": {
    u: 420,
    c: ["ID"]
  },
  "Asia/Jayapura": {
    u: 540,
    c: ["ID"]
  },
  "Asia/Jerusalem": {
    u: 120,
    d: 180,
    c: ["IL"]
  },
  "Asia/Kabul": {
    u: 270,
    c: ["AF"]
  },
  "Asia/Kamchatka": {
    u: 720,
    c: ["RU"]
  },
  "Asia/Karachi": {
    u: 300,
    c: ["PK"]
  },
  "Asia/Kashgar": {
    a: "Asia/Urumqi",
    r: 1
  },
  "Asia/Kathmandu": {
    u: 345,
    c: ["NP"]
  },
  "Asia/Katmandu": {
    a: "Asia/Kathmandu",
    r: 1
  },
  "Asia/Khandyga": {
    u: 540,
    c: ["RU"]
  },
  "Asia/Kolkata": {
    u: 330,
    c: ["IN"]
  },
  "Asia/Krasnoyarsk": {
    u: 420,
    c: ["RU"]
  },
  "Asia/Kuala_Lumpur": {
    u: 480,
    c: ["MY"]
  },
  "Asia/Kuching": {
    u: 480,
    c: ["MY"]
  },
  "Asia/Kuwait": {
    a: "Asia/Riyadh",
    c: ["KW"],
    r: 1
  },
  "Asia/Macao": {
    a: "Asia/Macau",
    r: 1
  },
  "Asia/Macau": {
    u: 480,
    c: ["MO"]
  },
  "Asia/Magadan": {
    u: 660,
    c: ["RU"]
  },
  "Asia/Makassar": {
    u: 480,
    c: ["ID"]
  },
  "Asia/Manila": {
    u: 480,
    c: ["PH"]
  },
  "Asia/Muscat": {
    a: "Asia/Dubai",
    c: ["OM"],
    r: 1
  },
  "Asia/Nicosia": {
    u: 120,
    d: 180,
    c: ["CY"]
  },
  "Asia/Novokuznetsk": {
    u: 420,
    c: ["RU"]
  },
  "Asia/Novosibirsk": {
    u: 420,
    c: ["RU"]
  },
  "Asia/Omsk": {
    u: 360,
    c: ["RU"]
  },
  "Asia/Oral": {
    u: 300,
    c: ["KZ"]
  },
  "Asia/Phnom_Penh": {
    a: "Asia/Bangkok",
    c: ["KH"],
    r: 1
  },
  "Asia/Pontianak": {
    u: 420,
    c: ["ID"]
  },
  "Asia/Pyongyang": {
    u: 540,
    c: ["KP"]
  },
  "Asia/Qatar": {
    u: 180,
    c: ["QA", "BH"]
  },
  "Asia/Qostanay": {
    u: 360,
    c: ["KZ"]
  },
  "Asia/Qyzylorda": {
    u: 300,
    c: ["KZ"]
  },
  "Asia/Rangoon": {
    a: "Asia/Yangon",
    r: 1
  },
  "Asia/Riyadh": {
    u: 180,
    c: ["SA", "AQ", "KW", "YE"]
  },
  "Asia/Saigon": {
    a: "Asia/Ho_Chi_Minh",
    r: 1
  },
  "Asia/Sakhalin": {
    u: 660,
    c: ["RU"]
  },
  "Asia/Samarkand": {
    u: 300,
    c: ["UZ"]
  },
  "Asia/Seoul": {
    u: 540,
    c: ["KR"]
  },
  "Asia/Shanghai": {
    u: 480,
    c: ["CN"]
  },
  "Asia/Singapore": {
    u: 480,
    c: ["SG", "MY"]
  },
  "Asia/Srednekolymsk": {
    u: 660,
    c: ["RU"]
  },
  "Asia/Taipei": {
    u: 480,
    c: ["TW"]
  },
  "Asia/Tashkent": {
    u: 300,
    c: ["UZ"]
  },
  "Asia/Tbilisi": {
    u: 240,
    c: ["GE"]
  },
  "Asia/Tehran": {
    u: 210,
    d: 270,
    c: ["IR"]
  },
  "Asia/Tel_Aviv": {
    a: "Asia/Jerusalem",
    r: 1
  },
  "Asia/Thimbu": {
    a: "Asia/Thimphu",
    r: 1
  },
  "Asia/Thimphu": {
    u: 360,
    c: ["BT"]
  },
  "Asia/Tokyo": {
    u: 540,
    c: ["JP"]
  },
  "Asia/Tomsk": {
    u: 420,
    c: ["RU"]
  },
  "Asia/Ujung_Pandang": {
    a: "Asia/Makassar",
    r: 1
  },
  "Asia/Ulaanbaatar": {
    u: 480,
    c: ["MN"]
  },
  "Asia/Ulan_Bator": {
    a: "Asia/Ulaanbaatar",
    r: 1
  },
  "Asia/Urumqi": {
    u: 360,
    c: ["CN"]
  },
  "Asia/Ust-Nera": {
    u: 600,
    c: ["RU"]
  },
  "Asia/Vientiane": {
    a: "Asia/Bangkok",
    c: ["LA"],
    r: 1
  },
  "Asia/Vladivostok": {
    u: 600,
    c: ["RU"]
  },
  "Asia/Yakutsk": {
    u: 540,
    c: ["RU"]
  },
  "Asia/Yangon": {
    u: 390,
    c: ["MM"]
  },
  "Asia/Yekaterinburg": {
    u: 300,
    c: ["RU"]
  },
  "Asia/Yerevan": {
    u: 240,
    c: ["AM"]
  },
  "Atlantic/Azores": {
    u: -60,
    d: 0,
    c: ["PT"]
  },
  "Atlantic/Bermuda": {
    u: -240,
    d: -180,
    c: ["BM"]
  },
  "Atlantic/Canary": {
    u: 0,
    d: 60,
    c: ["ES"]
  },
  "Atlantic/Cape_Verde": {
    u: -60,
    c: ["CV"]
  },
  "Atlantic/Faeroe": {
    a: "Atlantic/Faroe",
    r: 1
  },
  "Atlantic/Faroe": {
    u: 0,
    d: 60,
    c: ["FO"]
  },
  "Atlantic/Jan_Mayen": {
    a: "Europe/Oslo",
    c: ["SJ"],
    r: 1
  },
  "Atlantic/Madeira": {
    u: 0,
    d: 60,
    c: ["PT"]
  },
  "Atlantic/Reykjavik": {
    u: 0,
    c: ["IS"]
  },
  "Atlantic/South_Georgia": {
    u: -120,
    c: ["GS"]
  },
  "Atlantic/St_Helena": {
    a: "Africa/Abidjan",
    c: ["SH"],
    r: 1
  },
  "Atlantic/Stanley": {
    u: -180,
    c: ["FK"]
  },
  "Australia/ACT": {
    a: "Australia/Sydney",
    r: 1
  },
  "Australia/Adelaide": {
    u: 570,
    d: 630,
    c: ["AU"]
  },
  "Australia/Brisbane": {
    u: 600,
    c: ["AU"]
  },
  "Australia/Broken_Hill": {
    u: 570,
    d: 630,
    c: ["AU"]
  },
  "Australia/Canberra": {
    a: "Australia/Sydney",
    r: 1
  },
  "Australia/Currie": {
    a: "Australia/Hobart",
    r: 1
  },
  "Australia/Darwin": {
    u: 570,
    c: ["AU"]
  },
  "Australia/Eucla": {
    u: 525,
    c: ["AU"]
  },
  "Australia/Hobart": {
    u: 600,
    d: 660,
    c: ["AU"]
  },
  "Australia/LHI": {
    a: "Australia/Lord_Howe",
    r: 1
  },
  "Australia/Lindeman": {
    u: 600,
    c: ["AU"]
  },
  "Australia/Lord_Howe": {
    u: 630,
    d: 660,
    c: ["AU"]
  },
  "Australia/Melbourne": {
    u: 600,
    d: 660,
    c: ["AU"]
  },
  "Australia/NSW": {
    a: "Australia/Sydney",
    r: 1
  },
  "Australia/North": {
    a: "Australia/Darwin",
    r: 1
  },
  "Australia/Perth": {
    u: 480,
    c: ["AU"]
  },
  "Australia/Queensland": {
    a: "Australia/Brisbane",
    r: 1
  },
  "Australia/South": {
    a: "Australia/Adelaide",
    r: 1
  },
  "Australia/Sydney": {
    u: 600,
    d: 660,
    c: ["AU"]
  },
  "Australia/Tasmania": {
    a: "Australia/Hobart",
    r: 1
  },
  "Australia/Victoria": {
    a: "Australia/Melbourne",
    r: 1
  },
  "Australia/West": {
    a: "Australia/Perth",
    r: 1
  },
  "Australia/Yancowinna": {
    a: "Australia/Broken_Hill",
    r: 1
  },
  "Brazil/Acre": {
    a: "America/Rio_Branco",
    r: 1
  },
  "Brazil/DeNoronha": {
    a: "America/Noronha",
    r: 1
  },
  "Brazil/East": {
    a: "America/Sao_Paulo",
    r: 1
  },
  "Brazil/West": {
    a: "America/Manaus",
    r: 1
  },
  CET: {
    u: 60,
    d: 120
  },
  CST6CDT: {
    u: -360,
    d: -300
  },
  "Canada/Atlantic": {
    a: "America/Halifax",
    r: 1
  },
  "Canada/Central": {
    a: "America/Winnipeg",
    r: 1
  },
  "Canada/Eastern": {
    a: "America/Toronto",
    c: ["CA"],
    r: 1
  },
  "Canada/Mountain": {
    a: "America/Edmonton",
    r: 1
  },
  "Canada/Newfoundland": {
    a: "America/St_Johns",
    r: 1
  },
  "Canada/Pacific": {
    a: "America/Vancouver",
    r: 1
  },
  "Canada/Saskatchewan": {
    a: "America/Regina",
    r: 1
  },
  "Canada/Yukon": {
    a: "America/Whitehorse",
    r: 1
  },
  "Chile/Continental": {
    a: "America/Santiago",
    r: 1
  },
  "Chile/EasterIsland": {
    a: "Pacific/Easter",
    r: 1
  },
  Cuba: {
    a: "America/Havana",
    r: 1
  },
  EET: {
    u: 120,
    d: 180
  },
  EST: {
    u: -300
  },
  EST5EDT: {
    u: -300,
    d: -240
  },
  Egypt: {
    a: "Africa/Cairo",
    r: 1
  },
  Eire: {
    a: "Europe/Dublin",
    r: 1
  },
  "Etc/GMT": {
    u: 0
  },
  "Etc/GMT+0": {
    a: "Etc/GMT",
    r: 1
  },
  "Etc/GMT+1": {
    u: -60
  },
  "Etc/GMT+10": {
    u: -600
  },
  "Etc/GMT+11": {
    u: -660
  },
  "Etc/GMT+12": {
    u: -720
  },
  "Etc/GMT+2": {
    u: -120
  },
  "Etc/GMT+3": {
    u: -180
  },
  "Etc/GMT+4": {
    u: -240
  },
  "Etc/GMT+5": {
    u: -300
  },
  "Etc/GMT+6": {
    u: -360
  },
  "Etc/GMT+7": {
    u: -420
  },
  "Etc/GMT+8": {
    u: -480
  },
  "Etc/GMT+9": {
    u: -540
  },
  "Etc/GMT-0": {
    a: "Etc/GMT",
    r: 1
  },
  "Etc/GMT-1": {
    u: 60
  },
  "Etc/GMT-10": {
    u: 600
  },
  "Etc/GMT-11": {
    u: 660
  },
  "Etc/GMT-12": {
    u: 720
  },
  "Etc/GMT-13": {
    u: 780
  },
  "Etc/GMT-14": {
    u: 840
  },
  "Etc/GMT-2": {
    u: 120
  },
  "Etc/GMT-3": {
    u: 180
  },
  "Etc/GMT-4": {
    u: 240
  },
  "Etc/GMT-5": {
    u: 300
  },
  "Etc/GMT-6": {
    u: 360
  },
  "Etc/GMT-7": {
    u: 420
  },
  "Etc/GMT-8": {
    u: 480
  },
  "Etc/GMT-9": {
    u: 540
  },
  "Etc/GMT0": {
    a: "Etc/GMT",
    r: 1
  },
  "Etc/Greenwich": {
    a: "Etc/GMT",
    r: 1
  },
  "Etc/UCT": {
    a: "Etc/UTC",
    r: 1
  },
  "Etc/UTC": {
    u: 0
  },
  "Etc/Universal": {
    a: "Etc/UTC",
    r: 1
  },
  "Etc/Zulu": {
    a: "Etc/UTC",
    r: 1
  },
  "Europe/Amsterdam": {
    u: 60,
    d: 120,
    c: ["NL"]
  },
  "Europe/Andorra": {
    u: 60,
    d: 120,
    c: ["AD"]
  },
  "Europe/Astrakhan": {
    u: 240,
    c: ["RU"]
  },
  "Europe/Athens": {
    u: 120,
    d: 180,
    c: ["GR"]
  },
  "Europe/Belfast": {
    a: "Europe/London",
    c: ["GB"],
    r: 1
  },
  "Europe/Belgrade": {
    u: 60,
    d: 120,
    c: ["RS", "BA", "HR", "ME", "MK", "SI"]
  },
  "Europe/Berlin": {
    u: 60,
    d: 120,
    c: ["DE"]
  },
  "Europe/Bratislava": {
    a: "Europe/Prague",
    c: ["SK"],
    r: 1
  },
  "Europe/Brussels": {
    u: 60,
    d: 120,
    c: ["BE"]
  },
  "Europe/Bucharest": {
    u: 120,
    d: 180,
    c: ["RO"]
  },
  "Europe/Budapest": {
    u: 60,
    d: 120,
    c: ["HU"]
  },
  "Europe/Busingen": {
    a: "Europe/Zurich",
    c: ["DE"],
    r: 1
  },
  "Europe/Chisinau": {
    u: 120,
    d: 180,
    c: ["MD"]
  },
  "Europe/Copenhagen": {
    u: 60,
    d: 120,
    c: ["DK"]
  },
  "Europe/Dublin": {
    u: 60,
    d: 0,
    c: ["IE"]
  },
  "Europe/Gibraltar": {
    u: 60,
    d: 120,
    c: ["GI"]
  },
  "Europe/Guernsey": {
    a: "Europe/London",
    c: ["GG"],
    r: 1
  },
  "Europe/Helsinki": {
    u: 120,
    d: 180,
    c: ["FI", "AX"]
  },
  "Europe/Isle_of_Man": {
    a: "Europe/London",
    c: ["IM"],
    r: 1
  },
  "Europe/Istanbul": {
    u: 180,
    c: ["TR"]
  },
  "Europe/Jersey": {
    a: "Europe/London",
    c: ["JE"],
    r: 1
  },
  "Europe/Kaliningrad": {
    u: 120,
    c: ["RU"]
  },
  "Europe/Kiev": {
    u: 120,
    d: 180,
    c: ["UA"]
  },
  "Europe/Kirov": {
    u: 180,
    c: ["RU"]
  },
  "Europe/Lisbon": {
    u: 0,
    d: 60,
    c: ["PT"]
  },
  "Europe/Ljubljana": {
    a: "Europe/Belgrade",
    c: ["SI"],
    r: 1
  },
  "Europe/London": {
    u: 0,
    d: 60,
    c: ["GB", "GG", "IM", "JE"]
  },
  "Europe/Luxembourg": {
    u: 60,
    d: 120,
    c: ["LU"]
  },
  "Europe/Madrid": {
    u: 60,
    d: 120,
    c: ["ES"]
  },
  "Europe/Malta": {
    u: 60,
    d: 120,
    c: ["MT"]
  },
  "Europe/Mariehamn": {
    a: "Europe/Helsinki",
    c: ["AX"],
    r: 1
  },
  "Europe/Minsk": {
    u: 180,
    c: ["BY"]
  },
  "Europe/Monaco": {
    u: 60,
    d: 120,
    c: ["MC"]
  },
  "Europe/Moscow": {
    u: 180,
    c: ["RU"]
  },
  "Europe/Nicosia": {
    a: "Asia/Nicosia",
    r: 1
  },
  "Europe/Oslo": {
    u: 60,
    d: 120,
    c: ["NO", "SJ", "BV"]
  },
  "Europe/Paris": {
    u: 60,
    d: 120,
    c: ["FR"]
  },
  "Europe/Podgorica": {
    a: "Europe/Belgrade",
    c: ["ME"],
    r: 1
  },
  "Europe/Prague": {
    u: 60,
    d: 120,
    c: ["CZ", "SK"]
  },
  "Europe/Riga": {
    u: 120,
    d: 180,
    c: ["LV"]
  },
  "Europe/Rome": {
    u: 60,
    d: 120,
    c: ["IT", "SM", "VA"]
  },
  "Europe/Samara": {
    u: 240,
    c: ["RU"]
  },
  "Europe/San_Marino": {
    a: "Europe/Rome",
    c: ["SM"],
    r: 1
  },
  "Europe/Sarajevo": {
    a: "Europe/Belgrade",
    c: ["BA"],
    r: 1
  },
  "Europe/Saratov": {
    u: 240,
    c: ["RU"]
  },
  "Europe/Simferopol": {
    u: 180,
    c: ["RU", "UA"]
  },
  "Europe/Skopje": {
    a: "Europe/Belgrade",
    c: ["MK"],
    r: 1
  },
  "Europe/Sofia": {
    u: 120,
    d: 180,
    c: ["BG"]
  },
  "Europe/Stockholm": {
    u: 60,
    d: 120,
    c: ["SE"]
  },
  "Europe/Tallinn": {
    u: 120,
    d: 180,
    c: ["EE"]
  },
  "Europe/Tirane": {
    u: 60,
    d: 120,
    c: ["AL"]
  },
  "Europe/Tiraspol": {
    a: "Europe/Chisinau",
    r: 1
  },
  "Europe/Ulyanovsk": {
    u: 240,
    c: ["RU"]
  },
  "Europe/Uzhgorod": {
    u: 120,
    d: 180,
    c: ["UA"]
  },
  "Europe/Vaduz": {
    a: "Europe/Zurich",
    c: ["LI"],
    r: 1
  },
  "Europe/Vatican": {
    a: "Europe/Rome",
    c: ["VA"],
    r: 1
  },
  "Europe/Vienna": {
    u: 60,
    d: 120,
    c: ["AT"]
  },
  "Europe/Vilnius": {
    u: 120,
    d: 180,
    c: ["LT"]
  },
  "Europe/Volgograd": {
    u: 180,
    c: ["RU"]
  },
  "Europe/Warsaw": {
    u: 60,
    d: 120,
    c: ["PL"]
  },
  "Europe/Zagreb": {
    a: "Europe/Belgrade",
    c: ["HR"],
    r: 1
  },
  "Europe/Zaporozhye": {
    u: 120,
    d: 180,
    c: ["UA"]
  },
  "Europe/Zurich": {
    u: 60,
    d: 120,
    c: ["CH", "DE", "LI"]
  },
  Factory: {
    u: 0
  },
  GB: {
    a: "Europe/London",
    c: ["GB"],
    r: 1
  },
  "GB-Eire": {
    a: "Europe/London",
    c: ["GB"],
    r: 1
  },
  GMT: {
    a: "Etc/GMT",
    r: 1
  },
  "GMT+0": {
    a: "Etc/GMT",
    r: 1
  },
  "GMT-0": {
    a: "Etc/GMT",
    r: 1
  },
  GMT0: {
    a: "Etc/GMT",
    r: 1
  },
  Greenwich: {
    a: "Etc/GMT",
    r: 1
  },
  HST: {
    u: -600
  },
  Hongkong: {
    a: "Asia/Hong_Kong",
    r: 1
  },
  Iceland: {
    a: "Atlantic/Reykjavik",
    r: 1
  },
  "Indian/Antananarivo": {
    a: "Africa/Nairobi",
    c: ["MG"],
    r: 1
  },
  "Indian/Chagos": {
    u: 360,
    c: ["IO"]
  },
  "Indian/Christmas": {
    u: 420,
    c: ["CX"]
  },
  "Indian/Cocos": {
    u: 390,
    c: ["CC"]
  },
  "Indian/Comoro": {
    a: "Africa/Nairobi",
    c: ["KM"],
    r: 1
  },
  "Indian/Kerguelen": {
    u: 300,
    c: ["TF", "HM"]
  },
  "Indian/Mahe": {
    u: 240,
    c: ["SC"]
  },
  "Indian/Maldives": {
    u: 300,
    c: ["MV"]
  },
  "Indian/Mauritius": {
    u: 240,
    c: ["MU"]
  },
  "Indian/Mayotte": {
    a: "Africa/Nairobi",
    c: ["YT"],
    r: 1
  },
  "Indian/Reunion": {
    u: 240,
    c: ["RE", "TF"]
  },
  Iran: {
    a: "Asia/Tehran",
    r: 1
  },
  Israel: {
    a: "Asia/Jerusalem",
    r: 1
  },
  Jamaica: {
    a: "America/Jamaica",
    r: 1
  },
  Japan: {
    a: "Asia/Tokyo",
    r: 1
  },
  Kwajalein: {
    a: "Pacific/Kwajalein",
    r: 1
  },
  Libya: {
    a: "Africa/Tripoli",
    r: 1
  },
  MET: {
    u: 60,
    d: 120
  },
  MST: {
    u: -420
  },
  MST7MDT: {
    u: -420,
    d: -360
  },
  "Mexico/BajaNorte": {
    a: "America/Tijuana",
    r: 1
  },
  "Mexico/BajaSur": {
    a: "America/Mazatlan",
    r: 1
  },
  "Mexico/General": {
    a: "America/Mexico_City",
    r: 1
  },
  NZ: {
    a: "Pacific/Auckland",
    c: ["NZ"],
    r: 1
  },
  "NZ-CHAT": {
    a: "Pacific/Chatham",
    r: 1
  },
  Navajo: {
    a: "America/Denver",
    r: 1
  },
  PRC: {
    a: "Asia/Shanghai",
    r: 1
  },
  PST8PDT: {
    u: -480,
    d: -420
  },
  "Pacific/Apia": {
    u: 780,
    c: ["WS"]
  },
  "Pacific/Auckland": {
    u: 720,
    d: 780,
    c: ["NZ", "AQ"]
  },
  "Pacific/Bougainville": {
    u: 660,
    c: ["PG"]
  },
  "Pacific/Chatham": {
    u: 765,
    d: 825,
    c: ["NZ"]
  },
  "Pacific/Chuuk": {
    u: 600,
    c: ["FM"]
  },
  "Pacific/Easter": {
    u: -360,
    d: -300,
    c: ["CL"]
  },
  "Pacific/Efate": {
    u: 660,
    c: ["VU"]
  },
  "Pacific/Enderbury": {
    a: "Pacific/Kanton",
    r: 1
  },
  "Pacific/Fakaofo": {
    u: 780,
    c: ["TK"]
  },
  "Pacific/Fiji": {
    u: 720,
    d: 780,
    c: ["FJ"]
  },
  "Pacific/Funafuti": {
    u: 720,
    c: ["TV"]
  },
  "Pacific/Galapagos": {
    u: -360,
    c: ["EC"]
  },
  "Pacific/Gambier": {
    u: -540,
    c: ["PF"]
  },
  "Pacific/Guadalcanal": {
    u: 660,
    c: ["SB"]
  },
  "Pacific/Guam": {
    u: 600,
    c: ["GU", "MP"]
  },
  "Pacific/Honolulu": {
    u: -600,
    c: ["US", "UM"]
  },
  "Pacific/Johnston": {
    a: "Pacific/Honolulu",
    c: ["UM"],
    r: 1
  },
  "Pacific/Kanton": {
    u: 780,
    c: ["KI"]
  },
  "Pacific/Kiritimati": {
    u: 840,
    c: ["KI"]
  },
  "Pacific/Kosrae": {
    u: 660,
    c: ["FM"]
  },
  "Pacific/Kwajalein": {
    u: 720,
    c: ["MH"]
  },
  "Pacific/Majuro": {
    u: 720,
    c: ["MH"]
  },
  "Pacific/Marquesas": {
    u: -510,
    c: ["PF"]
  },
  "Pacific/Midway": {
    a: "Pacific/Pago_Pago",
    c: ["UM"],
    r: 1
  },
  "Pacific/Nauru": {
    u: 720,
    c: ["NR"]
  },
  "Pacific/Niue": {
    u: -660,
    c: ["NU"]
  },
  "Pacific/Norfolk": {
    u: 660,
    d: 720,
    c: ["NF"]
  },
  "Pacific/Noumea": {
    u: 660,
    c: ["NC"]
  },
  "Pacific/Pago_Pago": {
    u: -660,
    c: ["AS", "UM"]
  },
  "Pacific/Palau": {
    u: 540,
    c: ["PW"]
  },
  "Pacific/Pitcairn": {
    u: -480,
    c: ["PN"]
  },
  "Pacific/Pohnpei": {
    u: 660,
    c: ["FM"]
  },
  "Pacific/Ponape": {
    a: "Pacific/Pohnpei",
    r: 1
  },
  "Pacific/Port_Moresby": {
    u: 600,
    c: ["PG", "AQ"]
  },
  "Pacific/Rarotonga": {
    u: -600,
    c: ["CK"]
  },
  "Pacific/Saipan": {
    a: "Pacific/Guam",
    c: ["MP"],
    r: 1
  },
  "Pacific/Samoa": {
    a: "Pacific/Pago_Pago",
    c: ["WS"],
    r: 1
  },
  "Pacific/Tahiti": {
    u: -600,
    c: ["PF"]
  },
  "Pacific/Tarawa": {
    u: 720,
    c: ["KI"]
  },
  "Pacific/Tongatapu": {
    u: 780,
    c: ["TO"]
  },
  "Pacific/Truk": {
    a: "Pacific/Chuuk",
    r: 1
  },
  "Pacific/Wake": {
    u: 720,
    c: ["UM"]
  },
  "Pacific/Wallis": {
    u: 720,
    c: ["WF"]
  },
  "Pacific/Yap": {
    a: "Pacific/Chuuk",
    r: 1
  },
  Poland: {
    a: "Europe/Warsaw",
    r: 1
  },
  Portugal: {
    a: "Europe/Lisbon",
    r: 1
  },
  ROC: {
    a: "Asia/Taipei",
    r: 1
  },
  ROK: {
    a: "Asia/Seoul",
    r: 1
  },
  Singapore: {
    a: "Asia/Singapore",
    c: ["SG"],
    r: 1
  },
  Turkey: {
    a: "Europe/Istanbul",
    r: 1
  },
  UCT: {
    a: "Etc/UTC",
    r: 1
  },
  "US/Alaska": {
    a: "America/Anchorage",
    r: 1
  },
  "US/Aleutian": {
    a: "America/Adak",
    r: 1
  },
  "US/Arizona": {
    a: "America/Phoenix",
    c: ["US"],
    r: 1
  },
  "US/Central": {
    a: "America/Chicago",
    r: 1
  },
  "US/East-Indiana": {
    a: "America/Indiana/Indianapolis",
    r: 1
  },
  "US/Eastern": {
    a: "America/New_York",
    r: 1
  },
  "US/Hawaii": {
    a: "Pacific/Honolulu",
    c: ["US"],
    r: 1
  },
  "US/Indiana-Starke": {
    a: "America/Indiana/Knox",
    r: 1
  },
  "US/Michigan": {
    a: "America/Detroit",
    r: 1
  },
  "US/Mountain": {
    a: "America/Denver",
    r: 1
  },
  "US/Pacific": {
    a: "America/Los_Angeles",
    r: 1
  },
  "US/Samoa": {
    a: "Pacific/Pago_Pago",
    c: ["WS"],
    r: 1
  },
  UTC: {
    a: "Etc/UTC",
    r: 1
  },
  Universal: {
    a: "Etc/UTC",
    r: 1
  },
  "W-SU": {
    a: "Europe/Moscow",
    r: 1
  },
  WET: {
    u: 0,
    d: 60
  },
  Zulu: {
    a: "Etc/UTC",
    r: 1
  }
};
const generateRandomString = (length) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
const generateUniqueId = async () => {
  const timestamp = performance.now().toString();
  let randomValues = "";
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    randomValues = Array.from(array).map((n) => n.toString(36)).join("");
  } else {
    randomValues = Math.random().toString(36).substring(2);
  }
  const browserInfo = [
    window.screen.width,
    window.screen.height,
    navigator.language,
    // Use hash of user agent to add entropy without storing the full string
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(navigator.userAgent)).then(
      (buf) => Array.from(new Uint8Array(buf)).slice(0, 4).map((b) => b.toString(16)).join("")
    )
  ].join("_");
  const combinedString = `${timestamp}_${randomValues}_${browserInfo}`;
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(combinedString)
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 16);
};
const generateSessionId = async (kitId) => {
  const timestamp = (/* @__PURE__ */ new Date()).getTime();
  const uniqueId = await generateUniqueId();
  const randomPart = generateRandomString(8);
  return `${kitId}_${timestamp}_${uniqueId}_${randomPart}`;
};
const resolveCountryFromTimezone = (timeZone) => {
  var _a, _b;
  const entry = ((_a = timezoneToCountryCodeMap[timeZone]) == null ? void 0 : _a.a) ? timezoneToCountryCodeMap[timezoneToCountryCodeMap[timeZone].a] : timezoneToCountryCodeMap[timeZone];
  return ((_b = entry == null ? void 0 : entry.c) == null ? void 0 : _b[0]) ?? "Unknown";
};
const postSessionToAnalytics = async (kitId, sessionId, action, preferences, userId) => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const country = resolveCountryFromTimezone(timeZone);
    const domain = window.location.hostname;
    const response = await fetch("https://cookiekit.io/api/consents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        website_id: kitId,
        session_id: sessionId,
        user_id: userId,
        analytics: (preferences == null ? void 0 : preferences.Analytics) ?? false,
        social: (preferences == null ? void 0 : preferences.Social) ?? false,
        advertising: (preferences == null ? void 0 : preferences.Advertising) ?? false,
        consent_method: action || "init",
        consent_version: "1.0",
        user_agent: navigator.userAgent,
        location: country,
        anonymised_ip: "0.0.0.0",
        domain
      })
    });
    if (!response.ok) {
      console.warn("Failed to post consent to analytics:", response.statusText);
    }
  } catch (error) {
    console.warn("Error posting consent to analytics:", error);
  }
};
const isLocalhost = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.");
  }
  return false;
};
const postToAnalyticsIfNotLocalhost = async (cookieKitId, sessionId, action, preferences, userId) => {
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
const CookieManagerContext = createContext(
  null
);
const createConsentStatus = (consented) => ({
  consented,
  timestamp: (/* @__PURE__ */ new Date()).toISOString()
});
const createDetailedConsent = (consented) => ({
  Analytics: createConsentStatus(consented),
  Social: createConsentStatus(consented),
  Advertising: createConsentStatus(consented)
});
const CookieManager = ({
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
  useRef(false);
  useRef(false);
  const tFunction = useMemo(
    () => createTFunction(translations, translationI18NextPrefix),
    [translations, translationI18NextPrefix]
  );
  const [detailedConsent, setDetailedConsent] = useState(() => {
    const storedConsent = getCookie(cookieKey);
    if (storedConsent) {
      try {
        const parsedConsent = JSON.parse(
          storedConsent
        );
        const oldestTimestamp = Math.min(
          ...Object.values(parsedConsent).map(
            (status) => new Date(status.timestamp).getTime()
          )
        );
        const expirationTime = oldestTimestamp + expirationDays * 24 * 60 * 60 * 1e3;
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
  const hasConsent = detailedConsent ? Object.values(detailedConsent).some((status) => status.consented) : null;
  const cookieBlockingManager = useRef(null);
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
              void 0,
              void 0,
              userId
            );
          }
        } catch (error) {
          console.error("Error in session initialization:", error);
        }
      }
    };
    initializeSessionId();
    return () => {
      isMounted = false;
      isInitializing = false;
    };
  }, [cookieKitId, cookieKey, userId]);
  useEffect(() => {
    if (detailedConsent === null && !showManageConsent) {
      setIsVisible(true);
    }
    if (!disableAutomaticBlocking) {
      const currentPreferences = detailedConsent ? {
        Analytics: detailedConsent.Analytics.consented,
        Social: detailedConsent.Social.consented,
        Advertising: detailedConsent.Advertising.consented
      } : null;
      const blockedHosts = [
        ...getBlockedHosts(currentPreferences),
        ...blockedDomains
      ];
      const blockedKeywords = [
        ...getBlockedKeywords(currentPreferences),
        ...blockedDomains
      ];
      if (blockedHosts.length > 0 || blockedKeywords.length > 0) {
        if (!cookieBlockingManager.current) {
          cookieBlockingManager.current = new CookieBlockingManager();
        }
        cookieBlockingManager.current.initialize(blockedHosts, blockedKeywords);
      } else {
        if (cookieBlockingManager.current) {
          cookieBlockingManager.current.cleanup();
        }
      }
    } else {
      if (cookieBlockingManager.current) {
        cookieBlockingManager.current.cleanup();
        cookieBlockingManager.current = null;
      }
    }
    return () => {
      if (cookieBlockingManager.current) {
        cookieBlockingManager.current.cleanup();
      }
    };
  }, [detailedConsent, disableAutomaticBlocking, blockedDomains]);
  const showConsentBanner = () => {
    if (!showManageConsent) {
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
            Advertising: true
          },
          userId
        );
      }
    }
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
            Advertising: false
          },
          userId
        );
      }
    }
    if (onDecline) {
      onDecline();
    }
  };
  const updateDetailedConsent = async (preferences) => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const newConsent = {
      Analytics: { consented: preferences.Analytics, timestamp },
      Social: { consented: preferences.Social, timestamp },
      Advertising: { consented: preferences.Advertising, timestamp }
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
    setIsVisible(false);
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
  useEffect(() => {
    if (enableFloatingButton && detailedConsent) {
      setIsFloatingButtonVisible(true);
    }
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
  const value = {
    hasConsent,
    isDeclined: hasConsent === false,
    detailedConsent,
    showConsentBanner,
    acceptCookies,
    declineCookies,
    updateDetailedConsent
  };
  return /* @__PURE__ */ jsxs(CookieManagerContext.Provider, { value, children: [
    children,
    isVisible && /* @__PURE__ */ jsx(
      CookieConsenter,
      {
        ...props,
        theme,
        tFunction,
        cookieKey,
        onAccept: acceptCookies,
        onDecline: handleManage,
        onManage: handleManage,
        detailedConsent,
        // initialPreferences: detailedConsent ? {
        //   Analytics: detailedConsent.Analytics.consented,
        //   Social: detailedConsent.Social.consented,
        //   Advertising: detailedConsent.Advertising.consented
        // } : void 0
        initialPreferences: {
          Analytics: true,
          Social: false,
          Advertising: true
        } //void 0
      }
    ),
    showManageConsent && createPortal(
      /* @__PURE__ */ jsx("div", { className: "cookie-manager", children: /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: `w-full max-w-lg rounded-xl p-6 ${theme === "light" ? "bg-white/95 ring-1 ring-black/10" : "bg-black/95 ring-1 ring-white/10"}`,
          children: /* @__PURE__ */ jsx(
            ManageConsent,
            {
              tFunction,
              theme,
              onSave: updateDetailedConsent,
              onCancel: handleCancelManage,
              // initialPreferences: detailedConsent ? {
              //   Analytics: detailedConsent.Analytics.consented,
              //   Social: detailedConsent.Social.consented,
              //   Advertising: detailedConsent.Advertising.consented
              // } : void 0,
              initialPreferences: {
                Analytics: true,
                Social: true,
                Advertising: true
              },
              detailedConsent,
              classNames: props.classNames
            }
          )
        }
      ) }) }),
      document.body
    ),
    isFloatingButtonVisible && !isVisible && !showManageConsent && createPortal(
      /* @__PURE__ */ jsx("div", { className: "cookie-manager", children: /* @__PURE__ */ jsx(
        FloatingCookieButton,
        {
          theme,
          onClick: () => {
            setShowManageConsent(true);
            setIsFloatingButtonVisible(false);
          },
          onClose: () => {
            setIsFloatingButtonVisible(false);
          },
          classNames: props.classNames
        }
      ) }),
      document.body
    )
  ] });
};
const useCookieConsent = () => {
  const context = useContext(CookieManagerContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within a CookieManager");
  }
  return context;
};
export {
  CookieConsenter,
  CookieManager,
  useCookieConsent
};
