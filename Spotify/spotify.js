import SpotifyWebApi from 'spotify-web-api-node'
import { remote, auth } from 'react-native-spotify-remote'
import ApiScope from 'react-native-spotify-remote/dist/ApiScope'
import {
  SpotifyRemoteEvents as SpotifyRemoteEventsObject,
  SpotifyErrors,
} from '.'
import { Platform } from 'react-native'
import config from '../src/config'
/** @typedef {import('react-native-spotify-remote').SpotifySession} SpotifySession */
/** @typedef {import('react-native-spotify-remote').PlayerState} PlayerState */
/** @typedef {import('react-native-spotify-remote').PlayerContext} PlayerContext */
/** @typedef {{offset?: number | undefined; limit?: number | undefined;}} PaginationOptions*/

//  This redirect uri MUST be changed on iOS.  Android does its own thing integrating auth flow with the Spotify App instead of using a swap server.
//  Redirect uri will likely have to be changed to ios' implementation
//  ios redirect uri is <bundle_id>://<user-defined-callback>
const SPOTIFY_REDIRECT_URI = 'regatta-spotify-auth://'
const SPOTIFY_SCOPES = [
  ApiScope.AppRemoteControlScope,
  ApiScope.PlaylistReadPrivateScope,
  ApiScope.PlaylistReadCollaborativeScope,
  ApiScope.UserLibraryReadScope,
  ApiScope.UserModifyPlaybackStateScope,
  ApiScope.UserReadCurrentlyPlayingScope,
]
const SPOTIFY_SESSION_CONFIG = {
  clientID:
    Platform.OS === 'android'
      ? config.SPOTIFY_CLIENT_ID_ANDROID
      : config.SPOTIFY_CLIENT_ID_IOS,
  redirectURL: SPOTIFY_REDIRECT_URI,
  tokenRefreshURL: `${config.API_URL}/refresh`,
  tokenSwapURL: `${config.API_URL}/swap`,
  scopes: SPOTIFY_SCOPES,
  //  THIS TAG ISN'T WORKING
  showDialog: false,
  authType: 'TOKEN',
}

/**
 * Combines Spotify's Web API & Remote API into one.
 */
class Spotify {
  //  Package names and url schemes are used to try to detect if the spotify app is installed
  //  before trying to do auth and having the remote api do that for us.
  //  This is mainly because, currently, the android webview fallback is crap
  androidPackageName = 'com.spotify.music'
  iosUrlScheme = 'spotify-action' // Without the ://   This is likely wrong atm
  webApi = new SpotifyWebApi()
  remote = remote
  auth = auth

  /**@type {SpotifyApi.ListOfUsersPlaylistsResponse} */
  lastPlaylists

  constructor() {
    this.deInit = this.deInit.bind(this)
    this.refreshSession = this.refreshSession.bind(this)
    this.getOwnPlaylists = this.getOwnPlaylists.bind(this)
    this.connectRemote = this.connectRemote.bind(this)
    this.disconnectRemote = this.disconnectRemote.bind(this)
    this.getPlayerState = this.getPlayerState.bind(this)
    this.play = this.play.bind(this)
    this.pause = this.pause.bind(this)
  }

  /**
   * Deinitializes the module, clearing out session data and cleaning up resources
   *
   * Awaiting for this function makes sure that the spotify-remote library cleans up properly before continuing
   */
  async deInit() {
    if (await this.remote.isConnectedAsync()) {
      this.remote.removeAllListeners()
      await this.remote.pause()
      await this.remote.disconnect()
    }
    await this.auth.endSession()
    this.webApi.resetAccessToken()
    return
  }

  /**
   * Refreshes the session token if necessary and provides the current valid session, if any
   *
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   * @returns {undefined | SpotifySession} The current valid session, if any.
   */
  async refreshSession(catchErrors) {
    try {
      const curSession = await this.auth.getSession()
      if (curSession && !curSession.expired) {
        //  Sometimes the web api forgets its token
        this.webApi.setAccessToken(curSession.accessToken)
        return curSession
      }
      const newSession = await this.auth.authorize(SPOTIFY_SESSION_CONFIG)
      if (!newSession) {
        throw SpotifyErrors.newSessionUndefined
      }
      if (newSession.expired) {
        throw SpotifyErrors.newSessionExpired
      }
      this.webApi.setAccessToken(newSession.accessToken)
      return newSession
    } catch (err) {
      console.warn('Spotify Module - Could not refresh session:', err)
      await this.deInit()
      if (!catchErrors) {
        throw err
      }
    }
    return undefined
  }

