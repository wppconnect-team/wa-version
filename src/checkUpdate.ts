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
import semver from 'semver';
import { WA_CHECK_UPDATE_URL } from './constants';
import { getLatestVersion } from './getLatestVersion';

export interface WaVersionInfo {
  //Teste
  isBroken: boolean;
  /**
   * Caso true, a versão é desatualizada, mas ainda funciona com funcionalidades reduzidas
   */
  isBelowSoft: boolean;
  /**
   * Caso true, a versão informada não é mais suportada
   */
  isBelowHard: boolean;
  hardUpdateTime: number | null;
  beta: null;
  /**
   * Versão atual do WhatsApp web
   */
  currentVersion: string;
  /**
   * Versão infomada
   */
  yourVersion: string;
  /**
   * Se a versão está atualizada
   */
  isUpdated: boolean;
}

/**
 * Verifica dados de atualização comparando a versão informada
 * @param version Versão para ser comparada, padrão é a última disponível
 * @returns Dados de atualização
 */
export async function checkUpdate(version?: string): Promise<WaVersionInfo> {
  if (!version) {
    version = getLatestVersion();
  }

  const url = WA_CHECK_UPDATE_URL.replace('<version>', version);

  const response = await fetch(url);
  const data = await response.json();

  data.isUpdated = semver.lte(data.currentVersion, version);
  data.yourVersion = version;

  return data;
}
