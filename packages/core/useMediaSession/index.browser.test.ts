import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { useMediaSession } from './index'

class MockMediaMetadata {
  album?: string
  artist?: string
  artwork?: MediaImage[]
  title?: string

  constructor(init: MediaMetadataInit = {}) {
    Object.assign(this, init)
  }
}

function defineMediaSessionAPI() {
  const mediaSession = {
    metadata: undefined as MediaMetadata | undefined,
    playbackState: 'none' as MediaSessionPlaybackState,
    setPositionState: vi.fn(),
    setActionHandler: vi.fn(),
    setCameraActive: vi.fn(),
    setMicrophoneActive: vi.fn(),
  }

  Object.defineProperty(navigator, 'mediaSession', {
    value: mediaSession,
    configurable: true,
    writable: true,
  })

  return mediaSession
}

describe('useMediaSession', () => {
  beforeEach(() => {
    vi.stubGlobal('MediaMetadata', MockMediaMetadata)
    defineMediaSessionAPI()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should be defined', () => {
    expect(useMediaSession).toBeDefined()
  })

  it('syncs metadata and playback state with navigator.mediaSession', async () => {
    const TestComponent = defineComponent({
      setup() {
        return { session: useMediaSession() }
      },
      template: '<div />',
    })

    const wrapper = mount(TestComponent)
    const { session } = wrapper.vm

    session.title.value = 'Title'
    session.artist.value = 'Artist'
    session.album.value = 'Album'
    session.artwork.value = [{ src: '/art.png', sizes: '96x96', type: 'image/png' }]
    session.playbackState.value = 'playing'

    await nextTick()

    expect(navigator.mediaSession.metadata).toBeInstanceOf(MockMediaMetadata)
    expect(navigator.mediaSession.metadata).toMatchObject({
      title: 'Title',
      artist: 'Artist',
      album: 'Album',
      artwork: [{ src: '/art.png', sizes: '96x96', type: 'image/png' }],
    })
    expect(navigator.mediaSession.playbackState).toBe('playing')
  })

  it('syncs position state and action handlers', async () => {
    const TestComponent = defineComponent({
      setup() {
        return { session: useMediaSession() }
      },
      template: '<div />',
    })

    const wrapper = mount(TestComponent)
    const { session } = wrapper.vm

    session.duration.value = 120
    session.playbackRate.value = 1.5
    session.position.value = 42

    const playHandler = vi.fn()
    session.actionHandlers.value = { play: playHandler }

    await nextTick()

    expect(navigator.mediaSession.setPositionState).toHaveBeenCalledWith({
      duration: 120,
      playbackRate: 1.5,
      position: 42,
    })
    expect(navigator.mediaSession.setActionHandler).toHaveBeenCalledWith('play', playHandler)
  })

  it('updates camera and microphone state when supported', async () => {
    const TestComponent = defineComponent({
      setup() {
        return { session: useMediaSession() }
      },
      template: '<div />',
    })

    const wrapper = mount(TestComponent)
    const { session } = wrapper.vm

    session.cameraActive.value = true
    session.microphoneActive.value = true

    await nextTick()

    expect(navigator.mediaSession.setCameraActive).toHaveBeenCalledWith(true)
    expect(navigator.mediaSession.setMicrophoneActive).toHaveBeenCalledWith(true)
  })

  it('clears media session state', async () => {
    const TestComponent = defineComponent({
      setup() {
        return { session: useMediaSession() }
      },
      template: '<div />',
    })

    const wrapper = mount(TestComponent)
    const { session } = wrapper.vm

    session.title.value = 'Title'
    session.playbackState.value = 'playing'
    session.actionHandlers.value = { play: vi.fn() }

    await nextTick()

    session.clear()
    await nextTick()

    expect(session.title.value).toBeUndefined()
    expect(session.playbackState.value).toBe('none')
    expect(session.actionHandlers.value).toEqual({})
    expect(navigator.mediaSession.setActionHandler).toHaveBeenLastCalledWith('play', null)
  })
})
