import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'
import { refDebounced } from './index'

describe('refDebounced', () => {
  beforeEach(() => vi.useFakeTimers())

  afterEach(() => vi.useRealTimers())

  it('updates the latest value at maxWait across repeated calls', async () => {
    const scope = effectScope()
    const source = shallowRef(0)
    const debounced = scope.run(() => refDebounced(source, 100, { maxWait: 150 }))!
    try {
      source.value = 1
      await nextTick()
      await vi.advanceTimersByTimeAsync(80)
      source.value = 2
      await nextTick()
      await vi.advanceTimersByTimeAsync(69)
      expect(debounced.value).toBe(0)
      await vi.advanceTimersByTimeAsync(1)
      expect(debounced.value).toBe(2)
      expect(vi.getTimerCount()).toBe(0)

      source.value = 3
      await nextTick()
      await vi.advanceTimersByTimeAsync(100)
      expect(debounced.value).toBe(3)
    }
    finally {
      scope.stop()
    }
  })

  it.each([50, 500])('does not reject successful updates with maxWait %s', async (maxWait) => {
    const scope = effectScope()
    const source = shallowRef(0)
    const debounced = scope.run(() => refDebounced(source, 100, { maxWait, rejectOnCancel: true }))!
    try {
      source.value = 1
      await nextTick()
      await vi.runAllTimersAsync()
      expect(debounced.value).toBe(1)
      expect(vi.getTimerCount()).toBe(0)
    }
    finally {
      scope.stop()
    }
  })
})
