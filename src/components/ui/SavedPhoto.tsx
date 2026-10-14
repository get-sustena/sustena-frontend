import { Image, type ImageProps } from "expo-image";
import { useRecipePhotoUri } from "../../lib/catalogue/recipePhotoSource";

type Props = Omit<ImageProps, "source"> & { url: string };

// A recipe photo or creator avatar: the copy saved on the phone when there is
// one (OFF-01), otherwise the link.
export function SavedPhoto({ url, ...props }: Props) {
  const uri = useRecipePhotoUri(url);
  return <Image {...props} source={{ uri: uri ?? undefined }} />;
}
