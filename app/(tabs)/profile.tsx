import { CreatorProfileScreen } from "../../src/components/creator/CreatorProfileScreen";
import { useScreenViewed } from "../../src/hooks/useActivity";

export default function ProfileScreen() {
  useScreenViewed("profile");
  return <CreatorProfileScreen />;
}
