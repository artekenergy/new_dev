import { NextResponse } from "next/server";
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
    
    // Await params in Next.js 15
    const resolvedParams = await params;

    // Properly handle params in Next.js App Router
    if (!resolvedParams || !resolvedParams.jobId) {
      return NextResponse.json({ error: "Job ID not provided" }, { status: 400 });
    }
    
    const jobId = resolvedParams.jobId;
    
    // First check memory status
    if (jobStatus[jobId]) {
      return NextResponse.json({
        jobId: jobId,
        status: jobStatus[jobId]
      });
    }
    
    // If not in memory, check if file exists on disk
    const completedPath = path.join(process.cwd(), "completed", `${jobId}.zip`);
    
    if (existsSync(completedPath)) {
      // Update the in-memory status
      jobStatus[jobId] = "completed";
      return NextResponse.json({
        jobId: jobId,
        status: "completed"
      });
    }
    
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  } catch (error) {
    console.error("Error checking job status:", error);
    return NextResponse.json({ error: "Failed to check job status" }, { status: 500 });
  }
}