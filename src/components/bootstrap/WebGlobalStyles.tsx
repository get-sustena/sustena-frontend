import { useEffect } from "react";
import { Platform } from "react-native";

const STYLE_ELEMENT_ID = "sustena-web-global-styles";

const WEB_GLOBAL_STYLES = `
  input:focus,
  input:focus-visible,
  textarea:focus,
  textarea:focus-visible,
  [role="textbox"]:focus,
  [role="textbox"]:focus-visible,
  [contenteditable="true"]:focus,
  [contenteditable="true"]:focus-visible {
    outline: 0 !important;
    outline-color: transparent !important;
    outline-offset: 0 !important;
    box-shadow: none !important;
  }
`;

export function WebGlobalStyles() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const existingStyle = document.getElementById(STYLE_ELEMENT_ID);
    const styleElement =
      existingStyle instanceof HTMLStyleElement
        ? existingStyle
        : document.createElement("style");

    styleElement.id = STYLE_ELEMENT_ID;
    styleElement.textContent = WEB_GLOBAL_STYLES;

    if (!existingStyle) {
      document.head.appendChild(styleElement);
    }

    return () => {
      styleElement.remove();
    };
  }, []);

  return null;
}
