#!/usr/bin/env node

/**
 * Vox CLI — Setup & launcher for the Vox Voice Assistant
 *
 * Commands:
 *   vox setup        — Interactive setup wizard (installs everything)
 *   vox doctor       — Check system requirements & config health
 *   vox start        — Start all services (gateway + app + photo server)
 *   vox start app    — Start only the Expo dev server
 *   vox start photo  — Start only the YOLO photo search server
 *   vox deploy ios   — Build & deploy to iOS device
 *   vox deploy android — Build & deploy to Android device
 *   vox config       — View/edit current configuration
 *   vox help         — Show this help
 */

import chalk from 'chalk';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const command = args[0] || 'help';
const subcommand = args[1] || '';

// ─── Pretty banner ──────────────────────────────────────────────────────────

function banner() {
  console.log('');
  console.log(chalk.bold.cyan('  ╔═══════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('     Vox — AI Voice Assistant      ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚═══════════════════════════════════╝'));
  console.log('');
}

function showHelp() {
  banner();
  console.log(chalk.white('  Usage: ') + chalk.cyan('vox <command>'));
  console.log('');
  console.log(chalk.bold.white('  Commands:'));
  console.log('');
  console.log(chalk.cyan('    setup') + chalk.gray('          Interactive setup wizard — installs everything'));
  console.log(chalk.cyan('    doctor') + chalk.gray('         Check system requirements & config health'));
  console.log(chalk.cyan('    start') + chalk.gray('          Start all services (gateway + app + photo server)'));
  console.log(chalk.cyan('    start app') + chalk.gray('      Start only the Expo dev server'));
  console.log(chalk.cyan('    start photo') + chalk.gray('    Start only the YOLO photo search server'));
  console.log(chalk.cyan('    deploy ios') + chalk.gray('     Build & run on connected iOS device'));
  console.log(chalk.cyan('    deploy android') + chalk.gray(' Build & run on connected Android device'));
  console.log(chalk.cyan('    config') + chalk.gray('         View or edit current configuration'));
  console.log(chalk.cyan('    help') + chalk.gray('           Show this help'));
  console.log('');
  console.log(chalk.gray('  Getting started? Run: ') + chalk.bold.cyan('vox setup'));
  console.log('');
}

// ─── Route commands ──────────────────────────────────────────────────────────

async function main() {
  try {
    switch (command) {
      case 'setup': {
        const { runSetup } = await import('../lib/setup.mjs');
        await runSetup(PROJECT_ROOT);
        break;
      }
      case 'doctor': {
        const { runDoctor } = await import('../lib/doctor.mjs');
        await runDoctor(PROJECT_ROOT);
        break;
      }
      case 'start': {
        const { runStart } = await import('../lib/start.mjs');
        await runStart(PROJECT_ROOT, subcommand);
        break;
      }
      case 'deploy': {
        const { runDeploy } = await import('../lib/deploy.mjs');
        await runDeploy(PROJECT_ROOT, subcommand);
        break;
      }
      case 'config': {
        const { runConfig } = await import('../lib/config.mjs');
        await runConfig(PROJECT_ROOT);
        break;
      }
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
      default:
        console.log(chalk.red(`  Unknown command: ${command}`));
        showHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red('\n  Error: ') + err.message);
    process.exit(1);
  }
}

main();
