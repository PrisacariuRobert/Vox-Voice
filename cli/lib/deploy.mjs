/**
 * vox deploy — Build & deploy to a physical device.
 *
 *   vox deploy ios      — Build & run on connected iOS device
 *   vox deploy android  — Build & run on connected Android device
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import {
  commandExists,
  runCommand,
  check,
  cross,
  info,
  warn,
  divider,
} from './utils.mjs';

export async function runDeploy(projectRoot, platform) {
  console.log('');
  console.log(chalk.bold.cyan('  Vox Deploy'));
  divider();

  if (!platform || !['ios', 'android'].includes(platform)) {
    console.log('');
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Deploy to which platform?',
        choices: [
          { name: 'iOS (requires Mac + Xcode)', value: 'ios' },
          { name: 'Android (requires Android Studio)', value: 'android' },
        ],
      },
    ]);
    platform = answer.platform;
  }

  console.log('');

  if (platform === 'ios') {
    await deployIOS(projectRoot);
  } else {
    await deployAndroid(projectRoot);
  }
}

async function deployIOS(projectRoot) {
  // Check requirements
  if (process.platform !== 'darwin') {
    cross('iOS builds require macOS');
    process.exit(1);
  }

  if (!commandExists('xcodebuild')) {
    cross('Xcode not found — install from the App Store');
    process.exit(1);
  }

  check('Xcode available');

  // Check if ios directory exists
  const iosDir = join(projectRoot, 'ios');
  const needsPrebuild = !existsSync(iosDir);

  if (needsPrebuild) {
    info('iOS native project not found — generating...');
  }

  // Ask about build type
  const { buildType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'buildType',
      message: 'Build type:',
      choices: [
        { name: 'Development build (recommended — hot reload + native modules)', value: 'dev' },
        { name: 'Release build (optimized, no dev tools)', value: 'release' },
        { name: 'EAS Cloud build (builds in the cloud, sends to device)', value: 'eas' },
      ],
    },
  ]);

  console.log('');

  if (buildType === 'eas') {
    await easBuild(projectRoot, 'ios');
    return;
  }

  // Check for CocoaPods
  if (!commandExists('pod')) {
    warn('CocoaPods not installed');
    const { installPods } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installPods',
        message: 'Install CocoaPods now?',
        default: true,
      },
    ]);
    if (installPods) {
      const spinner = ora('  Installing CocoaPods...').start();
      try {
        await runCommand('sudo', ['gem', 'install', 'cocoapods'], { silent: true });
        spinner.succeed('  CocoaPods installed');
      } catch {
        spinner.fail('  Failed to install CocoaPods');
        info('Try: sudo gem install cocoapods');
        process.exit(1);
      }
    }
  }

  console.log(chalk.bold('\n  Building for iOS...'));
  console.log(chalk.gray('  This may take a few minutes on first build.\n'));
  console.log(chalk.gray('  → Make sure your iPhone is connected via USB'));
  console.log(chalk.gray('  → Trust the computer on your device if prompted'));
  console.log(chalk.gray('  → You may need to set a development team in Xcode\n'));

  const args = ['expo', 'run:ios', '--device'];

  const proc = spawn('npx', args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  await new Promise((resolve) => {
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('');
        check(chalk.bold.green('App deployed to iOS device!'));
        console.log('');
        console.log(chalk.gray('  Open the Vox app on your iPhone and go to Settings'));
        console.log(chalk.gray('  to verify your configuration.'));
        console.log('');
      } else {
        console.log('');
        cross('Build failed');
        console.log('');
        info('Common fixes:');
        console.log(chalk.gray('  • Open ios/ClawVoice.xcworkspace in Xcode'));
        console.log(chalk.gray('  • Set your development team under Signing & Capabilities'));
        console.log(chalk.gray('  • Trust the developer profile on your iPhone:'));
        console.log(chalk.gray('    Settings → General → VPN & Device Management'));
        console.log('');
      }
      resolve();
    });
  });
}

async function deployAndroid(projectRoot) {
  // Check for Android tools
  if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
    warn('ANDROID_HOME not set — Android Studio may not be configured');
    info('Install Android Studio from https://developer.android.com/studio');
  }

  const { buildType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'buildType',
      message: 'Build type:',
      choices: [
        { name: 'Development build (recommended — hot reload + native modules)', value: 'dev' },
        { name: 'Release build (optimized APK)', value: 'release' },
        { name: 'EAS Cloud build (builds in the cloud)', value: 'eas' },
      ],
    },
  ]);

  console.log('');

  if (buildType === 'eas') {
    await easBuild(projectRoot, 'android');
    return;
  }

  console.log(chalk.bold('\n  Building for Android...'));
  console.log(chalk.gray('  → Make sure your Android device is connected via USB'));
  console.log(chalk.gray('  → Enable USB debugging in Developer Options\n'));

  const args = ['expo', 'run:android', '--device'];

  const proc = spawn('npx', args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  await new Promise((resolve) => {
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('');
        check(chalk.bold.green('App deployed to Android device!'));
        console.log('');
      } else {
        console.log('');
        cross('Build failed');
        info('Make sure USB debugging is enabled and the device is authorized');
        console.log('');
      }
      resolve();
    });
  });
}

async function easBuild(projectRoot, platform) {
  if (!commandExists('eas')) {
    info('Installing EAS CLI...');
    const spinner = ora('  Installing eas-cli globally...').start();
    try {
      await runCommand('npm', ['install', '-g', 'eas-cli'], { silent: true });
      spinner.succeed('  EAS CLI installed');
    } catch {
      spinner.fail('  Failed to install EAS CLI');
      info('Try: npm install -g eas-cli');
      process.exit(1);
    }
  }

  const { profile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'profile',
      message: 'Build profile:',
      choices: [
        { name: 'Development (dev client, internal distribution)', value: 'development' },
        { name: 'Preview (release build, internal testing)', value: 'preview' },
        { name: 'Production (App Store / Play Store)', value: 'production' },
      ],
    },
  ]);

  console.log('');
  console.log(chalk.bold(`  Starting EAS ${profile} build for ${platform}...`));
  console.log(chalk.gray('  This builds in the cloud — you\'ll get a download link when done.\n'));

  const proc = spawn('eas', ['build', '--platform', platform, '--profile', profile], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  await new Promise((resolve) => {
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('');
        check(chalk.bold.green('EAS build complete!'));
      } else {
        cross('EAS build failed');
      }
      resolve();
    });
  });
}
