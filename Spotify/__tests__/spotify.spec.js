import {
  jest,
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
  test,
  expect,
} from '@jest/globals'
import Spotify, { SpotifyErrors } from '../'

// jest.mock('spotify-web-api-node')
/**
 * @TODO recheck all tests after figuring out how to make both libraries play well together with a single session
 */

describe('Spotify Integration', () => {
  /**@type {import('react-native-spotify-remote').SpotifySession} */
  const validSpotifySession = {
    accessToken: 'VALID ACCESS TOKEN',
    refreshToken: 'VALID REFRESH TOKEN',
    expirationDate: 'Some java-stringified date object',
    scope: [],
    expired: false,
  }
  /**@type {import('react-native-spotify-remote').SpotifySession} */
  const expiredSpotifySession = {
    accessToken: 'EXPIRED ACCESS TOKEN',
    refreshToken: 'VALID REFRESH TOKEN',
    expirationDate: 'Some java-stringified date object',
    scope: [],
    expired: true,
  }
  it('Should be pre-instantiated', () => {
    expect(Spotify).toBeDefined()
  })

  describe('Refreshing Session', () => {
    const deInitSpy = jest.spyOn(Spotify, 'deInit')
    beforeEach(async () => {
      deInitSpy.mockReset()
      Spotify.auth.getSession.mockReset()
      Spotify.auth.authorize.mockReset()
      Spotify.webApi.setAccessToken.mockReset()
    })

    it('Should get a new session if there is no active session', async () => {
      Spotify.auth.getSession.mockResolvedValue(undefined)
      Spotify.auth.authorize.mockResolvedValue(validSpotifySession)

      const session = await Spotify.refreshSession()

      expect.assertions(6)
      expect(session).toEqual(validSpotifySession)
      expect(Spotify.webApi.setAccessToken).toHaveBeenCalledWith(
        validSpotifySession.accessToken,
      )
      expect(Spotify.webApi.setAccessToken).toHaveBeenCalledTimes(1)
      expect(Spotify.auth.getSession).toHaveBeenCalledTimes(1)
      expect(Spotify.auth.authorize).toHaveBeenCalledTimes(1)
      expect(deInitSpy).not.toHaveBeenCalled()
    })
    it('Should not refresh a session if it hasnt expired', async () => {
      Spotify.auth.getSession.mockResolvedValue(validSpotifySession)

      const session = await Spotify.refreshSession()

      expect.assertions(6)
      expect(session).toEqual(validSpotifySession)
      expect(Spotify.webApi.setAccessToken).toHaveBeenCalledTimes(1)
      expect(Spotify.webApi.setAccessToken).toHaveBeenCalledWith(
        validSpotifySession.accessToken,
      )
      expect(Spotify.auth.getSession).toHaveBeenCalledTimes(1)
      expect(Spotify.auth.authorize).not.toHaveBeenCalled()
      expect(deInitSpy).not.toHaveBeenCalled()
    })
    it('Should refresh an expired session if requested', async () => {
      Spotify.auth.getSession.mockResolvedValue(expiredSpotifySession)
      Spotify.auth.authorize.mockResolvedValue(validSpotifySession)

      const session = await Spotify.refreshSession()

      expect.assertions(7)
      expect(session).toEqual(validSpotifySession)
      expect(session).not.toEqual(expiredSpotifySession)
      expect(Spotify.webApi.setAccessToken).toHaveBeenCalledWith(
        validSpotifySession.accessToken,
      )
      expect(Spotify.webApi.setAccessToken).toHaveBeenCalledTimes(1)
      expect(Spotify.auth.getSession).toHaveBeenCalledTimes(1)
      expect(Spotify.auth.authorize).toHaveBeenCalledTimes(1)
      expect(deInitSpy).not.toHaveBeenCalled()
    })
    it('Should throw an error if authorization fails', async () => {
      Spotify.auth.getSession.mockResolvedValue(undefined)
      Spotify.auth.authorize.mockResolvedValue(undefined)
      let session, error

      expect.assertions(3)
      try {
        session = await Spotify.refreshSession()
      } catch (err) {
        error = err
      }
      expect(session).not.toBeDefined()
      expect(error).toEqual(SpotifyErrors.newSessionUndefined)
      expect(deInitSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Web Api', () => {
    const numPlaylists = 10
    const playlistItems = new Array(numPlaylists)
      .fill('', 0, numPlaylists)
      .map((_, index) => ({
        name: `Playlist ${index}`,
        uri: `URI-playlist-${index}`,
      }))
    beforeAll(() => {
      Spotify.auth.authorize.mockResolvedValue(validSpotifySession)
      Spotify.auth.getSession.mockResolvedValue(validSpotifySession)
      Spotify.webApi.getUserPlaylists.mockResolvedValue({
        body: {
          items: playlistItems,
        },
      })
    })
    beforeEach(() => {
      Spotify.deInit()
    })
    it('Tries to refresh the session when getting the users playlists', async () => {
      const refreshSpy = jest.spyOn(Spotify, 'refreshSession')
      refreshSpy.mockClear()

      try {
        await Spotify.getOwnPlaylists()
      } catch (err) {}

      expect.assertions(1)
      expect(refreshSpy).toHaveBeenCalledTimes(1)

      refreshSpy.mockClear()
    })

    it('Gets the users own playlist', async () => {
      let error
      let playlists
      try {
        playlists = await Spotify.getOwnPlaylists()
      } catch (err) {
        error = err
      }
      expect.assertions(2)
      expect(error).toBeUndefined()
      expect(playlists?.items).toEqual(playlistItems)
    })
  })

  describe('Remote player Api', () => {
    beforeAll(() => {
      Spotify.auth.authorize.mockResolvedValue(validSpotifySession)
      Spotify.auth.getSession.mockResolvedValue(validSpotifySession)
    })
    beforeEach(() => {
      Spotify.deInit()
    })

    describe('Refreshes session when', () => {
      const refreshSpy = jest.spyOn(Spotify, 'refreshSession')
      beforeAll(() => {
        Spotify.auth.authorize.mockResolvedValue(validSpotifySession)
        Spotify.auth.getSession.mockResolvedValue(validSpotifySession)
        Spotify.remote.getPlayerState.mockResolvedValue({
          playbackRestrictions: {
            canSeek: true,
          },
        })
      })
      beforeEach(() => {
        Spotify.deInit()
        refreshSpy.mockClear()
      })

      afterAll(() => {
        refreshSpy.mockClear()
      })

      it('Connecting', async () => {
        let error
        try {
          await Spotify.connectRemote()
        } catch (err) {
          error = err
        }

        expect.assertions(2)
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(error).toBeUndefined()
      })

      it('Getting the player state', async () => {
        let error
        try {
          await Spotify.getPlayerState()
        } catch (err) {
          error = err
        }

        expect.assertions(2)
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(error).toBeUndefined()
      })

      it('Starting playback', async () => {
        let error
        try {
          await Spotify.play('anything')
        } catch (err) {
          error = err
        }

        expect.assertions(2)
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(error).toBeUndefined()
      })

      it('Stopping playback', async () => {
        let error
        try {
          await Spotify.stop()
        } catch (err) {
          error = err
        }

        expect.assertions(2)
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(error).toBeUndefined()
      })

      it('Resuming playback', async () => {
        let error
        try {
          await Spotify.resume()
        } catch (err) {
          error = err
        }

        expect.assertions(2)
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(error).toBeUndefined()
      })

      it('Pausing playback', async () => {
        let error
        try {
          await Spotify.pause()
        } catch (err) {
          error = err
        }

        expect.assertions(2)
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(error).toBeUndefined()
      })

      it('Skipping to next track', async () => {
        let error
        try {
          await Spotify.skipNext()
        } catch (err) {
          error = err
        }

        expect.assertions(2)
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(error).toBeUndefined()
      })

      it('Skipping to previous track', async () => {
        let error
        try {
          await Spotify.skipPrev()
        } catch (err) {
          error = err
        }

        expect.assertions(2)
        expect(refreshSpy).toHaveBeenCalledTimes(1)
        expect(error).toBeUndefined()
      })
    })

    describe('Automatically connects when', () => {
      const connectSpy = jest.spyOn(Spotify, 'connectRemote')

      beforeEach(() => {
        connectSpy.mockClear()
      })
      afterEach(() => {
        connectSpy.mockClear()
      })

      it('Starting playback', async () => {
        try {
          await Spotify.play('anything')
        } catch (err) {}

        expect.assertions(1)
        expect(connectSpy).toHaveBeenCalledTimes(1)
      })

      it('Stopping playback', async () => {
        try {
          await Spotify.stop()
        } catch (err) {}

        expect.assertions(1)
        expect(connectSpy).toHaveBeenCalledTimes(1)
      })

      it('Resuming playback', async () => {
        try {
          await Spotify.resume()
        } catch (err) {}

        expect.assertions(1)
        expect(connectSpy).toHaveBeenCalledTimes(1)
      })

      it('Pausing playback', async () => {
        try {
          await Spotify.pause()
        } catch (err) {}

        expect.assertions(1)
        expect(connectSpy).toHaveBeenCalledTimes(1)
      })

      it('Skipping to the next track', async () => {
        try {
          await Spotify.skipNext()
        } catch (err) {}

        expect.assertions(1)
        expect(connectSpy).toHaveBeenCalledTimes(1)
      })

      it('Skipping to the previous track', async () => {
        try {
          await Spotify.skipPrev()
        } catch (err) {}

        expect.assertions(1)
        expect(connectSpy).toHaveBeenCalledTimes(1)
      })
    })
  })
})
