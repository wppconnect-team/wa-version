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
import { getAvailableVersions } from './getAvailableVersions';
import { getLatestVersion } from './getLatestVersion';

/**
 * Retorna o conteúdo da última versão disponível pela versão informada, aceitando regras semver
 * @param versionMatch Versão da página para retornar
 * @returns Conteúdo HTML da página
 */
export function getPageContent(
  versionMatch?: string | semver.Range,
  includePrerelease = true
): string {
  if (!versionMatch) {
    versionMatch = getLatestVersion();
  }

  const versions = getAvailableVersions();

  const max = semver.maxSatisfying(versions, versionMatch, {
    includePrerelease,
  });

  if (!max) {
    throw new Error(`Version not available for ${versionMatch}`);
  }

  return fs.readFileSync(path.join(HTML_DIR, max + '.html'), {
    encoding: 'utf8',
  });
}
