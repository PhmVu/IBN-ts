export function parseJwt(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

export function getExpiryTime(token: string): Date {
  const decoded = parseJwt(token);
  return new Date((decoded.exp as number) * 1000);
}

export function isTokenExpired(token: string): boolean {
  return getExpiryTime(token) < new Date();
}
