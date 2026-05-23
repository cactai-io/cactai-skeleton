// config/design/tokens.ts
// Design tokens — all token keys present, values populated by the agent during workflow Stage 3.
// DO NOT edit values directly. The agent reads skeleton.config.json theme section and writes here.
// /config/theme/active.ts is generated from this file — never edit that file directly.
//
// Token keys are the authoritative list. Add keys here (with comments) before asking the agent
// to populate them.

export interface DesignTokens {
  // Colors
  colorBrand:        string;
  colorBrandDark:    string;
  colorBrandLight:   string;
  colorSurface:      string;
  colorSurface2:     string;
  colorCanvas:       string;
  colorBorder:       string;
  colorTextPrimary:  string;
  colorTextSecondary:string;
  colorTextTertiary: string;
  colorSuccess:      string;
  colorWarning:      string;
  colorError:        string;

  // Typography
  fontFamilyBase:    string;  // e.g. 'Inter, system-ui, sans-serif'
  fontFamilyMono:    string;  // e.g. 'JetBrains Mono, monospace'
  fontSizeBase:      string;  // e.g. '14px'
  fontSizeSm:        string;
  fontSizeLg:        string;
  fontWeightNormal:  number;
  fontWeightMedium:  number;
  fontWeightBold:    number;
  lineHeightBase:    number;

  // Spacing
  spacingUnit:       string;  // base unit, e.g. '4px'

  // Border radius
  radiusSm:          string;
  radiusMd:          string;
  radiusLg:          string;
  radiusPill:        string;

  // Shadows
  shadowSm:          string;
  shadowMd:          string;
  shadowLg:          string;

  // Transitions
  transitionFast:    string;  // e.g. '120ms ease'
  transitionBase:    string;  // e.g. '200ms ease'
}

// Empty token values — populated by the agent. Do not set values here.
export const tokens: DesignTokens = {
  colorBrand:         '',
  colorBrandDark:     '',
  colorBrandLight:    '',
  colorSurface:       '',
  colorSurface2:      '',
  colorCanvas:        '',
  colorBorder:        '',
  colorTextPrimary:   '',
  colorTextSecondary: '',
  colorTextTertiary:  '',
  colorSuccess:       '',
  colorWarning:       '',
  colorError:         '',
  fontFamilyBase:     '',
  fontFamilyMono:     '',
  fontSizeBase:       '',
  fontSizeSm:         '',
  fontSizeLg:         '',
  fontWeightNormal:   400,
  fontWeightMedium:   500,
  fontWeightBold:     700,
  lineHeightBase:     1.55,
  spacingUnit:        '',
  radiusSm:           '',
  radiusMd:           '',
  radiusLg:           '',
  radiusPill:         '',
  shadowSm:           '',
  shadowMd:           '',
  shadowLg:           '',
  transitionFast:     '',
  transitionBase:     '',
};
