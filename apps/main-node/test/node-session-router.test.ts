import { describe, expect, it } from "vitest";
import { NodeSessionRouter } from "../src/lib/node-session-router";

describe("NodeSessionRouter", () => {
  it("publishes session.error when session initialization fails", async () => {
    const events: any[] = [];
    const log = {
      appendAsync: async (event: any) => {
        events.push(event);
      },
      getEventsAsync: async () => events,
    };
    const router = new NodeSessionRouter({
      sql: {
        prepare: () => ({
          bind: () => ({
            first: async () => ({ tenant_id: "tenant-1", agent_id: "agent-1" }),
          }),
        }),
      } as any,
      hub: { publish: (_sessionId: string, event: unknown) => events.push(event) } as any,
      registry: {
        getOrCreate: async () => {
          throw new Error("sandbox unavailable");
        },
        interrupt: () => undefined,
      } as any,
      newEventLog: () => log as any,
    });

    await expect(
      router.appendEvent("session-1", {
        type: "user.message",
        message: { role: "user", content: "hello" },
      } as any),
    ).resolves.toMatchObject({ status: 202 });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "session.error",
          error: "session_initialization_failed",
          message: "sandbox unavailable",
        }),
      ]),
    );
  });

  it("rejects appendEvent with 409 when session is archived", async () => {
    const events: any[] = [];
    let getOrCreateCalled = false;
    const log = {
      appendAsync: async (event: any) => {
        events.push(event);
      },
      getEventsAsync: async () => events,
    };
    const router = new NodeSessionRouter({
      sql: {
        prepare: () => ({
          bind: () => ({
            first: async () => ({
              tenant_id: "tenant-1",
              agent_id: "agent-1",
              archived_at: "2026-01-01T00:00:00.000Z",
            }),
          }),
        }),
      } as any,
      hub: { publish: () => {} } as any,
      registry: {
        getOrCreate: async () => {
          getOrCreateCalled = true;
        },
        interrupt: () => undefined,
      } as any,
      newEventLog: () => log as any,
    });

    const result = await router.appendEvent("session-1", {
      type: "user.message",
      content: [{ type: "text", text: "hello" }],
    } as any);

    expect(result.status).toBe(409);
    expect(JSON.parse(result.body)).toEqual({
      error: "Session is archived and cannot receive new events",
    });
    expect(events.length).toBe(0);
    expect(getOrCreateCalled).toBe(false);
  });
});
