import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import JSZip from "jszip";
const destination = path.resolve(process.argv[2] || "work/release-template");
try {
  await access(destination);
  throw Error("發佈目錄已存在；請先檢查，禁止覆蓋。");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const docs = new Set([
  "AI_STORY_GUIDE.md",
  "STORY_SCHEMA.md",
  "ARCHITECTURE.md",
  "PROGRESS.md",
  "APP_DEVELOPMENT.md",
  "STORY_ENGINE.md",
  "WORK_FORMAT.md",
  "GITHUB_PAGES.md",
  "THIRD_PARTY_LICENSES.md",
  "dependency-licenses.json",
]);
const excluded = [];
const fileList = process.env.RELEASE_FILE_LIST
  ? (await readFile(process.env.RELEASE_FILE_LIST, "utf8")).replace(/^\uFEFF/, "").trim().split(/\r?\n/).join("\0")
  : execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" });
const files = [
  ...new Set(
    fileList
      .split("\0")
      .filter(Boolean),
  ),
];
const zip = new JSZip();
const manifest = [];
for (const file of files) {
  const denied =
    /^(references\/|outputs\/|work\/|backups\/|\.git\/)/.test(file) ||
    (/^docs\//.test(file) &&
      !docs.has(file.slice(5)) &&
      !file.startsWith("docs/images/")) ||
    /^(TEST_RESULTS|DELIVERY|CHANGED_FILES)/.test(file) ||
    /^(scripts\/(fetch-original-icons|build-local-preview|package-delivery)\.mjs)$/.test(
      file,
    ) ||
    /(^|\/)(\.env(?:\..*)?|[^/]+\.(pem|key|zip|bundle|log))$/.test(file);
  if (denied) {
    excluded.push(file);
    continue;
  }
  let bytes = await readFile(file);
  if (file === "package.json") {
    const pkg = JSON.parse(bytes);
    delete pkg.scripts["icons:fetch"];
    delete pkg.scripts["build:local"];
    bytes = Buffer.from(JSON.stringify(pkg, null, 2) + "\n");
  }
  const text = bytes.toString("utf8");
  if (
    /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|sk-proj-[A-Za-z0-9_-]{25,}/.test(
      text,
    )
  )
    throw Error("疑似機密憑證，請檢查檔案：" + file);
  const target = path.join(destination, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  zip.file(file, bytes);
  manifest.push({
    file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await mkdir("outputs", { recursive: true });
const packed = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
});
await JSZip.loadAsync(packed, { checkCRC32: true });
await writeFile("outputs/FoundPhone-Studio-release-source.zip", packed);
await writeFile(
  "outputs/release-manifest.json",
  JSON.stringify(
    {
      files: manifest,
      excluded,
      zipSha256: createHash("sha256").update(packed).digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `已準備 ${manifest.length} 個檔案，排除 ${excluded.length} 個本機/歷史檔案；ZIP CRC32 驗證通過。未建立儲存庫或進行推送。`,
);
