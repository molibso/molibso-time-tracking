import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";

const ISSUER = "molibso";

function totpFor(secret: string, label: string) {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

export function createTotpSecret() {
  return new Secret({ size: 20 }).base32;
}

export function totpKeyUri(secret: string, email: string) {
  return totpFor(secret, email).toString();
}

export async function totpQrDataUrl(secret: string, email: string) {
  return QRCode.toDataURL(totpKeyUri(secret, email), {
    margin: 1,
    width: 196,
    color: { dark: "#111111", light: "#ffffff" },
  });
}

/** True when the 6-digit code matches, allowing one step of clock drift. */
export function verifyTotp(secret: string, code: string) {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  return totpFor(secret, ISSUER).validate({ token, window: 1 }) !== null;
}
