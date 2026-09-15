import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { authCredentials } from "./auth";
import type { HomeState } from "./types";

const FILE_NAME = "smarthome-state.json";
const KEY = "smarthome-state";
const GIST_DESC = "smarthome.visionone.si-state";
const GITHUB_PATH = "sync/home-state.json";
const GITHUB_BRANCH = "sync-data";

const memory = globalThis as typeof globalThis & {
  __smarthomeState?: HomeState;
  __smarthomeGistId?: string;
  __smarthomeGithubSha?: string;
};

export type PersistResult = { persisted: boolean; backends: string[] };

function cacheGet() {
  return memory.__smarthomeState;
}

function cacheSet(state: HomeState) {
  memory.__smarthomeState = state;
}

function onVercel() {
  return Boolean(process.env.VERCEL);
}

function filePaths() {
  return [
    path.join(process.cwd(), "data", FILE_NAME),
    path.join(os.tmpdir(), FILE_NAME),
  ];
}

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function githubRepo() {
  return {
    owner: process.env.VERCEL_GIT_REPO_OWNER || "MaliHorvat",
    repo: process.env.VERCEL_GIT_REPO_SLUG || "smart-home.visionone.si",
  };
}

function stateKey() {
  return scryptSync(authCredentials().secret, "smarthome-state-v1", 32);
}

function encryptState(state: HomeState) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", stateKey(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(state), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    data: Buffer.concat([iv, tag, enc]).toString("base64"),
  });
}

function decryptState(payload: string): HomeState | null {
  try {
    const parsed = JSON.parse(payload) as { v?: number; data?: string } | HomeState;
    if (parsed && "data" in parsed && typeof parsed.data === "string") {
      const buf = Buffer.from(parsed.data, "base64");
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const data = buf.subarray(28);
      const decipher = createDecipheriv("aes-256-gcm", stateKey(), iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
      return JSON.parse(plain) as HomeState;
    }
    if (parsed && "devices" in parsed && "settings" in parsed) {
      return parsed as HomeState;
    }
    return null;
  } catch {
    return null;
  }
}

async function readJsonFile(file: string) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as HomeState;
  } catch {
    return null;
  }
}

async function writeJsonFile(file: string, state: HomeState) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(state), "utf8");
  return true;
}

async function readKv() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const response = await fetch(`${url.replace(/\/$/, "")}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { result?: string | HomeState | null };
  if (!data.result) return null;
  return typeof data.result === "string" ? (JSON.parse(data.result) as HomeState) : data.result;
}

async function writeKv(state: HomeState) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  const response = await fetch(url.replace(/\/$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", KEY, JSON.stringify(state)]),
  });
  return response.ok;
}

async function readBlob() {
  if (!blobConfigured()) return null;
  try {
    const result = await get(FILE_NAME, { access: "private", useCache: false });
    if (!result?.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as HomeState;
  } catch {
    return null;
  }
}

async function writeBlob(state: HomeState) {
  if (!blobConfigured()) return false;
  try {
    await put(FILE_NAME, JSON.stringify(state), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return true;
  } catch {
    return false;
  }
}

function githubHeaders() {
  const token = githubToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "smarthome.visionone.si",
  };
}

async function findGistId(headers: Record<string, string>) {
  if (process.env.GIST_ID) return process.env.GIST_ID;
  if (memory.__smarthomeGistId) return memory.__smarthomeGistId;
  const response = await fetch("https://api.github.com/gists?per_page=50", {
    headers,
    cache: "no-store",
  });
  if (!response.ok) return "";
  const gists = (await response.json()) as Array<{ id: string; description: string | null }>;
  const found = gists.find((gist) => gist.description === GIST_DESC);
  if (found?.id) memory.__smarthomeGistId = found.id;
  return found?.id || "";
}

async function readGithub() {
  const headers = githubHeaders();
  if (!headers) return null;
  try {
    const gistId = await findGistId(headers);
    if (gistId) {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers,
        cache: "no-store",
      });
      if (response.ok) {
        const gist = (await response.json()) as {
          files?: Record<string, { content?: string; raw_url?: string }>;
        };
        const file = gist.files?.[FILE_NAME] || Object.values(gist.files || {})[0];
        const content = file?.content || (file?.raw_url ? await (await fetch(file.raw_url, { cache: "no-store" })).text() : "");
        if (content) return decryptState(content);
      }
    }

    const { owner, repo } = githubRepo();
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`,
      { headers, cache: "no-store" },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { content?: string; sha?: string };
    if (data.sha) memory.__smarthomeGithubSha = data.sha;
    if (!data.content) return null;
    return decryptState(Buffer.from(data.content, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

async function ensureSyncBranch(headers: Record<string, string>) {
  const { owner, repo } = githubRepo();
  const branch = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${GITHUB_BRANCH}`, {
    headers,
    cache: "no-store",
  });
  if (branch.ok) return true;
  const main = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, {
    headers,
    cache: "no-store",
  });
  if (!main.ok) return false;
  const mainData = (await main.json()) as { object?: { sha?: string } };
  const sha = mainData.object?.sha;
  if (!sha) return false;
  const created = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${GITHUB_BRANCH}`, sha }),
  });
  return created.ok || created.status === 422;
}

