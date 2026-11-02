let generation = 0;

export function mcpInProgressGeneration(): number {
  return generation;
}

export function captureMcpInProgressGeneration(): number {
  return generation;
}

export function setMcpInProgressGeneration(value: number): void {
  generation = value;
}

export function bumpMcpInProgressGenerationLocal(): void {
  generation += 1;
}

export function isMcpInProgressCommitStale(captured: number): boolean {
  return captured !== generation;
}
