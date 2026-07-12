// The app's mount point: the AppShell host around the GAS session.

import { AppShellProvider } from './AppShellProvider';

export default function AppPage() {
  return <AppShellProvider />;
}