async function writeGithub(state: HomeState) {
  const headers = githubHeaders();
  if (!headers) return false;
  const payload = encryptState(state);
  try {
    const gistId = await findGistId(headers);
    if (gistId) {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          files: { [FILE_NAME]: { content: payload } },
        }),
      });
      if (response.ok) return true;
    } else {
      const created = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          description: GIST_DESC,
          public: false,
          files: { [FILE_NAME]: { content: payload } },
        }),
      });
      if (created.ok) {
        const gist = (await created.json()) as { id?: string };
        if (gist.id) memory.__smarthomeGistId = gist.id;
        return true;
      }
    }

    if (!(await ensureSyncBranch(headers))) return false;
    const { owner, repo } = githubRepo();
    const existing = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`,
      { headers, cache: "no-store" },
    );
    const existingData = existing.ok ? ((await existing.json()) as { sha?: string }) : null;
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_PATH}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "sync home dashboard state",
        content: Buffer.from(payload).toString("base64"),
        branch: GITHUB_BRANCH,
        sha: existingData?.sha || memory.__smarthomeGithubSha,
      }),
    });
    if (!response.ok) return false;
    const saved = (await response.json()) as { content?: { sha?: string } };
    if (saved.content?.sha) memory.__smarthomeGithubSha = saved.content.sha;
    return true;
  } catch {
    return false;
  }
}

async function readBridge(state?: HomeState | null) {
  const bridgeUrl = String(state?.settings.bridgeUrl || process.env.BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(state?.settings.bridgeToken || process.env.BRIDGE_TOKEN || "");
  if (!bridgeUrl || !token) return null;
  try {
    const response = await fetch(`${bridgeUrl}/state`, {
      headers: { "x-bridge-token": token },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { state?: HomeState };
    return data.state || null;
  } catch {
    return null;
  }
}

async function writeBridge(state: HomeState) {
  const bridgeUrl = String(state.settings.bridgeUrl || process.env.BRIDGE_URL || "").replace(/\/$/, "");
  const token = String(state.settings.bridgeToken || process.env.BRIDGE_TOKEN || "");
  if (!bridgeUrl || !token) return false;
  try {
    const response = await fetch(`${bridgeUrl}/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-token": token,
      },
      body: JSON.stringify({ state }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function newest(states: Array<HomeState | null | undefined>) {
  return states
    .filter((item): item is HomeState => Boolean(item?.devices && item.settings))
    .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0] || null;
}

export async function readCloudState(): Promise<HomeState | null> {
  const [kv, blob, github, bridge] = await Promise.all([
    readKv(),
    readBlob(),
    readGithub(),
    readBridge(null),
  ]);
  const files = onVercel()
    ? []
    : await Promise.all(filePaths().map((file) => readJsonFile(file)));
  const state = newest([kv, blob, github, bridge, ...files, cacheGet()]);
  if (state) cacheSet(state);
  return state;
}

export async function writeCloudState(state: HomeState): Promise<PersistResult> {
  cacheSet(state);
  const jobs: Array<[string, Promise<boolean>]> = [
    ["kv", writeKv(state)],
    ["blob", writeBlob(state)],
    ["github", writeGithub(state)],
    ["bridge", writeBridge(state)],
  ];
  if (!onVercel()) {
    jobs.push(["file", writeJsonFile(filePaths()[0], state)]);
  }
  const results = await Promise.allSettled(jobs.map(([, job]) => job));
  const backends = jobs
    .map(([name], index) => {
      const result = results[index];
      return result.status === "fulfilled" && result.value ? name : null;
    })
    .filter((name): name is string => Boolean(name));
  return { persisted: backends.length > 0, backends };
}
