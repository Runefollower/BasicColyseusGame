

export function logWithTimestamp(...messages) {
    const timestamp = new Date().toISOString();
    console.log(timestamp, ...messages);
  }