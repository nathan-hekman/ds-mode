import type { SessionMessage } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'ds-tldr',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

const USAGE = {
  input_tokens: 10,
  output_tokens: 10,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
}

const ROWS: SessionMessage[] = [
  { role: 'user', text: 'make a tldr band', toolUses: [], uuid: 'u1' },
  { role: 'assistant', text: 'Built the band.', toolUses: [], uuid: 'u2' },
]

test('a turn ends and the band shows the new TLDR, on every surface', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  let prompts = 0
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('session.messages', () => ({ value: ROWS }))
  on('model.complete', () => {
    prompts += 1
    return {
      value: {
        isAnswered: true,
        text: '- Goal: a TLDR band above the prompt\nDone: built the band\nNext: polish it\nYour move: pick a layout\nnoise line',
        usage: USAGE,
      },
    }
  })
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await clock.advance(2000) // the first-build timer runs once
  await $.turn.complete({
    answer: 'Built the band.',
    durationMs: 10,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
  })
  await clock.advance(500)

  expect(prompts).toBeGreaterThan(0)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /^☻ TLDR$/ }))?.text).toBe('☻ TLDR')
    expect((await ui.find({ type: 'Text', text: /^Goal/ }))?.text).toBe('Goal')
    expect((await ui.find({ type: 'Text', text: /above the prompt/ }))?.text).toBe(
      'a TLDR band above the prompt',
    )
    expect((await ui.find({ type: 'Text', text: /built the band/ }))?.text).toBe('built the band')
    expect(await ui.find({ type: 'Text', text: /noise/ })).toBeUndefined()
    // Next and Your move never both show; Your move wins.
    expect(await ui.find({ type: 'Text', text: /polish it/ })).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: /^Your move$/ }))?.text).toBe('Your move')
    await ui.unmount()
  }
})

test('a reopened session shows its saved TLDR without a model call', async ($, on) => {
  mock.clock(on)
  mock.store(on, {
    's:sess-2': { lines: ['Goal: ship the mod'], updatedAt: 0, lastUuid: 'u2' },
  })
  let prompts = 0
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'sess-2' }))
  on('model.complete', () => {
    prompts += 1
    return { value: { isAnswered: true, text: 'Goal: x', usage: USAGE } }
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /ship the mod/ }))?.text).toBe('ship the mod')
  expect(prompts).toBe(0)
  await ui.unmount()
})

test('each section is a header with its detail below', async ($, on) => {
  mock.clock(on)
  mock.store(on, {
    's:sess-3': { lines: ['Goal: ship it', 'Waiting on you: pick a style'], updatedAt: 0 },
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'sess-3' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /^Your move$/ }))?.text).toBe('Your move')
    expect((await ui.find({ type: 'Text', text: /^pick a style$/ }))?.text).toBe('pick a style')
    expect((await ui.find({ type: 'Text', text: /^⚑$/ }))?.text).toBe('⚑')
    expect((await ui.find({ type: 'Text', text: /^◎$/ }))?.text).toBe('◎')
    expect(await ui.find({ type: 'Button', key: 'style' })).toBeUndefined()
    await ui.unmount()
  }
})

test('no TLDR yet: the band draws nothing of its own', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})
