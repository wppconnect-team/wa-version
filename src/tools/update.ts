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
import semver from 'semver';
import * as fs from 'fs';
import * as path from 'path';
import { checkUpdate } from '../checkUpdate';
import { HTML_DIR } from '../constants';
import { fetchLatest } from '../fetchLatest';
import { getAvailableVersions } from '../getAvailableVersions';
import { getLatestVersion } from '../getLatestVersion';

/**
 * Verifica se está sendo executando pelo GitHub actions
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

/**
 * Verifica todas versões atualizadas e se possuí alguma que não funciona mais
 * @returns Quantidade de versões desatualizadas
 */
async function checkActiveVersions() {
  const versions = getAvailableVersions();

  const outdated: string[] = [];
  for (const version of versions) {
    process.stderr.write(`Cheking update of ${version} - `);
    const latest = await checkUpdate(version);
    if (!latest.isBelowHard) {
      process.stderr.write(`OK\n`);
      continue;
    }

    process.stderr.write(`outdated\n`);
    // await fs.promises.unlink(getVersionPath(version));
    outdated.push(version);
  }
  return outdated;
}

/**
 * Verifica e atualiza a última versão do whatsapp
 * @returns Nova versão caso tiver sido atualizado, null constrário
 */
async function updateLatest() {
  process.stderr.write(`Cheking latest update\n`);
  const latest = await checkUpdate();

  process.stderr.write(`Fetching HTML content\n`);
  const html = await fetchLatest();

  let version = null;

  if (!latest.isUpdated) {
    version = latest.currentVersion;
  } else {
    // Verifica atualização dentro da página do WhatsApp
    const versionRE = /,\w+="(2\.\d+\.\d+)",/;
    const matches = versionRE.exec(html);

    if (matches) {
      version = matches[1];
    }
  }

  if (version && semver.gt(version, getLatestVersion())) {
    process.stderr.write(`New version available: ${version}\n`);

    process.stderr.write(`Generating new file\n`);
    await fs.promises.writeFile(getVersionPath(version), html, {
      encoding: 'utf8',
    });
    process.stderr.write(`Done\n`);
    return version;
  }

  process.stderr.write(`is updated\n`);

  return null;
}

async function run() {
  const outdated = await checkActiveVersions();
  const newVersion = await updateLatest();
  const hasChanges = !!newVersion || !!outdated.length;

  if (isCI) {
    console.log(
      `::set-output name=hasOutdated::${JSON.stringify(outdated.length > 0)}`
    );
    console.log(`::set-output name=outdated::${JSON.stringify(outdated)}`);
    console.log(
      `::set-output name=hasNewVersion::${JSON.stringify(!!newVersion)}`
    );
    console.log(`::set-output name=version::${JSON.stringify(newVersion)}`);
    console.log(`::set-output name=hasChanges::${JSON.stringify(hasChanges)}`);

    if (runCommit) {
      for (const version of outdated) {
        await execa('git', ['rm', getVersionPath(version)]);
        const { stdout } = await execa('git', [
          'commit',
          '-m',
          `fix: Removido versão desatualizada: ${version}`,
          getVersionPath(version),
        ]);
        process.stderr.write(`${stdout}\n`);
      }
      if (newVersion) {
        await execa('git', ['add', getVersionPath(newVersion)]);
        const { stdout } = await execa('git', [
          'commit',
          '-m',
          `fix: Adicionado nova versão: ${newVersion}`,
          getVersionPath(newVersion),
        ]);
        process.stderr.write(`${stdout}\n`);
      }
    }
  }
}
run();
