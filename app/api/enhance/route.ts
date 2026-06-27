import Replicate from "replicate";
import { NextRequest } from "next/server";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl } = await req.json();

    // Convert base64 dataURL to a blob URL Replicate can accept
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: "image/jpeg" });

   const output = await replicate.run(
  "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355f829a539ad21ef73bae4ef2f0c450",
  {
    input: {
      img: blob,
      version: "v1.4",
      scale: 2
    }
  }
) as unknown as string;

return Response.json({ enhancedUrl: output });

    return Response.json({ enhancedUrl: output });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}