import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import { debouncedWatch, watchDebounced } from './index'

describe('watchDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([50, 500])('forwards async callback errors with maxWait %s to Vue', async (maxWait) => {
    const source = shallowRef(0)
    const error = new Error('callback failed')
    const errorHandler = vi.fn()
    const wrapper = mount({
      setup() {
        watchDebounced(source, async () => {
          await Promise.resolve()
          throw error
        }, { debounce: 100, maxWait })
        return () => null
      },
    }, { global: { config: { errorHandler } } })
    try {
      source.value++
      await nextTick()
      await vi.runAllTimersAsync()
      expect(errorHandler).toHaveBeenCalledOnce()
      expect(errorHandler.mock.calls[0][0]).toBe(error)
    }
    finally {
      wrapper.unmount()
    }
  })

  it('preserves source changes made by the debounced callback', async () => {
    const source = shallowRef(0)
    const cb = vi.fn((value: number) => {
      if (value === 1)
        source.value = 2
    })
    const stop = watchDebounced(source, cb, { debounce: 100, maxWait: 50, flush: 'sync' })
    try {
      source.value = 1
      await vi.advanceTimersByTimeAsync(50)
      expect(cb.mock.calls).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(50)
      expect(cb.mock.calls.map(([value]) => value)).toEqual([1, 2])
      expect(vi.getTimerCount()).toBe(0)
    }
    finally {
      stop()
    }
  })

  it('should export module', () => {
    expect(watchDebounced).toBeDefined()
    expect(debouncedWatch).toBeDefined()
  })

  it('should work by default', async () => {
    const num = shallowRef(0)
    const cb = vi.fn()
    watchDebounced(num, cb)

    num.value = 1
    await nextTick()
    expect(cb).toHaveBeenCalledWith(1, 0, expect.anything())
  })

  it('should work when set debounce and maxWait', async () => {
    const num = shallowRef(0)
    const cb = vi.fn()
    watchDebounced(num, cb, { debounce: 100, maxWait: 150 })

    num.value = 1
    await nextTick()
    expect(cb).toHaveBeenCalledTimes(0)

    num.value = 2
    await vi.advanceTimersByTimeAsync(50)
    expect(cb).toHaveBeenCalledTimes(0)

    await vi.advanceTimersByTimeAsync(50)
    expect(cb).toHaveBeenCalledWith(2, 1, expect.anything())

    num.value = 4
    await vi.advanceTimersByTimeAsync(80)
    expect(cb).toHaveBeenCalledTimes(1)

    num.value = 5
    await vi.advanceTimersByTimeAsync(75)
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenCalledWith(5, 4, expect.anything())
  })

  it('should work with constant changes over multiple maxWaits', async () => {
    const num = shallowRef(0)
    const cb = vi.fn()

    const constantUpdateOverTime = async (ms: number) => {
      for (let i = 0; i < ms; i++) {
        num.value += 1
        await vi.advanceTimersByTimeAsync(1)
      }
    }
    watchDebounced(num, cb, { debounce: 10, maxWait: 50 })
    expect(cb).toHaveBeenCalledTimes(0)
    await constantUpdateOverTime(49)
    expect(cb).toHaveBeenCalledTimes(0)
    await constantUpdateOverTime(1)
    expect(cb).toHaveBeenCalledTimes(1)
    await constantUpdateOverTime(50)
    expect(cb).toHaveBeenCalledTimes(2)
    await constantUpdateOverTime(50)

    expect(cb).toHaveBeenCalledTimes(3)
    expect(cb.mock.calls[0][0]).toBe(50)
    expect(cb.mock.calls[1][0]).toBe(100)
    expect(cb.mock.calls[2][0]).toBe(150)
  })
})
