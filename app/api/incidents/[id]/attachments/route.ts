import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/middleware/auth";
import { db } from "@/db";
import { incident_attachments } from "@/db/schema";
import { promises as fs } from 'fs';
import path from 'path';

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const p = await params;
        const incidentId = parseInt(p.id, 10);
        if (isNaN(incidentId)) {
            return NextResponse.json({ error: "Invalid incident ID" }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "File is required." }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Only image files (PNG, JPG, WEBP) are allowed. GIFs and PDFs are not supported." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Simple sanitization
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${Date.now()}_${safeName}`;
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const filePath = path.join(uploadsDir, filename);
        await fs.writeFile(filePath, buffer);

        const fileUrl = `/api/uploads/${filename}`;

        // DB Insert
        const [attachment] = await db.insert(incident_attachments).values({
            filename: file.name,
            fileUrl,
            fileType: file.type || "application/octet-stream",
            incidentId,
            uploadedById: req.user!.userId
        }).returning();

        return NextResponse.json(attachment, { status: 201 });
    } catch (error) {
        console.error("Attachment upload error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});
