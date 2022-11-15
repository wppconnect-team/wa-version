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
import execa from 'execa';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { checkUpdate } from '../checkUpdate';
import { HTML_DIR } from '../constants';
import { fetchLatest } from '../fetchLatest';
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
    process.stderr.write(`Cheking update of ${version} - `);
    const latest = await checkUpdate(version.replace('-beta', ''));
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

  process.stderr.write(`is updated\n`);

  return null;
}

async function run() {
  const outdated = await checkActiveVersions();
  const newVersion = await updateLatest();
  const hasChanges = !!newVersion || !!outdated.length;

  if (isCI) {
    setGitHubState('hasOutdated', outdated.length > 0);
    setGitHubState('outdated', outdated);
    setGitHubState('hasNewVersion', !!newVersion);
    setGitHubState('version', newVersion);
    setGitHubState('hasChanges', hasChanges);

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
        const { stdout } = await execa('git', [
          'commit',
          '-m',
          `fix: Added new version: ${newVersion}`,
          getVersionPath(newVersion),
        ]);
        process.stderr.write(`${stdout}\n`);
      }
    }
  }
}
run();
