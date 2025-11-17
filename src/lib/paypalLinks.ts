import type { PayPalLinkInfo, PayPalRole, UserProfile } from '@/types';

const legacyFieldForRole: Record<PayPalRole, keyof UserProfile> = {
  guest: 'paypalEmail',
  host: 'hostPayPalEmail',
  admin: 'adminPayPalEmail'
};

const legacyVerifiedField: Record<PayPalRole, (keyof UserProfile)[]> = {
  guest: ['paypalEmailVerified', 'paypalOAuthVerified'],
  host: ['hostPayPalEmailVerified', 'hostPayPalOAuthVerified'],
  admin: ['adminPayPalEmailVerified', 'adminPayPalOAuthVerified']
};

export const getPayPalLinkPath = (role: PayPalRole) => `paypalLinks.${role}`;

export const buildClientLinkedInfo = (email: string | null, role: PayPalRole): PayPalLinkInfo => ({
  email,
  payerId: email ? `client-${role}-${email}` : null,
  accessToken: email ? `client-only-token-${role}` : null,
  refreshToken: email ? `client-only-refresh-${role}` : null,
  linkedAt: new Date().toISOString()
});

export const getPayPalLink = (
  userData: Partial<UserProfile> | undefined | null,
  role: PayPalRole
): PayPalLinkInfo | null => {
  if (!userData) return null;
  const mapLink = userData.paypalLinks?.[role];
  if (mapLink?.email) {
    return mapLink as PayPalLinkInfo;
  }

  const legacyEmail = userData[legacyFieldForRole[role]] as string | undefined;
  if (!legacyEmail) {
    return null;
  }

  return {
    email: legacyEmail,
    payerId: `legacy-${role}`,
    accessToken: 'LEGACY_PLACEHOLDER',
    refreshToken: null,
    linkedAt: new Date().toISOString()
  };
};

export const isPayPalLinked = (
  userData: Partial<UserProfile> | undefined | null,
  role: PayPalRole
) => {
  const link = getPayPalLink(userData, role);
  return !!link?.email;
};

export const shouldConsiderLegacyLinked = (
  userData: Partial<UserProfile> | undefined | null,
  role: PayPalRole
) => {
  if (!userData) return false;
  const legacyEmail = userData[legacyFieldForRole[role]];
  if (!legacyEmail) return false;
  return legacyVerifiedField[role].some((key) => Boolean(userData[key]));
};

