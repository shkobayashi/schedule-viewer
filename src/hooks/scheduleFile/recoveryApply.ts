export async function applyAfterAccept(input: {
  abortIfMovedOn: boolean;
  movedOn: () => boolean;
  accept: () => Promise<void>;
  apply: () => boolean;
}): Promise<boolean> {
  if (input.abortIfMovedOn && input.movedOn()) return false;
  await input.accept();
  if (input.abortIfMovedOn && input.movedOn()) return false;
  return input.apply();
}
