/**
 * Server side tools
 */

export function generateLogWithTimestamp(...messages: any[]): string {
  const timestamp = new Date().toISOString();
  // Use the Array.prototype.map method to convert all elements to strings
  // Then use the Array.prototype.join method to concatenate all the strings
  return timestamp + " " + messages.map(String).join("");
}
