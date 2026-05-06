import app from "./app.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3333;

const start = async (): Promise<void> => {
  try {
    const address = await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`[API] Server running on ${address}`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[API] Critical error starting server:", errorMessage);
    process.exit(1);
  }
};

void start();
