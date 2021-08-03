import Axios from 'axios';
import qs from 'querystring';

const swap_uri = 'https://circular-pacific-alyssum.glitch.me/swap';
const refresh_uri = 'https://circular-pacific-alyssum.glitch.me/refresh';

export async function getSessionSpotify(auth_code) {
  return Axios.post(`${swap_uri}`, qs.stringify({code: auth_code}), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}
export function refreshSessionSpotify(refresh_token) {
  console.log('Refresh token:', refresh_token);
  return Axios.post(
    `${refresh_uri}`,
    qs.stringify({refresh_token: refresh_token}),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}
