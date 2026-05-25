// Notarization script for macOS builds
// Requires: APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID environment variables
// Run only in CI when building signed releases

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const appleId = process.env.APPLE_ID;
  const applePassword = process.env.APPLE_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !applePassword || !teamId) {
    console.log('Skipping notarization — APPLE_ID, APPLE_PASSWORD, or APPLE_TEAM_ID not set');
    return;
  }

  let notarize;
  try {
    ({ notarize } = require('@electron/notarize'));
  } catch {
    console.log('Skipping notarization — @electron/notarize not installed');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  console.log(`Notarizing ${appName}...`);

  await notarize({
    appBundleId: 'com.nocodeflow.app',
    appPath: `${appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword: applePassword,
    teamId,
  });

  console.log('Notarization complete');
};
