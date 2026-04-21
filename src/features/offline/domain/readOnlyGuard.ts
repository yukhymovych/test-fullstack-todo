export class OfflineReadOnlyError extends Error {
  constructor(message = 'This action is disabled in offline mode.') {
    super(message);
    this.name = 'OfflineReadOnlyError';
  }
}

export function assertWritable(isReadOnly: boolean): void {
  if (isReadOnly) throw new OfflineReadOnlyError();
}
