/** FXServer RCON over UDP (the Quake-style protocol FXServer speaks), shared by `rcon.ts` and `restart.ts`. */
import { createSocket } from "node:dgram";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff]);

/** rcon_password and the UDP port from cfg files; a bare `rcon_password` line (without set) does not enable RCON. */
export function readCfg(paths: string[]): { password?: string; port?: number } {
  let password: string | undefined;
  let port: number | undefined;
  for (const path of paths) {
    for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = raw.split("#", 1)[0]?.trim() ?? "";
      const pass = /^set\s+rcon_password\s+"?([^"\s]*)"?/.exec(line);
      if (pass) password = pass[1];
      const udp = /^endpoint_add_udp\s+"?[^:"]*:(\d+)"?/.exec(line);
      if (udp && port === undefined) port = Number(udp[1]);
    }
  }
  return { password, port };
}

/** Sends one command and resolves with what it printed ("" when nothing came back: UDP drops packets). */
export function rcon(
  host: string,
  port: number,
  password: string,
  cmd: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve) => {
    const socket = createSocket("udp4");
    const chunks: Buffer[] = [];
    let timer = setTimeout(finish, timeoutMs);

    function finish(): void {
      socket.close();
      resolve(Buffer.concat(chunks).toString("utf8"));
    }

    socket.on("message", (data) => {
      const prefix = Buffer.concat([HEADER, Buffer.from("print")]);
      if (!data.subarray(0, prefix.length).equals(prefix)) return;
      chunks.push(
        Buffer.from(
          data
            .subarray(prefix.length)
            .toString("utf8")
            .replace(/^[ \n]+/, ""),
        ),
      );
      // Later datagrams of a long reply arrive close together; keep listening briefly.
      clearTimeout(timer);
      timer = setTimeout(finish, 300);
    });

    socket.send(
      Buffer.concat([HEADER, Buffer.from(`rcon ${password} ${cmd}`)]),
      port,
      host,
    );
  });
}

export const serverRoot = join(import.meta.dir, "..");

/** The connection from env.cfg next to server.cfg (or the given cfg files); exits when RCON is not set up. */
export function connection(cfg?: string[]): { password: string; port: number } {
  const defaultCfg = join(serverRoot, "env.cfg");
  const paths = cfg ?? (existsSync(defaultCfg) ? [defaultCfg] : []);
  const found = readCfg(paths);
  if (!found.password) {
    console.error(
      'rcon: no rcon_password (set rcon_password "..." in env.cfg, or pass --password)',
    );
    process.exit(1);
  }
  return { password: found.password, port: found.port ?? 30120 };
}
