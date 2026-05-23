declare const __IS_INTERNAL_BUILD__: boolean;

export const IS_INTERNAL_BUILD: boolean = typeof __IS_INTERNAL_BUILD__ !== 'undefined' ? __IS_INTERNAL_BUILD__ : false;
