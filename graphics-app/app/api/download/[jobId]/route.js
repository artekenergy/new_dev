import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { jobStatus } from "../../upload/route";  // Updated path

export async function GET(request, { params }) {
  try {
    // Basic auth check
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const credentials = atob(authHeader.substring(6));
    const [username, password] = credentials.split(':');
    
    if (username !== "GarminInstaller" || password !== "Powering2024!") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Make sure to await params in Next.js App Router
    const jobId = params?.jobId;
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID not provided" }, { status: 400 });
    }
    
    const filePath = path.join(process.cwd(), "completed", `${jobId}.zip`);
    
    // Check if file exists first, regardless of in-memory status
    if (!existsSync(filePath)) {
      console.error(`Download requested for non-existent job: ${jobId}`);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    
    // File exists, so it's considered completed
    if (!jobStatus[jobId]) {
      jobStatus[jobId] = "completed";
    }
    
    // Read the file
    const fileBuffer = await readFile(filePath);
    console.log(`Serving download for job ${jobId}, size: ${fileBuffer.length} bytes`);
    
    // Return the file as a download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="UpdatedGraphicsConfig.zip"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error(`Error downloading job:`, error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}