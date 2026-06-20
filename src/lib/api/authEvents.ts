let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

export function notifyAuthFailure() {
  authFailureHandler?.();
}
