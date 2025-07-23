import { NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";
import { jobStatus } from "../upload/route";  // Updated path

export async function GET(request) {
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

    // Get jobId from the URL search params since this is not a dynamic route
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID not provided" }, { status: 400 });
    }
    
    // Check in-memory status first
    if (jobStatus[jobId]) {
      return NextResponse.json({
        exists: true,
        status: jobStatus[jobId]
      });
    }
    
    // Check if file exists on disk
    const completedPath = path.join(process.cwd(), "completed", `${jobId}.zip`);
    const exists = existsSync(completedPath);
    
    if (exists) {
      // Update the in-memory status
      jobStatus[jobId] = "completed";
    }
    
    return NextResponse.json({
      exists: exists,
      status: exists ? "completed" : "not_found"
    });
  } catch (error) {
    console.error("Error checking job existence:", error);
    return NextResponse.json({ error: "Failed to check job existence" }, { status: 500 });
  }
}