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

import execa from 'execa';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { checkUpdate } from '../checkUpdate';
import { HTML_DIR, VERSIONS_FILE } from '../constants';
import { fetchCurrentAlphaVersion } from '../fetchCurrentAlphaVersion';
import { fetchCurrentBetaVersion } from '../fetchCurrentBetaVersion';
import { fetchCurrentVersion } from '../fetchCurrentVersion';
import { fetchLatest } from '../fetchLatest';
import { fetchLatestAlpha } from '../fetchLatestAlpha';
import { fetchLatestBeta } from '../fetchLatestBeta';
import { getAvailableVersions } from '../getAvailableVersions';
import { getPageContent } from '../getPageContent';

/**
 * Checks if it is executed by GitHub actions
 */
const isCI =
  process.env.CI &&
  (typeof process.env.CI !== 'string' ||
    process.env.CI.toLowerCase() !== 'false');

const runCommit =
  process.env.WA_COMMIT &&
  (typeof process.env.WA_COMMIT !== 'string' ||
    process.env.WA_COMMIT.toLowerCase() !== 'false');

function getVersionPath(version: string) {
  return path.join(HTML_DIR, `${version}.html`);
}

function setGitHubState(key: string, value: any) {
  const jsonValue = JSON.stringify(value);

  if (!process.env.GITHUB_OUTPUT) {
    console.log(`set-output name=${key}::${jsonValue}`);
    return;
  }
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${jsonValue}${os.EOL}`, {
    encoding: 'utf8',
  });
}

/**
 * Check all updated versions and return that no longer work
 * @returns List of outdated versions
 */
async function checkActiveVersions() {
  const versions = getAvailableVersions();

  const outdated: string[] = [];
  for (const version of versions) {
    process.stderr.write(`Checking update of ${version} - `);
    const latest = await checkUpdate(
      version.replace(/-(alpha|beta)/, '')
    ).catch(() => null);

    if (latest === null) {
      process.stderr.write(`failed\n`);
      continue;
    }

    if (latest.isBelowHard) {
      process.stderr.write(`outdated\n`);
      outdated.push(version);
      continue;
    }

    const content = getPageContent(version);

    const matches = content.match(/"hard_expire_time"\s+data-time="([\d.]+)"/);

    if (matches) {
      const hardExpire = parseFloat(matches[1]) * 1000;

      if (hardExpire < Date.now()) {
        process.stderr.write(`outdated\n`);
        outdated.push(version);
        continue;
      }
    }

    process.stderr.write(`OK\n`);
    continue;
  }
  return outdated;
}

/**
 * Check and update the latest version of whatsapp
 * @returns New version if it has been updated, otherwise null
 */
async function updateLatest() {
  process.stderr.write(`Fetching HTML content\n`);

  const versions = getAvailableVersions();

  const functions = [fetchLatest, fetchLatestBeta];

  for (const func of functions) {
    const html = await func();

    let version: string | null = null;

    // Get the version inside of WhatsApp page
    const versionRE = /\w+="(2\.\d+\.\d+)"|manifest-(2\.\d+\.\d+)\.json/;
    const matches = versionRE.exec(html);

    if (matches) {
      version = matches.slice(1).find((m) => !!m) || null;

      // Check is beta
      const isBetaRE = /x-wa-beta="1"/;
      if (isBetaRE.test(html)) {
        version += '-beta';
      }
    }

    if (version && !versions.includes(version)) {
      process.stderr.write(`New version available: ${version}\n`);

      process.stderr.write(`Generating new file\n`);
      await fs.promises.writeFile(getVersionPath(version), html, {
        encoding: 'utf8',
      });
      process.stderr.write(`Done\n`);
      return version;
    }
  }

  const alphaVersion = await fetchCurrentAlphaVersion();
  if (alphaVersion) {
    // Check only part of version: 2.3000.1012058694-alpha -> 2.3000.101205
    const hasNewVersion = versions
      .map((v) => v.substring(0, 13))
      .includes(alphaVersion.substring(0, 13));

    if (!hasNewVersion) {
      process.stderr.write(`New version available: ${alphaVersion}\n`);

      process.stderr.write(`Generating new file\n`);
      const html = await fetchLatestAlpha();
      await fs.promises.writeFile(getVersionPath(alphaVersion), html, {
        encoding: 'utf8',
      });
      process.stderr.write(`Done\n`);
      return alphaVersion;
    }
  }

  process.stderr.write(`is updated\n`);

  return null;
}

async function updateJsonFile() {
  process.stderr.write(`Updating versions.json file\n`);

  const currentVersion = await fetchCurrentVersion();
  const currentBeta = await fetchCurrentBetaVersion();
  const currentAlpha = await fetchCurrentAlphaVersion();

  let json = await fs.promises.readFile(VERSIONS_FILE, {
    encoding: 'utf8',
  });

  const content: {
    currentVersion: string | null;
    currentBeta: string | null;
    currentAlpha: string | null;
    versions: {
      version: string;
      beta: boolean;
      released: string;
      expire: string;
    }[];
  } = JSON.parse(json);

  const hasChanges =
    content.currentVersion !== currentVersion ||
    content.currentBeta !== currentBeta ||
    content.currentAlpha !== currentAlpha;

  content.currentVersion = currentVersion;
  content.currentBeta = currentBeta;
  content.currentAlpha = currentAlpha;

  const versions = getAvailableVersions();

  // Remove outdated versions
  content.versions = content.versions.filter((v) =>
    versions.includes(v.version)
  );

  const isBetaRE = /beta/;

  for (const versionNumber of versions) {
    if (content.versions.some((v) => v.version === versionNumber)) {
      continue;
    }

    const released: Date = new Date();
    let expire: Date = new Date();

    const html = getPageContent(versionNumber);
    const matches = html.match(/"hard_expire_time"\s+data-time="([\d.]+)"/);

    if (matches) {
      const timestamp = parseFloat(matches[1]) * 1000;

      expire = new Date(timestamp);
    }

    content.versions.push({
      version: versionNumber,
      beta: isBetaRE.test(versionNumber),
      released: released.toISOString(),
      expire: expire.toISOString(),
    });
  }

  json = JSON.stringify(content, null, 2);

  await fs.promises.writeFile(VERSIONS_FILE, json, {
    encoding: 'utf8',
  });

  process.stderr.write(`The versions.json file was updated\n`);

  return hasChanges;
}

async function run() {
  const outdated = await checkActiveVersions();
  const newVersion = await updateLatest();
  const hasChanges = !!newVersion || !!outdated.length;
  const hasJsonChanges = await updateJsonFile();

  if (isCI) {
    setGitHubState('hasOutdated', outdated.length > 0);
    setGitHubState('outdated', outdated);
    setGitHubState('hasNewVersion', !!newVersion);
    setGitHubState('version', newVersion);
    setGitHubState('hasChanges', hasChanges);
    setGitHubState('hasJsonChanges', hasJsonChanges);

    if (runCommit) {
      for (const version of outdated) {
        await execa('git', ['rm', getVersionPath(version)]);
        const { stdout } = await execa('git', [
          'commit',
          '-m',
          `fix: Removed outdated version: ${version}`,
          getVersionPath(version),
        ]);
        process.stderr.write(`${stdout}\n`);
      }

      if (newVersion) {
        await execa('git', ['add', getVersionPath(newVersion)]);
        await execa('git', ['add', VERSIONS_FILE]);

        const { stdout } = await execa('git', [
          'commit',
          '-m',
          `fix: Added new version: ${newVersion}`,
          getVersionPath(newVersion),
          VERSIONS_FILE,
        ]);
        process.stderr.write(`${stdout}\n`);
      }

      if (!newVersion && (outdated.length > 0 || hasJsonChanges)) {
        await execa('git', ['add', VERSIONS_FILE]);
        const { stdout } = await execa('git', [
          'commit',
          '-m',
          `chore: Updated versions.json`,
          VERSIONS_FILE,
        ]);
        process.stderr.write(`${stdout}\n`);
      }
    }
  }
}
run();
