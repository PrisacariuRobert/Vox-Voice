/**
 * vox config — View or edit current configuration.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  loadConfig,
  saveConfig,
  getConfigPath,
  divider,
  check,
  info,
} from './utils.mjs';

function maskKey(key) {
  if (!key || key.length < 8) return key ? '••••' : chalk.gray('(not set)');
  return '••••' + key.slice(-4);
}

export async function runConfig(projectRoot) {
  console.log('');
  console.log(chalk.bold.cyan('  Vox Configuration'));
  divider();

  const config = loadConfig();
  const configPath = getConfigPath();

  if (Object.keys(config).length === 0) {
    info(`No configuration found. Run ${chalk.cyan('vox setup')} first.`);
    console.log('');
    return;
  }

  console.log(chalk.gray(`\n  Config file: ${configPath}\n`));

  // Display current config
  const sections = [
    {
      title: 'User Profile',
      fields: [
        ['Name', config.userName],
        ['Email', config.userEmail],
        ['Timezone', config.userTimezone],
      ],
    },
    {
      title: 'Gateway',
      fields: [
        ['URL', config.gatewayUrl],
        ['Auth Token', maskKey(config.authToken)],
      ],
    },
    {
      title: 'API Keys',
      fields: [
        ['OpenAI', maskKey(config.openaiApiKey)],
      ],
    },
    {
      title: 'Voice',
      fields: [
        ['TTS Provider', config.ttsProvider],
        ...(config.ttsProvider === 'openai' ? [['Voice', config.openaiTtsVoice || 'nova']] : []),
        ...(config.ttsProvider === 'kokoro' ? [
          ['Kokoro URL', config.kokoroUrl],
          ['Kokoro Voice', config.kokoroVoice],
        ] : []),
      ],
    },
    {
      title: 'Integrations',
      fields: [
        ['Zoom', config.zoomAccountId ? 'Configured' : chalk.gray('Not set')],
        ['Microsoft 365', config.microsoftClientId ? 'Configured' : chalk.gray('Not set')],
      ],
    },
  ];

  for (const section of sections) {
    console.log(chalk.bold(`  ${section.title}`));
    for (const [label, value] of section.fields) {
      console.log(chalk.gray(`    ${label}: `) + chalk.white(value || chalk.gray('(not set)')));
    }
    console.log('');
  }

  divider();

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Edit a setting', value: 'edit' },
        { name: 'Re-run full setup wizard', value: 'setup' },
        { name: 'Reset all config', value: 'reset' },
        { name: 'Done (exit)', value: 'done' },
      ],
    },
  ]);

  if (action === 'done') {
    return;
  }

  if (action === 'setup') {
    const { runSetup } = await import('./setup.mjs');
    await runSetup(projectRoot);
    return;
  }

  if (action === 'reset') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Delete all saved configuration?',
        default: false,
      },
    ]);
    if (confirm) {
      saveConfig({});
      check('Configuration reset');
    }
    return;
  }

  // Edit a specific setting
  const editableFields = [
    { name: 'Gateway URL', key: 'gatewayUrl' },
    { name: 'Auth Token', key: 'authToken' },
    { name: 'OpenAI API Key', key: 'openaiApiKey' },
    { name: 'User Name', key: 'userName' },
    { name: 'User Email', key: 'userEmail' },
    { name: 'Timezone', key: 'userTimezone' },
    { name: 'TTS Provider', key: 'ttsProvider' },
    { name: 'OpenAI TTS Voice', key: 'openaiTtsVoice' },
    { name: 'Zoom Account ID', key: 'zoomAccountId' },
    { name: 'Zoom Client ID', key: 'zoomClientId' },
    { name: 'Zoom Client Secret', key: 'zoomClientSecret' },
    { name: 'Microsoft Client ID', key: 'microsoftClientId' },
  ];

  const { field } = await inquirer.prompt([
    {
      type: 'list',
      name: 'field',
      message: 'Which setting?',
      choices: editableFields.map((f) => ({
        name: `${f.name}: ${config[f.key] ? (f.key.includes('Key') || f.key.includes('Token') || f.key.includes('Secret') ? maskKey(config[f.key]) : config[f.key]) : chalk.gray('(not set)')}`,
        value: f.key,
      })),
    },
  ]);

  const isSecret = field.includes('Key') || field.includes('Token') || field.includes('Secret');

  const { value } = await inquirer.prompt([
    {
      type: isSecret ? 'password' : 'input',
      name: 'value',
      message: `New value for ${field}:`,
      default: isSecret ? '' : (config[field] || ''),
      mask: isSecret ? '*' : undefined,
    },
  ]);

  config[field] = value;
  saveConfig(config);
  check(`Updated ${field}`);
  console.log('');
}
