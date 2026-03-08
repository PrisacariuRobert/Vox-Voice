/**
 * vox start — Start services.
 *
 *   vox start         — Start all (app + photo server)
 *   vox start app     — Start Expo dev server only
 *   vox start photo   — Start YOLO photo search server only
 */

import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import {
  getPythonCmd,
  getLocalIP,
  loadConfig,
  check,
  cross,
  info,
  warn,
  divider,
} from './utils.mjs';

function startExpo(projectRoot) {
  console.log(chalk.bold.cyan('\n  Starting Expo dev server...\n'));

  const proc = spawn('npx', ['expo', 'start', '--tunnel'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  proc.on('error', (err) => {
    cross(`Failed to start Expo: ${err.message}`);
    info('Try manually: npx expo start');
  });

  return proc;
}

function startPhotoServer(projectRoot) {
  const yoloDir = join(projectRoot, 'yolo-server');
  const venvPython = join(yoloDir, 'venv', 'bin', 'python');
  const serverPy = join(yoloDir, 'server.py');

  if (!existsSync(serverPy)) {
    warn('yolo-server/server.py not found — skipping photo server');
    return null;
  }

  const pythonPath = existsSync(venvPython) ? venvPython : getPythonCmd();
  if (!pythonPath) {
    warn('Python not found — cannot start photo server');
    return null;
  }

  console.log(chalk.bold.magenta('\n  Starting YOLO Photo Search server...\n'));

  // Load OpenAI key from config if not in environment
  const config = loadConfig();
  const env = { ...process.env };
  if (config.openaiApiKey && !env.OPENAI_API_KEY) {
    env.OPENAI_API_KEY = config.openaiApiKey;
  }

  const proc = spawn(pythonPath, ['server.py'], {
    cwd: yoloDir,
    stdio: 'inherit',
    env,
  });

  proc.on('error', (err) => {
    cross(`Failed to start photo server: ${err.message}`);
    info('Try manually: cd yolo-server && source venv/bin/activate && python server.py');
  });

  return proc;
}

export async function runStart(projectRoot, subcommand) {
  console.log('');
  console.log(chalk.bold.cyan('  Vox Services'));
  divider();

  const config = loadConfig();
  const ip = getLocalIP();

  // Show current config
  console.log('');
  info(`Local IP: ${chalk.cyan(ip)}`);
  if (config.gatewayUrl) {
    info(`Gateway: ${chalk.cyan(config.gatewayUrl)}`);
  }
  console.log('');

  // Reminders
  console.log(chalk.gray('  Make sure OpenClaw gateway is running on your Mac:'));
  console.log(chalk.gray('  → ') + chalk.cyan('openclaw'));
  console.log('');

  const processes = [];

  const cleanup = () => {
    console.log(chalk.gray('\n  Shutting down...'));
    for (const p of processes) {
      try { p.kill('SIGTERM'); } catch {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  switch (subcommand) {
    case 'app': {
      const p = startExpo(projectRoot);
      if (p) processes.push(p);
      break;
    }
    case 'photo': {
      const p = startPhotoServer(projectRoot);
      if (p) processes.push(p);
      else process.exit(1);
      break;
    }
    case '':
    default: {
      // Start everything
      console.log(chalk.bold('  Starting all services...'));

      // Photo server in background
      const photoProc = startPhotoServer(projectRoot);
      if (photoProc) {
        processes.push(photoProc);
        // Give it a moment to boot
        await new Promise((r) => setTimeout(r, 2000));
      }

      // Expo in foreground
      const expoProc = startExpo(projectRoot);
      if (expoProc) processes.push(expoProc);
      break;
    }
  }

  // Keep process alive
  if (processes.length > 0) {
    await new Promise(() => {}); // hang forever, SIGINT will cleanup
  }
}
