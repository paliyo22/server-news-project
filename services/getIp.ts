import type { Request } from 'express';

/**
 * Retrieves the client's IPv4 address from the request.
 *
 * Checks the 'x-forwarded-for' header (used by proxies) first.
 * If not available, falls back to the remote address from the socket.
 * Returns null if no valid IPv4 address is found.
 *
 * @param {Request} req - The Express request object.
 * @returns {string | null} The client's IPv4 address, or null if not found.
 */
export function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  
  if (typeof forwardedFor === 'string' && forwardedFor.trim() !== '') {
    const parts = forwardedFor.split(',');
    const first = parts[0]?.trim();
    if (first && isIPv4(first)) {
      return first;
    }
  }

  const remote = req.socket.remoteAddress;

  if (typeof remote === 'string' && remote.trim() !== '') {
    const cleaned = remote.replace(/^::ffff:/, '').trim();
    if (isIPv4(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Checks if a given string is a valid IPv4 address.
 *
 * @param {string} ip - The IP address to validate.
 * @returns {boolean} True if the string is a valid IPv4 address, false otherwise.
 */
function isIPv4(ip: string): boolean {
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4][0-9]|1\d\d|[1-9]?\d)){3}$/;
  return ipv4Regex.test(ip);
}