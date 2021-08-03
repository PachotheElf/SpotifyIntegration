const Errors = {
  newSessionUndefined: new Error('New session received is undefined.'),
  newSessionExpired: new Error('New session received is already expired.'),
  noSession: new Error('Could not get session information'),
  remoteNotConnected: new Error('Not connected with Spotify Remote'),
  noSpotifyApp: new Error(
    'Error: Spotify connection failed: could not find the Spotify app, it may need to be installed.',
  ),
  authCancelled: new Error('Cancelled'),
}

export default Errors
