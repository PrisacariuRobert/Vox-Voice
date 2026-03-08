/**
 * vox doctor — Check system requirements and configuration health.
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  commandExists,
  getCommandVersion,
  getNodeMajor,
  getPythonCmd,
  loadConfig,
  getConfigPath,
  check,
  cross,
  info,
  warn,
  divider,
} from './utils.mjs';

export async function runDoctor(projectRoot) {
  console.log('');
  console.log(chalk.bold.cyan('  Vox Doctor'));
  console.log(chalk.gray('  Checking your system for everything Vox needs...'));
  divider();

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  // ── 1. Node.js ──
  console.log(chalk.bold('\n  System Requirements'));

  const nodeMajor = getNodeMajor();
  if (nodeMajor >= 18) {
    check(`Node.js ${getCommandVersion('node', '-v')} (requires 18+)`);
    passed++;
  } else if (nodeMajor > 0) {
    cross(`Node.js ${getCommandVersion('node', '-v')} — requires 18+`);
    failed++;
  } else {
    cross('Node.js not found — install from https://nodejs.org');
    failed++;
  }

  // ── 2. npm ──
  if (commandExists('npm')) {
    check(`npm ${getCommandVersion('npm')}`);
    passed++;
  } else {
    cross('npm not found');
    failed++;
  }

  // ── 3. Git ──
  if (commandExists('git')) {
    check(`Git ${getCommandVersion('git')}`);
    passed++;
  } else {
    cross('Git not found — install from https://git-scm.com');
    failed++;
  }

  // ── 4. Python (optional for photo server) ──
  const pythonCmd = getPythonCmd();
  if (pythonCmd) {
    check(`Python ${getCommandVersion(pythonCmd)} (needed for Photo Search server)`);
    passed++;
  } else {
    warn('Python not found — Photo Search server will not work (optional feature)');
    warnings++;
  }

  // ── 5. Xcode (macOS) ──
  if (process.platform === 'darwin') {
    if (commandExists('xcodebuild')) {
      const xcVer = getCommandVersion('xcodebuild', '-version')?.split('\n')[0];
      check(`Xcode ${xcVer || 'installed'} (for iOS builds)`);
      passed++;
    } else {
      warn('Xcode not found — needed for iOS builds (install from App Store)');
      warnings++;
    }

    if (commandExists('pod')) {
      check(`CocoaPods ${getCommandVersion('pod')}`);
      passed++;
    } else {
      warn('CocoaPods not found — run: sudo gem install cocoapods');
      warnings++;
    }
  }

  // ── 6. Expo CLI ──
  const expoVersion = getCommandVersion('npx', 'expo --version');
  if (expoVersion) {
    check(`Expo CLI ${expoVersion}`);
    passed++;
  } else {
    warn('Expo CLI not available — will be installed during setup');
    warnings++;
  }

  // ── 7. EAS CLI (optional) ──
  if (commandExists('eas')) {
    check(`EAS CLI ${getCommandVersion('eas')}`);
    passed++;
  } else {
    info('EAS CLI not installed — needed for production builds (optional)');
  }

  // ── Project Files ──
  divider();
  console.log(chalk.bold('\n  Project Files'));

  const requiredFiles = [
    ['package.json', 'Package manifest'],
    ['app.json', 'Expo configuration'],
    ['tsconfig.json', 'TypeScript config'],
    ['babel.config.js', 'Babel config'],
    ['constants/config.ts', 'App config (gateway URL, etc.)'],
    ['constants/colors.ts', 'Design tokens'],
  ];

  for (const [file, desc] of requiredFiles) {
    if (existsSync(join(projectRoot, file))) {
      check(`${desc} (${file})`);
      passed++;
    } else {
      cross(`${desc} missing (${file})`);
      failed++;
    }
  }

  // ── node_modules ──
  if (existsSync(join(projectRoot, 'node_modules'))) {
    check('node_modules installed');
    passed++;
  } else {
    cross('node_modules not installed — run: npm install');
    failed++;
  }

  // ── ios directory ──
  if (existsSync(join(projectRoot, 'ios'))) {
    check('iOS native project present');
    passed++;
  } else {
    info('iOS native project not built yet — run: npx expo run:ios');
  }

  // ── YOLO server ──
  if (existsSync(join(projectRoot, 'yolo-server', 'server.py'))) {
    check('YOLO Photo Search server present');
    passed++;
    if (existsSync(join(projectRoot, 'yolo-server', 'venv'))) {
      check('Python virtual environment present');
      passed++;
    } else {
      info('Python venv not created — run setup to install');
    }
  } else {
    info('YOLO server not found (optional feature)');
  }

  // ── Configuration ──
  divider();
  console.log(chalk.bold('\n  Configuration'));

  const config = loadConfig();
  const configPath = getConfigPath();

  if (Object.keys(config).length > 0) {
    check(`Config file found at ${configPath}`);
    passed++;

    // Check key values
    if (config.anthropicApiKey) {
      check('Anthropic (Claude) API key configured');
      passed++;
    } else {
      warn('Anthropic API key not set — needed for AI model (Claude)');
      warnings++;
    }

    if (config.openaiApiKey) {
      check('OpenAI API key configured');
      passed++;
    } else {
      warn('OpenAI API key not set — needed for Whisper STT & TTS');
      warnings++;
    }

    if (config.gatewayUrl) {
      check(`Gateway URL: ${config.gatewayUrl}`);
      passed++;
    } else {
      warn('Gateway URL not configured');
      warnings++;
    }

    if (config.authToken) {
      check('Auth token configured');
      passed++;
    } else {
      warn('Auth token not set');
      warnings++;
    }

    if (config.userName) {
      check(`User profile: ${config.userName}`);
      passed++;
    } else {
      info('User profile not set — configure in the app Settings');
    }

    if (config.zoomAccountId && config.zoomClientId) {
      check('Zoom integration configured');
      passed++;
    } else {
      info('Zoom not configured (optional)');
    }

    if (config.microsoftClientId) {
      check('Microsoft integration configured');
      passed++;
    } else {
      info('Microsoft not configured (optional)');
    }
  } else {
    warn(`No config file found — run ${chalk.cyan('vox setup')} to create one`);
    warnings++;
  }

  // ── Summary ──
  divider();
  console.log('');
  console.log(
    chalk.bold('  Summary: ') +
    chalk.green(`${passed} passed`) + chalk.gray(', ') +
    chalk.yellow(`${warnings} warnings`) + chalk.gray(', ') +
    (failed > 0 ? chalk.red(`${failed} failed`) : chalk.green(`${failed} failed`))
  );
  console.log('');

  if (failed > 0) {
    console.log(chalk.yellow(`  Fix the ${failed} failed check(s) above, then run ${chalk.cyan('vox doctor')} again.`));
  } else if (warnings > 0) {
    console.log(chalk.green('  ✓ All required checks passed! Some optional features need setup.'));
  } else {
    console.log(chalk.green.bold('  ✓ Everything looks great! You\'re ready to go.'));
  }
  console.log('');
}
