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

import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import { HTML_DIR } from './constants';

/**
 * Retorna uma lista de todas versões disponíveis
 * @param versionMatch Caso informado, retornará apenas versões que coincida com o semver
 * @returns Lista de versões
 */
export function getAvailableVersions(
  versionMatch?: string | semver.Range,
  includePrerelease = true
): string[] {
  const versions = fs
    .readdirSync(HTML_DIR)
    .map((c) => path.basename(c, '.html'));

  const sorted = semver.sort(versions);

  if (versionMatch) {
    return sorted.filter((v) =>
      semver.satisfies(v, versionMatch, { includePrerelease })
    );
  }

  return sorted;
}
