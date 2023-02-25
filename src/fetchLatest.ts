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

/**
 * Retorna HTML contendo a página atual do WhatsApp
 * @returns HTML da página
 */
export async function fetchLatest(): Promise<string> {
  const response = await fetch(WA_URL, {
    headers: {
      'user-agent': WA_USER_AGENT,
      'accept-language': 'en-US,en;q=1',
      'sec-fetch-mode': 'navigate',
      cookie: 'wa_lang_pref=en',
      pragma: 'no-cache',
      'cache-control': 'no-cache',
    },
  });

  return await response.text();
}
