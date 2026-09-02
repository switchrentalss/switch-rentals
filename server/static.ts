import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function clientBuildDir() {
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(import.meta.dirname, "public"),
    path.resolve(import.meta.dirname, "dist", "public"),
  ];
  return candidates.find((dir) => fs.existsSync(dir));
}

export function serveStatic(app: Express) {
  const distPath = clientBuildDir();

  if (!distPath) {
    throw new Error(
      `Could not find the client build (cwd=${process.cwd()}, dirname=${import.meta.dirname})`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
