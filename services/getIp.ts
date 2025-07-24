import type { Request } from 'express';

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

function isIPv4(ip: string): boolean {
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4][0-9]|1\d\d|[1-9]?\d)){3}$/;
  return ipv4Regex.test(ip);
}