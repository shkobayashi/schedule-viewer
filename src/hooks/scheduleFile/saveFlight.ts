export function claimSave(
  flight: { current: boolean },
  fileBusy: boolean,
): boolean {
  if (flight.current || fileBusy) return false;
  flight.current = true;
  return true;
}

export function releaseSave(flight: { current: boolean }): void {
  flight.current = false;
}

export async function withSaveFlight(
  flight: { current: boolean },
  fileBusy: boolean,
  work: () => Promise<void>,
): Promise<boolean> {
  if (!claimSave(flight, fileBusy)) return false;
  try {
    await work();
    return true;
  } finally {
    releaseSave(flight);
  }
}
