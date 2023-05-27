/**
 * Server side tools
 */

export function logWithTimestamp(...messages): void {
  const timestamp = new Date().toISOString();
  console.log(timestamp, ...messages);
}
