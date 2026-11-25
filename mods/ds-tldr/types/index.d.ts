export type Summary = {
  /** 2-5 short labelled lines, e.g. "Done: made the branch". */
  lines: string[]
  /** When the lines were written, ms since the epoch. */
  updatedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'ds-tldr': { summary: Summary | null; isRefreshing: boolean; style: number }
  }
}