  /**
   * Gets the user's own playlists without most of the fluff
   *
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   * @param {PaginationOptions} paginationOptions Optional, {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/d9c0b078cd2a7149b60af06a9bdbdb7a66d58617/types/spotify-web-api-node/index.d.ts#L1060 see details in DefinitelyTyped}
   * @returns {Promise<SpotifyApi.ListOfUsersPlaylistsResponse> | undefined} A promise that resolves to either an {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/1807130a7b1f33dc72ad79b04fb1099dc32d05e3/types/spotify-api/index.d.ts#L677  SpotifyApi.ListOfUsersPlaylistsResponse} object containing a list of the user's playlists or undefined on failure
   */
  async getOwnPlaylists(paginationOptions, catchErrors) {
    try {
      if (!(await this.refreshSession(catchErrors))) {
        throw SpotifyErrors.noSession
      }
      return (await this.webApi.getUserPlaylists(paginationOptions)).body
    } catch (err) {
      console.warn('Spotify Module - Could not get own playlists:\n', err)
      if (!catchErrors) {
        throw err
      }
    }
    return undefined
  }

  /**
   * Gets a cached version of the user's own playlists if possible without most of the fluff
   *
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   * @param {PaginationOptions} paginationOptions Optional, {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/d9c0b078cd2a7149b60af06a9bdbdb7a66d58617/types/spotify-web-api-node/index.d.ts#L1060 see details in DefinitelyTyped}
   * @returns {Promise<SpotifyApi.ListOfUsersPlaylistsResponse> | undefined} A promise that resolves to either an {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/1807130a7b1f33dc72ad79b04fb1099dc32d05e3/types/spotify-api/index.d.ts#L677  SpotifyApi.ListOfUsersPlaylistsResponse} object containing a list of the user's playlists or undefined on failure
   */
  async getCachedOwnPlaylists(paginationOptions, catchErrors) {
    if (!this.lastPlaylists) {
      this.lastPlaylists = await this.getOwnPlaylists(
        paginationOptions,
        catchErrors,
      )
    } else {
      //  Return the last one, but update it for the next call
      try {
        this.getOwnPlaylists(paginationOptions, catchErrors).then(
          (playlists) => {
            this.lastPlaylists = playlists
          },
        )
      } catch (err) {
        console.warn(
          'Spotify Module - Error getting the cached own playlists: \n',
          err,
        )
        if (!catchErrors) {
          throw err
        }
      }
    }
    return this.lastPlaylists
  }

  /**
   * Tries to connect to the player with the remote API, throws errors on failure
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   * @throws {@link SpotifyErrors remoteNoSession} error if no active session could be established. A connection error if the remote API fails to connect.
   */
  async connectRemote(catchErrors) {
    try {
      if (!(await this.remote.isConnectedAsync())) {
        const session = await this.refreshSession(catchErrors)
        if (!session) {
          throw SpotifyErrors.noSession
        }
        await this.remote.connect(session.accessToken)
      }
    } catch (err) {
      console.warn(
        'Spotify Module - Could not connect to remote Spotify player',
        err,
      )
      if (!catchErrors) {
        throw err
      }
    }
  }

  /**
   * Disconnects from the player with the remote API.
   *
   * A simple wrapper for consistency
   */
  disconnectRemote() {
    return this.remote.disconnect()
  }

  /**
   * Disconnects from the player after pausing and clearing listeners
   *
   * Custom-made for the workout player unmounting sequence
   */
  async disconnectAndPause() {
    this.clearAllRemoteEventListeners()
    if (await this.remote.isConnectedAsync()) {
      await this.pause(true)
      await this.disconnectRemote()
    }
  }

