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

import * as path from 'path';

export const WA_URL = 'https://web.whatsapp.com/';

export const WA_CHECK_UPDATE_URL =
  'https://web.whatsapp.com/check-update?version=<version>&platform=web';

export const WA_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';

export const HTML_DIR = path.resolve(__dirname, '../html');

export const VERSIONS_FILE = path.join(
  path.resolve(__dirname, '..'),
  'versions.json'
);
