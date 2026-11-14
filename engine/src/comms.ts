/** Daily data bucket: generated vs downlinked, with onboard storage that overflows. */

/** Downlink capacity per day, MB, from radio rate (Mbit/s) and contact minutes per day. */
export function downlinkMBPerDay(downlinkMbps: number, contactMinPerDay: number): number {
  return (downlinkMbps * contactMinPerDay * 60) / 8;
}

export interface CommsDay {
  downlinkedMB: number;
  storedMB: number;
  lostMB: number;
}

/** One day: the buffer plus today's data is downlinked up to capacity; what exceeds storage is lost. */
export function commsDay(storedMB: number, generatedMB: number, capacityMB: number, storageMB: number): CommsDay {
  const avail = storedMB + generatedMB;
  const downlinkedMB = Math.min(avail, capacityMB);
  const left = avail - downlinkedMB;
  const lostMB = Math.max(0, left - storageMB);
  return { downlinkedMB, storedMB: left - lostMB, lostMB };
}
