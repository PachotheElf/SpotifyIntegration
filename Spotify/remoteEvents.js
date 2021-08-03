const SpotifyRemoteEventsObject = {
  /**
   * Fired when the state of the Spotify Player changes
   *
   * Event type: @type {PlayerState}
   * @memberof SpotifyRemoteEvents
   */
  PLAYER_STATE_CHANGED: 'playerStateChanged',
  /**
   * Fires when the context of the Spotify Player changes
   *
   * Event type: @type {PlayerContext}
   * @memberof SpotifyRemoteEvents
   */
  PLAYER_CONTEXT_CHANGED: 'playerContextChanged',
  /**
   * Fired when the Spotify Remote is disconnected from the Spotify App
   *
   * Event type: @type {void}
   * @memberof SpotifyRemoteEvents
   */
  REMOTE_DISCONNECTED: 'remoteDisconnected',
  /**
   * Fired when the Spotify Remote Connection is established with the Spotify App
   *
   * Event type: @type {void}
   * @memberof SpotifyRemoteEvents
   */
  REMOTE_CONNECTED: 'remoteConnected',
}

export default SpotifyRemoteEventsObject
