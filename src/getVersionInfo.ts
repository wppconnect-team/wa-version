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
import * as semver from 'semver';
import { VERSIONS_FILE } from './constants';
import { getAvailableVersions } from './getAvailableVersions';
import { getLatestVersion } from './getLatestVersion';

/**
 * Return the current version info
 * @param versionMatch Version match
 * @returns version info
 */
export function getVersionInfo(
  versionMatch?: string | semver.Range,
  includePrerelease = true
):
  | {
      version: string;
      beta: boolean;
      released: string;
      expire: string;
    }
  | undefined {
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

  const json = fs.readFileSync(VERSIONS_FILE, {
    encoding: 'utf8',
  });

  const content: {
    currentVersion: string | null;
    currentBeta: string | null;
    versions: {
      version: string;
      beta: boolean;
      released: string;
      expire: string;
    }[];
  } = JSON.parse(json);

  return content.versions.find((v) => v.version === max);
}
