export function localAccountKey(accountId: string) {
  return `budgetyar-account-local-v1:${accountId || 'anonymous'}`
}

export function planLocalAccountSwitch(previousId: string, nextId: string, current: string, target: string | null, empty: string) {
  if (previousId === nextId) return { saves: [] as Array<[string, string]>, restore: null as string | null }
  if (!previousId && nextId && !target) {
    return {
      saves: [[localAccountKey(''), empty], [localAccountKey(nextId), current]] as Array<[string, string]>,
      restore: null,
    }
  }
  return {
    saves: [[localAccountKey(previousId), current]] as Array<[string, string]>,
    restore: target ?? empty,
  }
}
