/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */
import React, { useEffect, useState } from 'react'
import {
  Button,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { ApiScope } from 'react-native-spotify-remote'
import { WebView } from 'react-native-webview'
import { Colors, Header } from 'react-native/Libraries/NewAppScreen'
import Spotify from './Spotify'

const SPOTIFY_API_URL = 'https://accounts.spotify.com'
const SPOTIFY_CLIENT_ID = '7fef5e25554047ad94b8c115717c512d'

const App = () => {
  const [showWebview, setShowWebview] = useState()
  /**@type {[SpotifyApi.PlaylistObjectSimplified, React.Dispatch<React.SetStateAction<SpotifyApi.PlaylistObjectSimplified>>]}*/
  const [playlists, setPlaylists] = useState([])
  const [selPlaylist, setSelPlaylist] = useState({ name: '', uri: '', id: '' })
  const isDarkMode = useColorScheme() === 'dark'

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  }


  const onNavigationSpotify = async (navState) => {
    if (navState?.url.startsWith(Spotify.SPOTIFY_REDIRECT_URI)) {
      const urlParams = getUrlParams(navState.url)
      const code = urlParams.code
      console.log(
        'Spotify has been authorized successfully with code:',
        JSON.stringify(code, null, 2),
      )
      setShowWebview(false)
    }
  }

  const getUrlParams = (url) => {
    const regex = /[?&]([^=#]+)=([^&#]*)/g
    const params = {}
    let match

    while ((match = regex.exec(url))) {
      params[match[1]] = match[2]
    }
    return params
  }

  const onPress = (item) => {
    console.log('Selecting ', item)
    setSelPlaylist(item)
  }

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={
          selPlaylist?.uri === item.uri ? styles.selected : styles.unselected
        }
        onPress={() => onPress(item)}>
        <Text>{item.name}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Button
            onPress={async () => {
              const playlistsRaw = await Spotify.getCachedOwnPlaylists(true)
              const mappedPlaylists = playlistsRaw.items
              setPlaylists(mappedPlaylists ? mappedPlaylists : [])
            }}
            title="Get playlists"
          />
          <Button
            onPress={async () => {
              console.log('Connecting to remote player...')
              await Spotify.connectRemote(true)
              console.log('Connected!')
            }}
            title="Connect"
          />
          <Button
            onPress={() => {
              console.log('Disconnecting from remote player...')
              Spotify.disconnectRemote()
              console.log('Disconnected!')
            }}
            title="Disconnect remote"
          />
          {/* <Button onPress={getRecommendedItems} title="Recommended Items" /> */}
          <Button
            onPress={() => {
              Spotify.refreshSession(true)
            }}
            title="Refresh Session"
          />
          <Button
            onPress={async () => {
              if (!selPlaylist?.uri) {
                console.warn('No playlist selected')
                return
              }
              Spotify.play(selPlaylist.uri, undefined, true)
            }}
            title="Play Selected Playlist"
          />
          <Button
            onPress={async () => {
              Spotify.pause(true)
            }}
            title="Stop playback"
          />
          <Button
            onPress={async () => {
              console.log('Deinitializing...')
              await Spotify.deInit()
              console.log('Deinitialized!')
            }}
            title="Deinitialize"
          />
          <Button
            onPress={async () => {
              console.log(
                JSON.stringify(await Spotify.getPlayerState(true), null, 2),
              )
            }}
            title="Get player status"
          />
        </View>
        <FlatList
          style={styles.list}
          data={playlists}
          renderItem={renderItem}
          keyExtractor={(item) => item.name}
        />
      </ScrollView>

      {showWebview && (
        <WebView
          style={styles.webview}
          source={{
            uri: `${SPOTIFY_API_URL}/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${'Spotify://auth/'}&scope=${encodeURIComponent(
              [
                ApiScope.AppRemoteControlScope,
                ApiScope.PlaylistReadPrivateScope,
                ApiScope.PlaylistReadCollaborativeScope,
                ApiScope.UserLibraryReadScope,
                ApiScope.UserModifyPlaybackStateScope,
                ApiScope.UserReadCurrentlyPlayingScope,
              ],
            )}`,
          }}
          onNavigationStateChange={onNavigationSpotify}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
  },
  selected: {
    backgroundColor: '#ddd',
  },
  unselected: {
    backgroundColor: '#fff',
  },
  webview: {
    height: '100%',
    width: '100%',
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
})

export default App
