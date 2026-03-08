/**
 * Shared utilities for the Vox CLI.
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import chalk from 'chalk';

// ─── Config file management ─────────────────────────────────────────────────

const CONFIG_DIR = join(process.env.HOME || '~', '.vox');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function loadConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

export function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

export function getConfigPath() {
  return CONFIG_FILE;
}

// ─── Command checks ────────────────────────────────────────────────────────

export function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getCommandVersion(cmd, versionFlag = '--version') {
  try {
    return execSync(`${cmd} ${versionFlag} 2>/dev/null`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

export function getNodeMajor() {
  const ver = getCommandVersion('node', '-v');
  if (!ver) return 0;
  return parseInt(ver.replace('v', '').split('.')[0], 10);
}

export function getPythonCmd() {
  if (commandExists('python3')) return 'python3';
  if (commandExists('python')) return 'python';
  return null;
}

// ─── Network helpers ────────────────────────────────────────────────────────

export function getLocalIP() {
  try {
    const output = execSync(
      "ifconfig | grep 'inet ' | grep -v 127.0.0.1 | head -1 | awk '{print $2}'",
      { encoding: 'utf-8' }
    ).trim();
    return output || '192.168.0.1';
  } catch {
    return '192.168.0.1';
  }
}

// ─── Process spawning ───────────────────────────────────────────────────────

export function runCommand(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: opts.silent ? 'pipe' : 'inherit',
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      shell: opts.shell || false,
    });
    let stdout = '';
    if (opts.silent && proc.stdout) {
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
    }
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

export function spawnDetached(cmd, args = [], opts = {}) {
  const proc = spawn(cmd, args, {
    stdio: 'pipe',
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    detached: false,
  });
  return proc;
}

// ─── Display helpers ────────────────────────────────────────────────────────

export function check(msg) {
  console.log(chalk.green('  ✓ ') + msg);
}

export function cross(msg) {
  console.log(chalk.red('  ✗ ') + msg);
}

export function info(msg) {
  console.log(chalk.blue('  ℹ ') + msg);
}

export function warn(msg) {
  console.log(chalk.yellow('  ⚠ ') + msg);
}

export function step(n, total, msg) {
  console.log(chalk.cyan(`\n  [${n}/${total}] `) + chalk.bold(msg));
}

export function divider() {
  console.log(chalk.gray('  ' + '─'.repeat(50)));
}
