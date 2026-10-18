(function initMapiaSessionGuard(globalScope) {
  const ANONYMOUS_IDENTITY = "anonymous";

  function deriveIdentityKey(authState = {}) {
    const userId = deriveUserId(authState);
    return userId ? `user:${userId}` : ANONYMOUS_IDENTITY;
  }

  function deriveUserId(authState = {}) {
    const user = authState.user || authState.session?.user || null;
    return typeof user?.id === "string" ? user.id.trim() : "";
  }

  function createMapiaSessionGuard(options = {}) {
    const createAbortController = options.createAbortController
      || (() => typeof globalScope.AbortController === "function"
        ? new globalScope.AbortController()
        : null);

    let identityKey = null;
    let userId = "";
    let generation = 0;
    let pendingRequest = null;

    function invalidate() {
      generation += 1;
      const request = pendingRequest;
      pendingRequest = null;
      request?.controller?.abort?.();
      return generation;
    }

    function updateIdentity(authState = {}, { forceInvalidate = false } = {}) {
      const nextIdentityKey = deriveIdentityKey(authState);
      const nextUserId = deriveUserId(authState);
      const changed = identityKey !== null && identityKey !== nextIdentityKey;
      identityKey = nextIdentityKey;
      userId = nextUserId;
      const invalidated = Boolean(forceInvalidate || changed);

      if (invalidated) {
        invalidate();
      }

      return {
        changed,
        identityKey: nextIdentityKey,
        invalidated,
        isAnonymous: nextIdentityKey === ANONYMOUS_IDENTITY,
        userId: nextUserId || null
      };
    }

    function createOperationToken() {
      const operationGeneration = generation;
      const operationIdentityKey = identityKey;
      return {
        generation: operationGeneration,
        identityKey: operationIdentityKey,
        isCurrent() {
          return generation === operationGeneration && identityKey === operationIdentityKey;
        }
      };
    }

    function beginRequest() {
      pendingRequest?.controller?.abort?.();

      const controller = createAbortController();
      const requestGeneration = generation;
      const request = {
        controller,
        generation: requestGeneration,
        signal: controller?.signal,
        isCurrent() {
          return pendingRequest === request
            && generation === requestGeneration
            && !controller?.signal?.aborted;
        },
        finish() {
          if (pendingRequest === request) {
            pendingRequest = null;
          }
        }
      };

      pendingRequest = request;
      return request;
    }

    return {
      beginRequest,
      createOperationToken,
      getIdentityKey() {
        return identityKey || ANONYMOUS_IDENTITY;
      },
      getUserId() {
        return userId || null;
      },
      invalidate,
      updateIdentity
    };
  }

  const api = {
    ANONYMOUS_IDENTITY,
    createMapiaSessionGuard,
    deriveIdentityKey,
    deriveUserId
  };

  globalScope.MapiaSessionGuard = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