  /**
   * Gets the player's current state if connected with the remote api
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   * @returns {undefined | PlayerState} The current player state.  Undefined if no connection could be established
   */
  async getPlayerState(catchErrors) {
    try {
      await this.connectRemote(catchErrors)
      return await this.remote.getPlayerState()
    } catch (err) {
      console.warn("Spotify Module - Can't get remote Spotify player state", err)
      if (!catchErrors) {
        throw err
      }
    }
    return undefined
  }

  /**
   * Plays the specified Spotify URI
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   * @param {string} uri
   */
  async play(uri, fromBeginning, catchErrors) {
    try {
      await this.connectRemote(catchErrors)
      await this.remote.playUri(uri)
    } catch (err) {
      console.warn(
        `Spotify Module - Could not play from uri ${uri} on remote Spotify player`,
        err,
      )
      if (!catchErrors) {
        throw err
      }
    }
  }

  /**
   * Pauses playback on the remote Spotify player
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   */
  async pause(catchErrors) {
    try {
      await this.connectRemote(catchErrors)
      await this.remote.pause()
    } catch (err) {
      console.warn(
        'Spotify Module - Could not pause playback remote Spotify player',
        err,
      )
      if (!catchErrors) {
        throw err
      }
    }
  }

  /**
   * Resumes playback on the remote Spotify player
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   */
  async resume(catchErrors) {
    try {
      await this.connectRemote(catchErrors)
      await this.remote.resume()
    } catch (err) {
      console.warn(
        'Spotify Module - Could not resume playback on remote Spotify player',
        err,
      )
      if (!catchErrors) {
        throw err
      }
    }
  }

  /**
   * Pauses playback on the remote Spotify player and tries to set the play position at the start if allowed
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   */
  async stop(catchErrors) {
    try {
      await this.connectRemote(catchErrors)
      await this.remote.pause()
      if ((await this.remote.getPlayerState()).playbackRestrictions.canSeek) {
        await this.remote.seek(0)
      }
    } catch (err) {
      console.warn(
        'Spotify Module - Could not stop playback on remote Spotify player',
        err,
      )
      if (!catchErrors) {
        throw err
      }
    }
  }

  /**
   * Skips to the next track on the remote Spotify player if allowed
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   */
  async skipNext(catchErrors) {
    try {
      await this.connectRemote(catchErrors)
      await this.remote.skipToNext()
    } catch (err) {
      console.warn(
        'Spotify Module - Could not skip to next on remote Spotify player',
        err,
      )
      if (!catchErrors) {
        throw err
      }
    }
  }

  /**
   * Skipts to the previous track on the remote Spotify player if allowed
   * @param {boolean} catchErrors Errors are normally throw during execution, this makes it so that they're suppressed
   */
  async skipPrev(catchErrors) {
    try {
      await this.connectRemote(catchErrors)
      await this.remote.skipToPrevious()
    } catch (err) {
      console.warn(
        'Spotify Module - Could not skip to previous on remote Spotify player',
        err,
      )
      if (!catchErrors) {
        throw err
      }
    }
  }

  /**
   * Sets a single event listener for a given event in the remote API, removes the previous existing one, if any.
   * @param {keyof import('react-native-spotify-remote/dist/SpotifyRemote').SpotifyRemoteEvents} event event string
   * @param {(v: void | PlayerState | PlayerContext) => void} listener
   */
  setRemoteEventListener(event, listener) {
    if (typeof event !== 'string') return
    if (!Object.values(SpotifyRemoteEventsObject).find((ev) => ev === event)) {
      return
    }
    this.connectRemote(true)
    this.remote.removeAllListeners(event)
    this.remote.addListener(event, listener)
    return this
  }

  /**
   * Clears the event listener for a given event in the remote API
   * @param {keyof import('react-native-spotify-remote/dist/SpotifyRemote').SpotifyRemoteEvents} event event string
   */
  clearRemoteEventListener(event) {
    if (typeof event !== 'string') return
    if (!Object.values(SpotifyRemoteEventsObject).find((ev) => ev === event)) {
      return
    }
    this.remote.removeAllListeners(event)
  }

  /**
   * Clears all remote API event listeners
   */
  clearAllRemoteEventListeners() {
    this.remote.removeAllListeners()
  }
}

/**
 * Combines features from Spotify's Web API & Remote API into one.
 */
const spotifyService = new Spotify()
export default spotifyService
