/*!
 * Copyright 2021 WPPConnect Team
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
// license end
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
      'Accept-Language': 'en-US,en;q=0.9',
      'sec-fetch-mode': 'navigate',
    },
  });

  return await response.text();
}
