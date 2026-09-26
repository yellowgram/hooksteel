/**
 * Fixed whsec_ test secret. The base64 remainder decodes to bytes that are
 * not the UTF-8 of the full secret, so both HMAC eras are distinct keys.
 * Signatures are minted at runtime; nothing timestamped is checked in.
 */
export const POLAR_TEST_WEBHOOK_SECRET =
  'whsec_aG9va3N0ZWVsIHBvbGFyIHRlc3Qga2V5IG1hdGVyaWFsISE=';
