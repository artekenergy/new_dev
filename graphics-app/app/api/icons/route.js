import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path to icons directory
    const iconsDir = path.join(process.cwd(), 'public', 'icons');
    
    // Read all files in the directory
    const files = fs.readdirSync(iconsDir);
    
    // Filter for image files
    const iconFiles = files.filter(file => 
      /\.(png|jpg|jpeg|svg|gif)$/i.test(file) && !/white/i.test(file)
    );
    
    // Create a detailed response with icon information
    const iconDetails = iconFiles.map(file => ({
      name: file,
      path: `/icons/${file}`,
      displayName: file.replace(/\.[^/.]+$/, "").replace(/-/g, " ") // Format name for display
    }));
    
    return NextResponse.json(iconDetails);
  } catch (error) {
    console.error('Error fetching icons:', error);
    return NextResponse.json({ error: 'Failed to fetch icons' }, { status: 500 });
  }
}