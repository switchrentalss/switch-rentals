import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function clientBuildDir() {
  let here = process.cwd();
  try {
    if (typeof import.meta.dirname === "string") here = import.meta.dirname;
    else if (typeof import.meta.url === "string") here = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    here = process.cwd();
  }
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "public"),
    path.resolve(here, "public"),
  ];
  return candidates.find((dir) => fs.existsSync(dir));
}

export function serveStatic(app: Express) {
  const distPath = clientBuildDir();

  if (!distPath) {
    throw new Error(
      `Could not find the client build (cwd=${process.cwd()})`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
