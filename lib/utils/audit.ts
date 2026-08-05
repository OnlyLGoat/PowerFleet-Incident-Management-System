import { NextResponse } from "next/server";
import { SecurityAudit } from "@/lib/services/securityaudit.service";
import { AuthenticatedRequest } from "@/middleware/auth";

export async function withAudit(
    req: AuthenticatedRequest | Request,
    endpoint: string,
    handler: () => Promise<Response> | Response
) {
    let incidentId: number | undefined;
    const match = /\/incidents\/(\d+)(?:\/|\?|$)/.exec(req.url);
    if (match) {
        incidentId = Number(match[1]);
    }

    try {
        const response = await handler();
        
        let message = response.ok ? "Success" : "Error";
        let userId = 'user' in req ? (req as AuthenticatedRequest).user?.userId : undefined;
        
        try {
            const clone = response.clone();
            const json = await clone.json();
            if (response.ok) {
                if (json.message) message = json.message;
                if (json.user?.id) userId = json.user.id;
            } else {
                message = json.error || message;
            }
        } catch {}

        try {
            await SecurityAudit.createSecurityAudit({
                attemptedEndpoint: endpoint,
                message,
                statusCode: response.status,
                incidentTragetId: incidentId
            }, req, userId);
        } catch (e) {
            console.error("Audit log error:", e);
        }

        return response;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        const status = err.status || 500;
        const message = err.message || "Internal Server Error";
        
        const userId = 'user' in req ? (req as AuthenticatedRequest).user?.userId : undefined;

        try {
            await SecurityAudit.createSecurityAudit({
                attemptedEndpoint: endpoint,
                message,
                statusCode: status,
                incidentTragetId: incidentId
            }, req, userId);
        } catch (e) {
            console.error("Audit log error on exception:", e);
        }

        return NextResponse.json(
            { error: status === 500 ? "Internal Server Error" : message, details: status === 500 ? message : undefined },
            { status }
        );
    }
}
