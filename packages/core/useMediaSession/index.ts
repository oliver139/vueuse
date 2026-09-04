import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import { tryOnMounted } from '@vueuse/shared'
import { shallowRef, toValue, watchEffect } from 'vue'
import { useSupported } from '../useSupported'

/**
 * Many of the jsdoc definitions here are modified version of the
 * documentation from MDN(https://developer.mozilla.org/en-US/docs/Web/API/MediaSession)
 */

export interface UseMediaSessionOptions {
  /**
   * The **`album`** property of the MediaMetadata interface returns or sets the name of the album or collection containing the media to be played.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/MediaMetadata/album)
   */
  album?: MaybeRefOrGetter<string>
  /**
   * The **`artist`** property of the MediaMetadata interface returns or sets the name of the artist, group, creator, etc., of the media to be played.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/MediaMetadata/artist)
   */
  artist?: MaybeRefOrGetter<string>
  /**
   * The **`artwork`** property of the MediaMetadata interface returns or sets an array of objects representing images associated with playing media.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/MediaMetadata/artwork)
   */
  artwork?: MaybeRefOrGetter<MediaImage[]>
  /**
   * The **`title`** property of the MediaMetadata interface returns or sets the title of the media to be played.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/MediaMetadata/title)
   */
  title?: MaybeRefOrGetter<string>
  /**
   * A floating-point value giving the total duration of the current media in seconds.
   * This should always be a positive number, with positive infinity (`Infinity`) indicating media
   * without a defined end, such as a live stream.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setPositionState)
   */
  duration?: MaybeRefOrGetter<number>
  /**
   * A floating-point value indicating the rate at which the media is being played,
   * as a ratio relative to its normal playback speed. Thus, a value of 1 is playing at normal speed,
   * 2 is playing at double speed, and so forth. Negative values indicate that the media is playing in reverse;
   * -1 indicates playback at the normal speed but backward, -2 is double speed in reverse, and so on.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setPositionState)
   */
  playbackRate?: MaybeRefOrGetter<number>
  /**
   * A floating-point value indicating the last reported playback position of the media in seconds.
   * This must always be a positive value.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setPositionState)
   */
  position?: MaybeRefOrGetter<number>
  /**
   * The playbackState property of the MediaSession interface indicates
   * whether the current media session is playing or paused.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/playbackState)
   */
  playbackState?: MaybeRefOrGetter<MediaSessionPlaybackState>
  /**
   * Handlers for a media session action. These actions let a web app receive notifications
   * when the user engages a device's built-in physical or onscreen media controls,
   * such as play, stop, or seek buttons.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setActionHandler)
   */
  actionHandlers?: MaybeRefOrGetter<Partial<Record<MediaSessionAction, MediaSessionActionHandler>>>
}

export interface UseMediaSessionReturn {
  album: ShallowRef<MediaMetadataInit['album']>
  artist: ShallowRef<MediaMetadataInit['artist']>
  artwork: ShallowRef<MediaMetadataInit['artwork']>
  title: ShallowRef<MediaMetadataInit['title']>

  duration: ShallowRef<number>
  playbackRate: ShallowRef<number>
  position: ShallowRef<number>

  playbackState: ShallowRef<MediaSessionPlaybackState>

  cameraActive: ShallowRef<boolean>
  microphoneActive: ShallowRef<boolean>
}

/**
 * Reactive Media Query.
 *
 * @see https://vueuse.org/useMediaSession
 * @param options
 */
export function useMediaSession(options: UseMediaSessionOptions = {}) {
  const isSupported = useSupported(() => navigator && 'mediaSession' in navigator)
  if (!isSupported.value)
    throw new Error('Media Session API is not supported by your browser.')

  const {
    album,
    artist,
    artwork,
    title,

    duration,
    playbackRate,
    position,

    playbackState = 'none',

    actionHandlers = {},
  } = options
  const cameraActive = shallowRef(false)
  const microphoneActive = shallowRef(false)

  const isSetCameraSupported = useSupported(() => navigator && 'mediaSession' in navigator && 'setCameraActive' in navigator.mediaSession)
  const isSetMicrophoneSupported = useSupported(() => navigator && 'mediaSession' in navigator && 'setMicrophoneActive' in navigator.mediaSession)

  if (isSetCameraSupported.value) {
    watchEffect(() => navigator.mediaSession.setCameraActive(cameraActive.value))
  }
  else {
    console.error('mediaSession.setCameraActive() is not supported by your browser.')
  }

  if (isSetMicrophoneSupported.value) {
    watchEffect(() => navigator.mediaSession.setCameraActive(microphoneActive.value))
  }
  else {
    console.error('mediaSession.setMicrophoneActive() is not supported by your browser.')
  }

  tryOnMounted(() => {
    watchEffect(() => {
      navigator.mediaSession.metadata = new MediaMetadata({
        album: toValue(album),
        artist: toValue(artist),
        artwork: toValue(artwork),
        title: toValue(title),
      })
    })

    watchEffect(() => {
      navigator.mediaSession.playbackState = toValue(playbackState)
    })

    watchEffect(() => {
      navigator.mediaSession.setPositionState({
        duration: toValue(duration),
        playbackRate: toValue(playbackRate),
        position: toValue(position),
      })
    })

    watchEffect(() => {
      // Maybe one by one?
      Object.entries(toValue(actionHandlers)).forEach(([action, handler]) => {
        navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler)
      })
    })
  })
}
