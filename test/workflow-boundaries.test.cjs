/*!
 * Copyright 2026 WPPConnect Team
 * Licensed under the Apache License, Version 2.0.
 * http://www.apache.org/licenses/LICENSE-2.0
 */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const workflow = (name) =>
  yaml.load(
    fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8')
  );
const update = workflow('wa-update.yml');
const release = workflow('release.yml');
const publish = workflow('publish.yml');

// Evaluate only the bounded condition forms used by these workflows. Workflow
// expressions are data, never JavaScript or shell code to execute.
function enabled(condition, context) {
  if (condition === undefined) return true;
  if (typeof condition === 'boolean') return condition;
  const expression = condition.replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g, '').trim();
  return expression.split(/\s*\|\|\s*/).some((group) =>
    group.split(/\s*&&\s*/).every((term) => {
      if (term === 'true') return true;
      if (term === 'false') return false;
      let match = term.match(/^github\.event_name\s*(==|!=)\s*'([^']+)'$/);
      if (match) return (context.event === match[2]) === (match[1] === '==');
      match = term.match(/^steps\.update\.outputs\.(\w+)\s*==\s*'([^']+)'$/);
      if (match) return context.outputs[match[1]] === match[2];
      match = term.match(/^startsWith\(github\.ref,\s*'([^']+)'\)$/);
      if (match) return context.ref.startsWith(match[1]);
      throw new Error(`Unsupported workflow condition: ${term}`);
    })
  );
}

const context = (event, ref = 'refs/heads/main') => ({
  event,
  ref,
  outputs: {
    hasChanges: 'true',
    shouldRelease: 'true',
    hasNewVersion: 'true',
    hasOutdated: 'true',
  },
});
const activeJobs = (event) =>
  Object.values(update.jobs).filter((job) => enabled(job.if, context(event)));
const activeSteps = (event) =>
  activeJobs(event).flatMap((job) =>
    job.steps.filter((step) => enabled(step.if, context(event)))
  );

test('pull requests run validation with only read access and no persisted token', () => {
  const jobs = activeJobs('pull_request');
  assert.ok(jobs.length > 0, 'PR validation must remain enabled');
  for (const job of jobs) {
    const permissions = job.permissions || update.permissions;
    assert.deepEqual(permissions, { contents: 'read' });
    for (const step of job.steps) {
      if (step.uses?.startsWith('actions/checkout@')) {
        assert.equal(step.with?.['persist-credentials'], false);
      }
    }
  }
});

test('PR catalog checks cannot commit, publish, dispatch or notify even for a new version', () => {
  const steps = activeSteps('pull_request');
  const check = steps.find((step) => step.run === 'npm run wa-update');
  assert.ok(check, 'retain read-only updater validation');
  assert.equal(check.env.WA_COMMIT, 'false');
  assert.ok(steps.some((step) => step.run === 'npm run test:workflows'));
  for (const step of steps) {
    assert.doesNotMatch(JSON.stringify(step), /secrets\.|github\.token/);
    assert.doesNotMatch(
      step.run || '',
      /(?:gh workflow run|npm (?:run )?release|npm publish|git push)/
    );
    assert.ok(!step.uses?.includes('actions-status-discord'));
  }
});

for (const event of ['push', 'schedule', 'workflow_dispatch']) {
  test(`${event} grants writes only to the updater after read-only validation`, () => {
    const updater = activeJobs(event).find((job) =>
      job.steps.some((step) => step.name === 'Trigger publish')
    );
    assert.ok(updater);
    assert.deepEqual(updater.permissions, {
      contents: 'write',
      actions: 'write',
    });
    const validation = update.jobs[updater.needs];
    assert.ok(validation, 'the updater must depend on validation');
    assert.deepEqual(validation.permissions, { contents: 'read' });
    assert.ok(
      !validation.steps.some((step) => /secrets\./.test(JSON.stringify(step)))
    );
    const checkout = updater.steps.find((step) =>
      step.uses?.startsWith('actions/checkout@')
    );
    assert.equal(checkout.with.ref, 'main');
    const check = updater.steps.find(
      (step) => step.run === 'npm run wa-update'
    );
    assert.equal(check.env.WA_COMMIT, 'true');
  });
}

test('every notification is explicitly disabled for pull requests', () => {
  const notifications = Object.values(update.jobs)
    .flatMap((job) => job.steps)
    .filter((step) => step.uses?.includes('actions-status-discord'));
  assert.equal(notifications.length, 2);
  for (const step of notifications) {
    assert.equal(enabled(step.if, context('pull_request')), false);
    assert.equal(enabled(step.if, context('schedule')), true);
  }
});

test('manual publication accepts version tags and rejects branch refs', () => {
  assert.ok(Object.hasOwn(publish.on, 'workflow_dispatch'));
  assert.equal(
    enabled(
      publish.jobs.publish.if,
      context('workflow_dispatch', 'refs/tags/v1.2.3')
    ),
    true
  );
  for (const ref of ['refs/heads/main', 'refs/heads/v1.2.3']) {
    assert.equal(
      enabled(publish.jobs.publish.if, context('workflow_dispatch', ref)),
      false
    );
  }
});

test('release dispatch commands pass the computed tag without invoking a publisher', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'wpp-workflow-contract-')
  );
  const bin = path.join(directory, 'bin');
  fs.mkdirSync(bin);
  const output = path.join(directory, 'arguments.txt');
  fs.writeFileSync(path.join(bin, 'node'), '#!/bin/sh\nprintf "1.2.3\\n"\n', {
    mode: 0o755,
  });
  fs.writeFileSync(
    path.join(bin, 'gh'),
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$CAPTURE_FILE"\n',
    { mode: 0o755 }
  );
  const shell =
    process.platform === 'win32'
      ? path.join(process.env.ProgramFiles, 'Git/bin/bash.exe')
      : '/bin/bash';
  try {
    for (const source of [update, release]) {
      const step = Object.values(source.jobs)
        .flatMap((job) => job.steps)
        .find((item) => item.name === 'Trigger publish');
      assert.equal(step.env.GH_TOKEN, '${{ github.token }}');
      // The whitelist makes it impossible to execute arbitrary edited workflow
      // commands through this test. The commands run only against local stubs.
      assert.equal(
        step.run,
        'gh workflow run publish.yml --ref "v$(node -p "require(\'./package.json\').version")"'
      );
      const result = spawnSync(
        shell,
        ['--noprofile', '--norc', '-c', step.run],
        {
          cwd: directory,
          encoding: 'utf8',
          timeout: 5000,
          env: {
            PATH: bin.replace(/\\/g, '/'),
            CAPTURE_FILE: output.replace(/\\/g, '/'),
            GH_TOKEN: 'workflow-test-only',
            SystemRoot: process.env.SystemRoot || '',
          },
        }
      );
      assert.equal(result.status, 0, result.stderr || result.error?.message);
      assert.deepEqual(fs.readFileSync(output, 'utf8').trim().split(/\r?\n/), [
        'workflow',
        'run',
        'publish.yml',
        '--ref',
        'v1.2.3',
      ]);
    }
  } finally {
    const resolved = fs.realpathSync(directory);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('wpp-workflow-contract-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
