import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Try multiple possible build directories
  const possibleDirs = [
    path.join(process.cwd(), "dist"),
    path.join(process.cwd(), "client", "dist"),
    path.join(__dirname, "..", "dist"),
    path.join(__dirname, "..", "client", "dist")
  ];

  let buildDir: string | null = null;

  console.log("Looking for build directory in:", possibleDirs);

  for (const dir of possibleDirs) {
    console.log(`Checking directory: ${dir} - exists: ${fs.existsSync(dir)}`);
    if (fs.existsSync(dir)) {
      const indexPath = path.join(dir, "index.html");
      console.log(`Checking index.html at: ${indexPath} - exists: ${fs.existsSync(indexPath)}`);
      if (fs.existsSync(indexPath)) {
        buildDir = dir;
        break;
      }
    }
  }

  if (!buildDir) {
    console.warn(`Build directory not found. Checked: ${possibleDirs.join(', ')}`);
    // Create a minimal static directory as fallback
    const fallbackDir = path.join(process.cwd(), "dist");
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    
    const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gerenciador WhatsApp - Building</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Sistema Inicializando</h1>
    <div class="spinner"></div>
    <p>O frontend está sendo preparado. Por favor, aguarde alguns instantes e recarregue a página.</p>
    <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Recarregar Página</button>
  </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(fallbackDir, "index.html"), fallbackHtml);
    buildDir = fallbackDir;
    console.log(`Created fallback directory at: ${buildDir}`);
  }

  console.log(`Serving static files from: ${buildDir}`);
  
  app.use(express.static(buildDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(buildDir, "index.html"), (err) => {
      if (err) {
        console.error("Error serving index.html:", err);
        res.status(500).send("Error loading application");
      }
    });
  });
}
