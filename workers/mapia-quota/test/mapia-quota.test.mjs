import { env, exports as workerExports } from "cloudflare:workers";
import {
  evictDurableObject,
  reset,
  runInDurableObject
} from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";

const DAY = () => new Date().toISOString().slice(0, 10);

function quotaStub(label) {
  return env.MAPIA_QUOTA.get(env.MAPIA_QUOTA.idFromName(label));
}

function reservation(label, overrides = {}) {
  const suffix = label.replace(/[^a-z0-9]/gi, "-").padEnd(16, "x");
  return {
    requestId: `request-${suffix}`,
    actorKey: `actor-${suffix}`,
    ipKey: `ip-key-${suffix}`,
    profile: "free",
    ...overrides
  };
}

async function operation(stub, payload) {
  const response = await stub.fetch("https://mapia-quota.internal/v1/quota", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return { status: response.status, body: await response.json() };
}

async function settle(stub, reservationId, outcome = "success") {
  return operation(stub, { operation: "settle", reservationId, outcome });
}

afterEach(async () => {
  await reset();
});

describe("MapiaQuota no runtime Workers", () => {
  it("serializa reservas simultâneas que disputam a última quota do usuário", async () => {
    const stub = quotaStub("last-user-quota");
    const base = reservation("last-user-quota");
    await runInDurableObject(stub, (instance) => {
      instance.sql.exec(
        "INSERT INTO daily_usage (scope, subject_key, usage_day, count) VALUES ('actor', ?, ?, 2)",
        base.actorKey,
        DAY()
      );
      instance.sql.exec(
        "INSERT INTO daily_usage (scope, subject_key, usage_day, count) VALUES ('global', 'all', ?, 2)",
        DAY()
      );
    });

    const attempts = await Promise.all([
      operation(stub, { operation: "reserve", ...base, requestId: "request-last-quota-a" }),
      operation(stub, { operation: "reserve", ...base, requestId: "request-last-quota-b" })
    ]);

    expect(attempts.filter(({ body }) => body.allowed)).toHaveLength(1);
    expect(attempts.find(({ body }) => !body.allowed)?.body.reason).toBe("profile_quota");
  });

  it("aplica o teto global a usuários diferentes de forma atômica", async () => {
    const stub = quotaStub("last-global-quota");
    await runInDurableObject(stub, (instance) => {
      instance.sql.exec(
        "INSERT INTO daily_usage (scope, subject_key, usage_day, count) VALUES ('global', 'all', ?, 3)",
        DAY()
      );
    });

    const attempts = await Promise.all([
      operation(stub, { operation: "reserve", ...reservation("global-user-a") }),
      operation(stub, { operation: "reserve", ...reservation("global-user-b") })
    ]);

    expect(attempts.filter(({ body }) => body.allowed)).toHaveLength(1);
    expect(attempts.find(({ body }) => !body.allowed)?.body.reason).toBe("global_limit");
  });

  it("separa quota por usuário e aplica proteção coletiva de IP somente a visitantes", async () => {
    const visitorStub = quotaStub("visitor-ip");
    const sharedIp = "ip-key-shared-visitor";
    for (const label of ["visitor-a", "visitor-b"]) {
      const reserve = await operation(visitorStub, {
        operation: "reserve",
        ...reservation(label, { profile: "visitor", ipKey: sharedIp })
      });
      expect(reserve.body.allowed).toBe(true);
      await settle(visitorStub, reserve.body.reservationId);
    }
    const ipBlocked = await operation(visitorStub, {
      operation: "reserve",
      ...reservation("visitor-c", { profile: "visitor", ipKey: sharedIp })
    });
    expect(ipBlocked.body.reason).toBe("visitor_ip_quota");

    const userStub = quotaStub("user-quota");
    const actorKey = "actor-same-user-key";
    for (const label of ["user-one", "user-two", "user-three"]) {
      const reserve = await operation(userStub, {
        operation: "reserve",
        ...reservation(label, { actorKey })
      });
      expect(reserve.body.allowed).toBe(true);
      await settle(userStub, reserve.body.reservationId);
    }
    const userBlocked = await operation(userStub, {
      operation: "reserve",
      ...reservation("user-four", { actorKey, ipKey: "ip-key-another-network" })
    });
    expect(userBlocked.body.reason).toBe("profile_quota");

    const sharedUserIpStub = quotaStub("shared-user-ip");
    for (const label of ["free-user-a", "free-user-b"]) {
      const reserve = await operation(sharedUserIpStub, {
        operation: "reserve",
        ...reservation(label, { ipKey: "ip-key-shared-users" })
      });
      expect(reserve.body.allowed).toBe(true);
      await settle(sharedUserIpStub, reserve.body.reservationId);
    }
  });

  it("torna a liquidação idempotente", async () => {
    const stub = quotaStub("duplicate-settlement");
    const reserve = await operation(stub, {
      operation: "reserve",
      ...reservation("duplicate-settlement")
    });
    const first = await settle(stub, reserve.body.reservationId, "success");
    const duplicate = await settle(stub, reserve.body.reservationId, "error");

    expect(first.body).toMatchObject({ settled: true, charged: true });
    expect(duplicate.body).toMatchObject({
      settled: false,
      charged: true,
      duplicate: true
    });
    const outcome = await runInDurableObject(stub, (instance) => (
      instance.sql.exec(
        "SELECT outcome FROM reservations WHERE reservation_id = ?",
        reserve.body.reservationId
      ).toArray()[0]?.outcome
    ));
    expect(outcome).toBe("success");
  });

  it("expira a reserva sem devolver consumo e libera a concorrência", async () => {
    const stub = quotaStub("expired-reservation");
    const base = reservation("expired-reservation");
    const first = await operation(stub, { operation: "reserve", ...base });
    await runInDurableObject(stub, (instance) => {
      instance.sql.exec(
        "UPDATE reservations SET expires_at = 0 WHERE reservation_id = ?",
        first.body.reservationId
      );
    });

    const second = await operation(stub, {
      operation: "reserve",
      ...base,
      requestId: "request-after-expiry"
    });
    expect(second.body.allowed).toBe(true);
    const state = await runInDurableObject(stub, (instance) => {
      const expired = instance.sql.exec(
        "SELECT status FROM reservations WHERE reservation_id = ?",
        first.body.reservationId
      ).toArray()[0]?.status;
      const usage = instance.getDailyCount("actor", base.actorKey, DAY());
      return { expired, usage };
    });
    expect(state).toEqual({ expired: "expired", usage: 2 });
  });

  it("libera uma reserva e reverte os contadores diários na mesma transação", async () => {
    const stub = quotaStub("release");
    const base = reservation("release", { profile: "visitor" });
    const reserve = await operation(stub, { operation: "reserve", ...base });
    const released = await operation(stub, {
      operation: "release",
      reservationId: reserve.body.reservationId
    });
    expect(released.body).toMatchObject({ released: true, charged: false });

    const counts = await runInDurableObject(stub, (instance) => ({
      global: instance.getDailyCount("global", "all", DAY()),
      actor: instance.getDailyCount("actor", base.actorKey, DAY()),
      ip: instance.getDailyCount("visitor_ip", base.ipKey, DAY()),
      status: instance.sql.exec(
        "SELECT status FROM reservations WHERE reservation_id = ?",
        reserve.body.reservationId
      ).toArray()[0]?.status
    }));
    expect(counts).toEqual({ global: 0, actor: 0, ip: 0, status: "released" });
  });

  it("reverte todas as escritas quando uma operação SQL intermediária falha", async () => {
    const stub = quotaStub("transaction-rollback");
    const base = reservation("transaction-rollback");
    const result = await runInDurableObject(stub, (instance) => {
      const original = instance.applyReservationWrites;
      instance.applyReservationWrites = function injectFailure(payload, policy, context) {
        this.sql.exec(
          "INSERT INTO daily_usage (scope, subject_key, usage_day, count) VALUES ('global', 'all', ?, 1)",
          context.usageDay
        );
        throw new Error("injected_sql_failure");
      };

      let error = "";
      try {
        instance.reserve({ operation: "reserve", ...base });
      } catch (caught) {
        error = caught.message;
      } finally {
        instance.applyReservationWrites = original;
      }
      return {
        error,
        usageRows: instance.sql.exec("SELECT COUNT(*) AS count FROM daily_usage").toArray()[0].count,
        reservationRows: instance.sql.exec("SELECT COUNT(*) AS count FROM reservations").toArray()[0].count
      };
    });

    expect(result).toEqual({
      error: "injected_sql_failure",
      usageRows: 0,
      reservationRows: 0
    });
  });

  it("mantém reserva e contadores intactos quando a liberação falha no meio", async () => {
    const stub = quotaStub("release-rollback");
    const base = reservation("release-rollback");
    const reserve = await operation(stub, { operation: "reserve", ...base });
    const result = await runInDurableObject(stub, (instance) => {
      const originalSql = instance.sql;
      let dailyUpdates = 0;
      instance.sql = {
        exec(...args) {
          if (String(args[0]).startsWith("UPDATE daily_usage")) {
            dailyUpdates += 1;
            if (dailyUpdates === 2) throw new Error("injected_release_failure");
          }
          return originalSql.exec(...args);
        }
      };

      let error = "";
      try {
        instance.release({ reservationId: reserve.body.reservationId });
      } catch (caught) {
        error = caught.message;
      } finally {
        instance.sql = originalSql;
      }
      return {
        error,
        global: instance.getDailyCount("global", "all", DAY()),
        actor: instance.getDailyCount("actor", base.actorKey, DAY()),
        status: instance.sql.exec(
          "SELECT status FROM reservations WHERE reservation_id = ?",
          reserve.body.reservationId
        ).toArray()[0]?.status
      };
    });

    expect(result).toEqual({
      error: "injected_release_failure",
      global: 1,
      actor: 1,
      status: "active"
    });
  });

  it("preserva o consumo após reinicialização da instância", async () => {
    const stub = quotaStub("persistence");
    const base = reservation("persistence");
    for (const label of ["persist-a", "persist-b", "persist-c"]) {
      const reserve = await operation(stub, {
        operation: "reserve",
        ...base,
        requestId: `request-${label}-xxxx`
      });
      expect(reserve.body.allowed).toBe(true);
      await settle(stub, reserve.body.reservationId);
    }

    await evictDurableObject(stub);
    const afterRestart = await operation(stub, {
      operation: "inspect",
      ...base,
      requestId: "request-after-restart"
    });
    expect(afterRestart.body).toMatchObject({
      inspected: true,
      allowed: false,
      reason: "profile_quota"
    });
  });

  it("mantém audit somente leitura e não contamina a transição para enforce", async () => {
    const stub = quotaStub("audit-to-enforce");
    const base = reservation("audit-to-enforce");
    for (let index = 0; index < 5; index += 1) {
      const inspected = await operation(stub, {
        operation: "inspect",
        ...base,
        requestId: `request-audit-${index}-xxxx`
      });
      expect(inspected.body).toMatchObject({ inspected: true, allowed: true });
    }

    const auditState = await runInDurableObject(stub, (instance) => ({
      usageRows: instance.sql.exec("SELECT COUNT(*) AS count FROM daily_usage").toArray()[0].count,
      rateRows: instance.sql.exec("SELECT COUNT(*) AS count FROM rate_windows").toArray()[0].count,
      reservations: instance.sql.exec("SELECT COUNT(*) AS count FROM reservations").toArray()[0].count
    }));
    expect(auditState).toEqual({ usageRows: 0, rateRows: 0, reservations: 0 });

    for (const label of ["enforce-a", "enforce-b", "enforce-c"]) {
      const reserve = await operation(stub, {
        operation: "reserve",
        ...base,
        requestId: `request-${label}-xxxx`
      });
      expect(reserve.body.allowed).toBe(true);
      await settle(stub, reserve.body.reservationId);
    }
    const blocked = await operation(stub, {
      operation: "reserve",
      ...base,
      requestId: "request-enforce-block"
    });
    expect(blocked.body.reason).toBe("profile_quota");
  });

  it.each(["inspect", "reserve", "settle", "release"])(
    "nega a operação %s na superfície HTTP externa",
    async (operationName) => {
      const response = await workerExports.default.fetch("https://public.example/v1/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: operationName })
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, error: "access_denied" });
    }
  );
});
