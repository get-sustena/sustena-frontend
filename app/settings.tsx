import { AccountSettingsScreen } from "../src/components/profile/AccountSettingsScreen";
import { useScreenViewed } from "../src/hooks/useActivity";

export default function SettingsScreen() {
  useScreenViewed("settings");
  return <AccountSettingsScreen />;
}
