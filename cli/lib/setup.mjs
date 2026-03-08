/**
 * vox setup — Interactive setup wizard.
 *
 * Steps:
 *   1. Check system requirements
 *   2. Install npm dependencies
 *   3. Configure gateway (OpenClaw)
 *   4. API keys (Claude/Anthropic + OpenAI)
 *   5. User profile
 *   6. TTS provider
 *   7. Optional integrations (Zoom, Microsoft)
 *   8. Optional: Photo Search server
 *   9. Write config & patch constants/config.ts
 *  10. Summary + next steps
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  commandExists,
  getNodeMajor,
  getPythonCmd,
  getLocalIP,
  loadConfig,
  saveConfig,
  runCommand,
  check,
  cross,
  info,
  warn,
  step,
  divider,
} from './utils.mjs';

export async function runSetup(projectRoot) {
  console.log('');
  console.log(chalk.bold.cyan('  ╔═══════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('       Vox Setup Wizard            ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚═══════════════════════════════════╝'));
  console.log('');
  console.log(chalk.gray('  This wizard will install dependencies, configure API keys,'));
  console.log(chalk.gray('  and get Vox ready to run on your device.'));
  console.log('');

  const existing = loadConfig();
  const config = { ...existing };

  const TOTAL_STEPS = 9;

  // ─── Step 1: System requirements ──────────────────────────────────────────

  step(1, TOTAL_STEPS, 'Checking system requirements');
  console.log('');

  const nodeMajor = getNodeMajor();
  if (nodeMajor < 18) {
    cross('Node.js 18+ is required. Install from https://nodejs.org');
    process.exit(1);
  }
  check(`Node.js v${nodeMajor}`);

  if (!commandExists('npm')) {
    cross('npm is required');
    process.exit(1);
  }
  check('npm available');

  if (!commandExists('git')) {
    warn('Git not found — you won\'t be able to pull updates');
  } else {
    check('Git available');
  }

  if (process.platform === 'darwin') {
    if (commandExists('xcodebuild')) {
      check('Xcode available (for iOS builds)');
    } else {
      warn('Xcode not found — install from App Store for iOS builds');
    }
  }

  // ─── Step 2: Install dependencies ─────────────────────────────────────────

  step(2, TOTAL_STEPS, 'Installing dependencies');
  console.log('');

  if (!existsSync(join(projectRoot, 'node_modules'))) {
    const spinner = ora('  Running npm install...').start();
    try {
      await runCommand('npm', ['install'], { cwd: projectRoot, silent: true });
      spinner.succeed('  Dependencies installed');
    } catch (e) {
      spinner.fail('  npm install failed');
      cross(e.message);
      process.exit(1);
    }
  } else {
    check('Dependencies already installed');
  }

  // ─── Step 3: OpenClaw Gateway ─────────────────────────────────────────────

  step(3, TOTAL_STEPS, 'OpenClaw Gateway connection');
  console.log('');

  const localIP = getLocalIP();
  info(`Your local IP appears to be: ${chalk.cyan(localIP)}`);
  console.log(chalk.gray('  The gateway runs on your Mac. Make sure OpenClaw is installed.'));
  console.log(chalk.gray('  Guide: https://github.com/nichochar/openclaw'));
  console.log('');

  const gatewayAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'gatewayUrl',
      message: 'Gateway WebSocket URL:',
      default: config.gatewayUrl || `ws://${localIP}:18789`,
      validate: (v) => v.startsWith('ws://') || v.startsWith('wss://') ? true : 'Must start with ws:// or wss://',
    },
    {
      type: 'input',
      name: 'authToken',
      message: 'Auth token (from openclaw.json):',
      default: config.authToken || '',
      validate: (v) => v.length > 0 ? true : 'Auth token is required',
    },
  ]);
  config.gatewayUrl = gatewayAnswers.gatewayUrl;
  config.authToken = gatewayAnswers.authToken;

  // ─── Step 4: API Keys ────────────────────────────────────────────────────

  step(4, TOTAL_STEPS, 'API Keys');
  console.log('');
  console.log(chalk.bold.white('  Claude (Anthropic) — the AI brain'));
  console.log(chalk.gray('  OpenClaw uses Claude as its AI model. You need an Anthropic API key.'));
  console.log(chalk.gray('  Get your key at: https://console.anthropic.com/settings/keys'));
  console.log('');

  const claudeAnswers = await inquirer.prompt([
    {
      type: 'password',
      name: 'anthropicApiKey',
      message: 'Anthropic API key (sk-ant-...):',
      default: config.anthropicApiKey || '',
      mask: '*',
      validate: (v) => {
        if (!v) return 'Anthropic API key is required — this powers the AI responses';
        if (!v.startsWith('sk-ant-')) return 'Key should start with sk-ant-';
        return true;
      },
    },
  ]);
  config.anthropicApiKey = claudeAnswers.anthropicApiKey;

  console.log('');
  console.log(chalk.bold.white('  OpenAI — voice & vision'));
  console.log(chalk.gray('  Used for Whisper speech-to-text, TTS, and photo search verification.'));
  console.log(chalk.gray('  Get your key at: https://platform.openai.com/api-keys'));
  console.log('');

  const apiAnswers = await inquirer.prompt([
    {
      type: 'password',
      name: 'openaiApiKey',
      message: 'OpenAI API key (sk-...):',
      default: config.openaiApiKey || '',
      mask: '*',
      validate: (v) => {
        if (!v) return 'OpenAI API key is required for voice features';
        if (!v.startsWith('sk-')) return 'Key should start with sk-';
        return true;
      },
    },
  ]);
  config.openaiApiKey = apiAnswers.openaiApiKey;

  // ─── Step 5: User Profile ────────────────────────────────────────────────

  step(5, TOTAL_STEPS, 'Your profile (personalization)');
  console.log('');
  console.log(chalk.gray('  Vox uses your name, email, and timezone to personalize responses.'));
  console.log('');

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const profileAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'userName',
      message: 'Your name:',
      default: config.userName || '',
    },
    {
      type: 'input',
      name: 'userEmail',
      message: 'Your email:',
      default: config.userEmail || '',
    },
    {
      type: 'input',
      name: 'userTimezone',
      message: 'Timezone:',
      default: config.userTimezone || tz,
    },
  ]);
  Object.assign(config, profileAnswers);

  // ─── Step 6: TTS Provider ────────────────────────────────────────────────

  step(6, TOTAL_STEPS, 'Voice settings');
  console.log('');

  const voiceAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'ttsProvider',
      message: 'Text-to-Speech provider:',
      choices: [
        { name: 'OpenAI (recommended — high quality, uses your API key)', value: 'openai' },
        { name: 'Kokoro (self-hosted, free, requires separate server)', value: 'kokoro' },
        { name: 'Google Cloud TTS (requires separate API key)', value: 'google' },
        { name: 'Device (built-in iOS/Android, offline, free)', value: 'device' },
      ],
      default: config.ttsProvider || 'openai',
    },
  ]);
  config.ttsProvider = voiceAnswers.ttsProvider;

  if (config.ttsProvider === 'openai') {
    const voiceChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'openaiTtsVoice',
        message: 'OpenAI voice:',
        choices: ['nova', 'alloy', 'echo', 'shimmer', 'onyx'],
        default: config.openaiTtsVoice || 'nova',
      },
    ]);
    config.openaiTtsVoice = voiceChoice.openaiTtsVoice;
  }

  if (config.ttsProvider === 'kokoro') {
    const kokoroAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'kokoroUrl',
        message: 'Kokoro server URL:',
        default: config.kokoroUrl || 'http://localhost:3000',
      },
      {
        type: 'password',
        name: 'kokoroApiKey',
        message: 'Kokoro API key (optional):',
        default: config.kokoroApiKey || '',
        mask: '*',
      },
      {
        type: 'input',
        name: 'kokoroVoice',
        message: 'Kokoro voice:',
        default: config.kokoroVoice || 'af_heart',
      },
    ]);
    Object.assign(config, kokoroAnswers);
  }

  if (config.ttsProvider === 'google') {
    const googleAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'googleTtsApiKey',
        message: 'Google Cloud TTS API key:',
        default: config.googleTtsApiKey || '',
        mask: '*',
      },
    ]);
    config.googleTtsApiKey = googleAnswers.googleTtsApiKey;
  }

  // ─── Step 7: Optional integrations ─────────────────────────────────────────

  step(7, TOTAL_STEPS, 'Optional integrations');
  console.log('');
  console.log(chalk.gray('  These are optional — you can set them up later in the app Settings.'));
  console.log('');

  const optionals = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'integrations',
      message: 'Which integrations do you want to set up now?',
      choices: [
        { name: 'Zoom (schedule meetings via voice)', value: 'zoom' },
        { name: 'Microsoft 365 (Outlook email & calendar)', value: 'microsoft' },
        { name: 'YOLO Photo Search server (AI-powered photo search)', value: 'photos' },
      ],
    },
  ]);

  // Zoom
  if (optionals.integrations.includes('zoom')) {
    console.log('');
    console.log(chalk.gray('  Set up a Server-to-Server OAuth app at marketplace.zoom.us'));
    console.log(chalk.gray('  Required scope: meeting:write:admin'));
    console.log('');
    const zoomAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'zoomAccountId',
        message: 'Zoom Account ID:',
        default: config.zoomAccountId || '',
      },
      {
        type: 'input',
        name: 'zoomClientId',
        message: 'Zoom Client ID:',
        default: config.zoomClientId || '',
      },
      {
        type: 'password',
        name: 'zoomClientSecret',
        message: 'Zoom Client Secret:',
        default: config.zoomClientSecret || '',
        mask: '*',
      },
    ]);
    Object.assign(config, zoomAnswers);
  }

  // Microsoft
  if (optionals.integrations.includes('microsoft')) {
    console.log('');
    console.log(chalk.gray('  Create an app at portal.azure.com → App Registrations'));
    console.log(chalk.gray('  Add a "Mobile and desktop" redirect URI when prompted in the app.'));
    console.log('');
    const msAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'microsoftClientId',
        message: 'Azure Client ID:',
        default: config.microsoftClientId || '',
      },
    ]);
    config.microsoftClientId = msAnswers.microsoftClientId;
  }

  // Photo server
  if (optionals.integrations.includes('photos')) {
    const pythonCmd = getPythonCmd();
    if (!pythonCmd) {
      warn('Python not found — skipping photo server setup');
      info('Install Python 3 and re-run: vox setup');
    } else {
      const yoloDir = join(projectRoot, 'yolo-server');
      if (existsSync(join(yoloDir, 'server.py'))) {
        const venvDir = join(yoloDir, 'venv');
        if (!existsSync(venvDir)) {
          const spinner = ora('  Creating Python virtual environment...').start();
          try {
            await runCommand(pythonCmd, ['-m', 'venv', 'venv'], { cwd: yoloDir, silent: true });
            spinner.succeed('  Virtual environment created');
          } catch (e) {
            spinner.fail('  Failed to create venv');
            warn(e.message);
          }
        } else {
          check('Python venv already exists');
        }

        const pipPath = join(venvDir, 'bin', 'pip');
        if (existsSync(pipPath)) {
          const spinner = ora('  Installing Python dependencies (this may take a few minutes)...').start();
          try {
            await runCommand(pipPath, ['install', '-r', 'requirements.txt'], {
              cwd: yoloDir,
              silent: true,
            });
            spinner.succeed('  Python dependencies installed');
          } catch (e) {
            spinner.fail('  pip install failed');
            warn(e.message);
            info('Try manually: cd yolo-server && source venv/bin/activate && pip install -r requirements.txt');
          }
        }

        // .env for photo server
        const envPath = join(yoloDir, '.env');
        if (!existsSync(envPath) && config.openaiApiKey) {
          writeFileSync(envPath, `OPENAI_API_KEY=${config.openaiApiKey}\n`);
          check('Created yolo-server/.env with OpenAI key');
        }
      } else {
        warn('yolo-server/server.py not found — skipping');
      }
    }
  }

  // ─── Step 8: Write OpenClaw config ─────────────────────────────────────────

  step(8, TOTAL_STEPS, 'Configuring OpenClaw gateway');
  console.log('');

  // Write the Anthropic key into OpenClaw's config if we can find it
  const openclawConfigLocations = [
    join(process.env.HOME || '~', '.openclaw', 'openclaw.json'),
    join(process.env.HOME || '~', 'openclaw.json'),
  ];

  let openclawConfigPath = openclawConfigLocations.find((p) => existsSync(p));

  if (openclawConfigPath && config.anthropicApiKey) {
    try {
      const openclawConfig = JSON.parse(readFileSync(openclawConfigPath, 'utf-8'));
      if (!openclawConfig.anthropic_api_key || openclawConfig.anthropic_api_key !== config.anthropicApiKey) {
        openclawConfig.anthropic_api_key = config.anthropicApiKey;
        writeFileSync(openclawConfigPath, JSON.stringify(openclawConfig, null, 2) + '\n');
        check(`Updated Anthropic API key in ${openclawConfigPath}`);
      } else {
        check('Anthropic API key already set in OpenClaw config');
      }
    } catch (e) {
      warn(`Could not update OpenClaw config: ${e.message}`);
      info(`Manually add your key: export ANTHROPIC_API_KEY=${config.anthropicApiKey.slice(0, 10)}...`);
    }
  } else if (config.anthropicApiKey) {
    info('OpenClaw config not found — make sure to set your Anthropic API key:');
    console.log(chalk.cyan(`     export ANTHROPIC_API_KEY=sk-ant-...`));
    console.log(chalk.gray('     Or add it to your openclaw.json'));
  }

  // ─── Step 9: Write Vox configuration ──────────────────────────────────────

  step(9, TOTAL_STEPS, 'Saving configuration');
  console.log('');

  // Save to ~/.vox/config.json
  saveConfig(config);
  check(`Config saved to ~/.vox/config.json`);

  // Patch constants/config.ts with gateway URL
  const configTsPath = join(projectRoot, 'constants', 'config.ts');
  if (existsSync(configTsPath)) {
    let configTs = readFileSync(configTsPath, 'utf-8');
    const originalConfigTs = configTs;

    // Update gateway URL
    if (config.gatewayUrl) {
      configTs = configTs.replace(
        /DEFAULT_GATEWAY_URL\s*=\s*'[^']*'/,
        `DEFAULT_GATEWAY_URL = '${config.gatewayUrl}'`
      );
    }

    // Update auth token
    if (config.authToken) {
      configTs = configTs.replace(
        /DEFAULT_AUTH_TOKEN\s*=\s*'[^']*'/,
        `DEFAULT_AUTH_TOKEN = '${config.authToken}'`
      );
    }

    if (configTs !== originalConfigTs) {
      writeFileSync(configTsPath, configTs);
      check('Updated constants/config.ts');
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  divider();
  console.log('');
  console.log(chalk.bold.green('  ✓ Setup complete!'));
  console.log('');
  console.log(chalk.bold('  Configuration saved:'));
  console.log(chalk.gray(`    ${config.userName ? `User:      ${config.userName}` : 'User:      (set in app Settings)'}`));
  console.log(chalk.gray(`    Gateway:   ${config.gatewayUrl}`));
  console.log(chalk.gray(`    Claude:    ${config.anthropicApiKey ? '••••' + config.anthropicApiKey.slice(-4) : 'not set'}`));
  console.log(chalk.gray(`    OpenAI:    ${config.openaiApiKey ? '••••' + config.openaiApiKey.slice(-4) : 'not set'}`));
  console.log(chalk.gray(`    TTS:       ${config.ttsProvider}`));
  console.log(chalk.gray(`    Zoom:      ${config.zoomAccountId ? 'configured' : 'not configured'}`));
  console.log(chalk.gray(`    Microsoft: ${config.microsoftClientId ? 'configured' : 'not configured'}`));
  console.log('');

  divider();
  console.log('');
  console.log(chalk.bold('  Next steps:'));
  console.log('');
  console.log(chalk.white('  1. ') + chalk.gray('Start OpenClaw gateway on your Mac:'));
  console.log(chalk.cyan('     openclaw'));
  console.log('');
  console.log(chalk.white('  2. ') + chalk.gray('Run Vox on your device:'));
  console.log(chalk.cyan('     vox deploy ios') + chalk.gray('         # iOS device'));
  console.log(chalk.cyan('     vox deploy android') + chalk.gray('     # Android device'));
  console.log('');
  console.log(chalk.white('  3. ') + chalk.gray('Or start the dev server and scan the QR code:'));
  console.log(chalk.cyan('     vox start app'));
  console.log('');
  console.log(chalk.white('  4. ') + chalk.gray('Open the app → Settings → verify your config'));
  console.log('');
  console.log(chalk.gray('  Run ') + chalk.cyan('vox doctor') + chalk.gray(' anytime to check your setup.'));
  console.log('');
}
