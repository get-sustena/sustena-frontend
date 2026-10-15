let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

export function notifyAuthFailure() {
  authFailureHandler?.();
}

// 403 EMAIL_NOT_VERIFIED: the account must enter its emailed code first.
let emailNotVerifiedHandler: (() => void) | null = null;

export function setEmailNotVerifiedHandler(handler: (() => void) | null) {
  emailNotVerifiedHandler = handler;
}

export function notifyEmailNotVerified() {
  emailNotVerifiedHandler?.();
}
