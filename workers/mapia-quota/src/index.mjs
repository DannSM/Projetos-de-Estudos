import { DurableObject } from "cloudflare:workers";

const PROFILE_LIMIT_VARIABLES = {
  visitor: "MAPIA_VISITOR_DAILY_LIMIT",
  free: "MAPIA_FREE_DAILY_LIMIT",
  premium: "MAPIA_PREMIUM_DAILY_LIMIT"
};

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function positiveInteger(env, name) {
  const value = Number(env?.[name]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Configuração obrigatória ausente ou inválida: ${name}.`);
  }
  return value;
}

function readPolicy(env, profile) {
  const profileVariable = PROFILE_LIMIT_VARIABLES[profile];
  if (!profileVariable) throw new Error("Perfil de quota inválido.");

  return {
    profileDailyLimit: positiveInteger(env, profileVariable),
    visitorIpDailyLimit: profile === "visitor"
      ? positiveInteger(env, "MAPIA_VISITOR_IP_DAILY_LIMIT")
      : 0,
    globalDailyLimit: positiveInteger(env, "MAPIA_GLOBAL_DAILY_LIMIT"),
    actorRateLimit: positiveInteger(env, "MAPIA_ACTOR_RATE_LIMIT"),
    ipRateLimit: positiveInteger(env, "MAPIA_IP_RATE_LIMIT"),
    rateWindowSeconds: positiveInteger(env, "MAPIA_RATE_WINDOW_SECONDS"),
    actorConcurrencyLimit: positiveInteger(env, "MAPIA_ACTOR_CONCURRENCY_LIMIT"),
    globalConcurrencyLimit: positiveInteger(env, "MAPIA_GLOBAL_CONCURRENCY_LIMIT"),
    reservationTtlSeconds: positiveInteger(env, "MAPIA_RESERVATION_TTL_SECONDS")
  };
}

function firstRow(cursor) {
  return cursor.toArray()[0] || null;
}

function secondsUntilNextUtcDay(nowMs) {
  const now = new Date(nowMs);
  const nextDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.max(1, Math.ceil((nextDay - nowMs) / 1000));
}

function validReservationPayload(payload) {
  const { requestId, actorKey, ipKey } = payload || {};
  return [requestId, actorKey, ipKey].every((value) => (
    typeof value === "string" && value.length >= 16 && value.length <= 160
  ));
}

export class MapiaQuota extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.storage = ctx.storage;
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS daily_usage (
        scope TEXT NOT NULL,
        subject_key TEXT NOT NULL,
        usage_day TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (scope, subject_key, usage_day)
      );
      CREATE TABLE IF NOT EXISTS rate_windows (
        scope TEXT NOT NULL,
        subject_key TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (scope, subject_key, window_start)
      );
      CREATE TABLE IF NOT EXISTS reservations (
        reservation_id TEXT PRIMARY KEY,
        actor_key TEXT NOT NULL,
        ip_key TEXT NOT NULL,
        profile TEXT NOT NULL,
        usage_day TEXT NOT NULL,
        status TEXT NOT NULL,
        outcome TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        settled_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_mapia_reservations_active
        ON reservations (status, expires_at);
      CREATE INDEX IF NOT EXISTS idx_mapia_reservations_actor_active
        ON reservations (actor_key, status, expires_at);
    `);
  }

  getDailyCount(scope, subjectKey, usageDay) {
    return Number(firstRow(this.sql.exec(
      "SELECT count FROM daily_usage WHERE scope = ? AND subject_key = ? AND usage_day = ?",
      scope,
      subjectKey,
      usageDay
    ))?.count) || 0;
  }

  getRateCount(scope, subjectKey, windowStart) {
    return Number(firstRow(this.sql.exec(
      "SELECT count FROM rate_windows WHERE scope = ? AND subject_key = ? AND window_start = ?",
      scope,
      subjectKey,
      windowStart
    ))?.count) || 0;
  }

  getActiveCount(nowMs, actorKey = "") {
    const cursor = actorKey
      ? this.sql.exec(
        "SELECT COUNT(*) AS count FROM reservations WHERE status = 'active' AND expires_at > ? AND actor_key = ?",
        nowMs,
        actorKey
      )
      : this.sql.exec(
        "SELECT COUNT(*) AS count FROM reservations WHERE status = 'active' AND expires_at > ?",
        nowMs
      );
    return Number(firstRow(cursor)?.count) || 0;
  }

  cleanup(nowMs, windowStart) {
    this.sql.exec(
      "UPDATE reservations SET status = 'expired', outcome = 'reservation_timeout', settled_at = ? WHERE status = 'active' AND expires_at <= ?",
      nowMs,
      nowMs
    );
    this.sql.exec(
      "DELETE FROM rate_windows WHERE window_start < ?",
      windowStart - (24 * 60 * 60 * 1000)
    );
    this.sql.exec(
      "DELETE FROM reservations WHERE created_at < ? AND status <> 'active'",
      nowMs - (7 * 24 * 60 * 60 * 1000)
    );
  }

  getDecisionContext(policy, nowMs) {
    const usageDay = new Date(nowMs).toISOString().slice(0, 10);
    const windowMs = policy.rateWindowSeconds * 1000;
    const windowStart = Math.floor(nowMs / windowMs) * windowMs;
    return {
      nowMs,
      usageDay,
      windowStart,
      rateRetryAfter: Math.max(1, Math.ceil((windowStart + windowMs - nowMs) / 1000)),
      dayRetryAfter: secondsUntilNextUtcDay(nowMs)
    };
  }

  evaluateLimits(payload, policy, context) {
    const { actorKey, ipKey, profile } = payload;
    const { nowMs, usageDay, windowStart, rateRetryAfter, dayRetryAfter } = context;
    if (this.getRateCount("actor", actorKey, windowStart) >= policy.actorRateLimit) {
      return { allowed: false, reason: "actor_rate_limit", retryAfterSeconds: rateRetryAfter };
    }
    if (this.getRateCount("ip", ipKey, windowStart) >= policy.ipRateLimit) {
      return { allowed: false, reason: "ip_rate_limit", retryAfterSeconds: rateRetryAfter };
    }
    if (this.getActiveCount(nowMs, actorKey) >= policy.actorConcurrencyLimit) {
      return {
        allowed: false,
        reason: "actor_concurrency",
        retryAfterSeconds: Math.min(policy.reservationTtlSeconds, 10)
      };
    }
    if (this.getActiveCount(nowMs) >= policy.globalConcurrencyLimit) {
      return {
        allowed: false,
        reason: "global_concurrency",
        retryAfterSeconds: Math.min(policy.reservationTtlSeconds, 10)
      };
    }
    if (this.getDailyCount("global", "all", usageDay) >= policy.globalDailyLimit) {
      return { allowed: false, reason: "global_limit", retryAfterSeconds: dayRetryAfter };
    }
    if (this.getDailyCount("actor", actorKey, usageDay) >= policy.profileDailyLimit) {
      return { allowed: false, reason: "profile_quota", retryAfterSeconds: dayRetryAfter };
    }
    if (profile === "visitor"
      && this.getDailyCount("visitor_ip", ipKey, usageDay) >= policy.visitorIpDailyLimit) {
      return { allowed: false, reason: "visitor_ip_quota", retryAfterSeconds: dayRetryAfter };
    }
    return { allowed: true };
  }

  readReservationPolicy(payload) {
    if (!validReservationPayload(payload)) {
      return { response: jsonResponse({ ok: false, error: "invalid_reservation_request" }, 400) };
    }
    try {
      return { policy: readPolicy(this.env, payload.profile) };
    } catch (error) {
      console.error("[MapIA quota] Configuração inválida.");
      return { response: jsonResponse({ ok: false, error: "quota_configuration_invalid" }, 503) };
    }
  }

  inspect(payload) {
    const { policy, response } = this.readReservationPolicy(payload);
    if (response) return response;

    const context = this.getDecisionContext(policy, Date.now());
    const decision = this.evaluateLimits(payload, policy, context);
    return jsonResponse({ ok: true, ...decision, inspected: true });
  }

  applyReservationWrites(payload, policy, context) {
    const { requestId, actorKey, ipKey, profile } = payload;
    const { usageDay, windowStart, nowMs } = context;
    this.sql.exec(
      `INSERT INTO rate_windows (scope, subject_key, window_start, count)
       VALUES ('actor', ?, ?, 1)
       ON CONFLICT (scope, subject_key, window_start)
       DO UPDATE SET count = count + 1`,
      actorKey,
      windowStart
    );
    this.sql.exec(
      `INSERT INTO rate_windows (scope, subject_key, window_start, count)
       VALUES ('ip', ?, ?, 1)
       ON CONFLICT (scope, subject_key, window_start)
       DO UPDATE SET count = count + 1`,
      ipKey,
      windowStart
    );
    this.sql.exec(
      `INSERT INTO daily_usage (scope, subject_key, usage_day, count)
       VALUES ('global', 'all', ?, 1)
       ON CONFLICT (scope, subject_key, usage_day)
       DO UPDATE SET count = count + 1`,
      usageDay
    );
    this.sql.exec(
      `INSERT INTO daily_usage (scope, subject_key, usage_day, count)
       VALUES ('actor', ?, ?, 1)
       ON CONFLICT (scope, subject_key, usage_day)
       DO UPDATE SET count = count + 1`,
      actorKey,
      usageDay
    );
    if (profile === "visitor") {
      this.sql.exec(
        `INSERT INTO daily_usage (scope, subject_key, usage_day, count)
         VALUES ('visitor_ip', ?, ?, 1)
         ON CONFLICT (scope, subject_key, usage_day)
         DO UPDATE SET count = count + 1`,
        ipKey,
        usageDay
      );
    }
    this.sql.exec(
      `INSERT INTO reservations (
        reservation_id, actor_key, ip_key, profile, usage_day, status,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      requestId,
      actorKey,
      ipKey,
      profile,
      usageDay,
      nowMs,
      nowMs + (policy.reservationTtlSeconds * 1000)
    );
  }

  reserve(payload) {
    const { policy, response } = this.readReservationPolicy(payload);
    if (response) return response;

    const context = this.getDecisionContext(policy, Date.now());
    const result = this.storage.transactionSync(() => {
      this.cleanup(context.nowMs, context.windowStart);

      const existing = firstRow(this.sql.exec(
        "SELECT reservation_id, status FROM reservations WHERE reservation_id = ?",
        payload.requestId
      ));
      if (existing) {
        return {
          allowed: existing.status === "active" || existing.status === "settled",
          reservationId: existing.reservation_id,
          duplicate: true
        };
      }

      const decision = this.evaluateLimits(payload, policy, context);
      if (!decision.allowed) return decision;

      this.applyReservationWrites(payload, policy, context);
      return { allowed: true, reservationId: payload.requestId };
    });

    return jsonResponse({ ok: true, ...result });
  }

  settle(payload) {
    const reservationId = String(payload?.reservationId || "");
    const outcome = ["success", "error", "timeout"].includes(payload?.outcome)
      ? payload.outcome
      : "error";
    if (!reservationId) {
      return jsonResponse({ ok: false, error: "reservation_id_required" }, 400);
    }

    const nowMs = Date.now();
    const result = this.storage.transactionSync(() => {
      const reservation = firstRow(this.sql.exec(
        "SELECT status, expires_at FROM reservations WHERE reservation_id = ?",
        reservationId
      ));
      if (!reservation) return { settled: false, charged: false };
      if (reservation.status !== "active") {
        return { settled: false, charged: reservation.status !== "released", duplicate: true };
      }
      if (Number(reservation.expires_at) <= nowMs) {
        this.sql.exec(
          "UPDATE reservations SET status = 'expired', outcome = 'reservation_timeout', settled_at = ? WHERE reservation_id = ? AND status = 'active'",
          nowMs,
          reservationId
        );
        return { settled: false, charged: true, expired: true };
      }
      this.sql.exec(
        "UPDATE reservations SET status = 'settled', outcome = ?, settled_at = ? WHERE reservation_id = ? AND status = 'active'",
        outcome,
        nowMs,
        reservationId
      );
      return { settled: true, charged: true };
    });
    return jsonResponse({ ok: true, ...result });
  }

  release(payload) {
    const reservationId = String(payload?.reservationId || "");
    if (!reservationId) {
      return jsonResponse({ ok: false, error: "reservation_id_required" }, 400);
    }

    const nowMs = Date.now();
    const result = this.storage.transactionSync(() => {
      const reservation = firstRow(this.sql.exec(
        "SELECT actor_key, ip_key, profile, usage_day, status, expires_at FROM reservations WHERE reservation_id = ?",
        reservationId
      ));
      if (!reservation) return { released: false, charged: false };
      if (reservation.status !== "active") {
        return { released: false, charged: reservation.status !== "released" };
      }
      if (Number(reservation.expires_at) <= nowMs) {
        this.sql.exec(
          "UPDATE reservations SET status = 'expired', outcome = 'reservation_timeout', settled_at = ? WHERE reservation_id = ? AND status = 'active'",
          nowMs,
          reservationId
        );
        return { released: false, charged: true, expired: true };
      }

      this.sql.exec(
        "UPDATE daily_usage SET count = MAX(0, count - 1) WHERE scope = 'global' AND subject_key = 'all' AND usage_day = ?",
        reservation.usage_day
      );
      this.sql.exec(
        "UPDATE daily_usage SET count = MAX(0, count - 1) WHERE scope = 'actor' AND subject_key = ? AND usage_day = ?",
        reservation.actor_key,
        reservation.usage_day
      );
      if (reservation.profile === "visitor") {
        this.sql.exec(
          "UPDATE daily_usage SET count = MAX(0, count - 1) WHERE scope = 'visitor_ip' AND subject_key = ? AND usage_day = ?",
          reservation.ip_key,
          reservation.usage_day
        );
      }
      this.sql.exec(
        "UPDATE reservations SET status = 'released', outcome = 'pre_inference_release', settled_at = ? WHERE reservation_id = ? AND status = 'active'",
        nowMs,
        reservationId
      );
      return { released: true, charged: false };
    });
    return jsonResponse({ ok: true, ...result });
  }

  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    }

    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ ok: false, error: "invalid_json" }, 400);
    }

    if (payload.operation === "inspect") return this.inspect(payload);
    if (payload.operation === "reserve") return this.reserve(payload);
    if (payload.operation === "settle") return this.settle(payload);
    if (payload.operation === "release") return this.release(payload);
    return jsonResponse({ ok: false, error: "unsupported_operation" }, 400);
  }
}

export default {
  async fetch() {
    return jsonResponse({ ok: false, error: "access_denied" }, 403);
  }
};
