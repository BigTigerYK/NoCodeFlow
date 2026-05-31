interface InvokeResult<T = unknown> {
  data?: T;
  error?: string;
}

export async function ipcInvoke<T = unknown>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  const result = (await window.api.invoke(
    channel,
    ...args,
  )) as InvokeResult<T>;
  if (result.error) {
    throw new Error(result.error);
  }
  return result.data as T;
}
