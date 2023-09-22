/*!
 * Copyright 2022 WPPConnect Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fetch from 'node-fetch';
import { WA_URL, WA_USER_AGENT } from './constants';
import { getLatestVersion } from './getLatestVersion';

/**
 * Return the current active noraml version on WhatsApp WEB
 * @returns Version number
 */
export async function fetchCurrentBetaVersion(): Promise<string | null> {
  const latestVersion = getLatestVersion();

  const wa_beta_version = `production%2F${(
    Date.now() / 1000 -
    (3600 / 24) * 30
  ).toFixed(0)}%2F${latestVersion.replace('-beta', '')}`;

  const responseSW = await fetch(`${WA_URL}`, {
    headers: {
      'user-agent': WA_USER_AGENT,
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US;q=0.9,en;q=0.8',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'sec-ch-ua':
        '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      cookie: `wa_lang_pref=en; wa_beta_version=${wa_beta_version}`,
    },
  });

  const cookie = responseSW.headers.get('Set-Cookie');

  if (cookie) {
    const matches = cookie.match(/wa_beta_version=.+?%2F([\d.]+);/) || [];

    if (matches[1]) {
      return matches[1];
    }
  }

  return null;
}
