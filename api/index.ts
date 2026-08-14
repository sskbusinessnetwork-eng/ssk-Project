import appPromise from '../server';

export default async function handler(req: any, res: any) {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless handler error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
