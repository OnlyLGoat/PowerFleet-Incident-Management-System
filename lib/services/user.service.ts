import { db } from "@/db";
import { users, internal_users, admins, support_managers, technicians, clients } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyAdminAccess } from "@/lib/services/role";
import bcrypt from "bcryptjs";

interface StatusError extends Error {
  status?: number;
}

function createStatusError(message: string, status: number): StatusError {
  const error = new Error(message) as StatusError;
  error.status = status;
  return error;
}

export interface UserProfileWithDetails {
  id: number;
  name: string;
  email: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  role: "Admin" | "Support Manager" | "Technician" | "ClientUser";
  isActive?: boolean;
  department?: string;
  hireDate?: Date | null;
  canManageUsers?: boolean;
  canAssign?: boolean;
  specialty?: string;
  isAvailable?: boolean;
  companyName?: string;
  phone?: string;
}

export class UserService {
  /**
   * Retrieves all users with their associated role details.
   */
  static async getAllUsers(authenticatedUserId: number): Promise<UserProfileWithDetails[]> {
    await verifyAdminAccess(authenticatedUserId);

    const baseUsers = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    const userProfiles: UserProfileWithDetails[] = [];

    for (const user of baseUsers) {
      // Check Client
      const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.userId, user.id),
      });

      if (clientRecord) {
        userProfiles.push({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
          role: "ClientUser",
          companyName: clientRecord.companyName,
          phone: clientRecord.phone,
        });
        continue;
      }

      // Check Internal User
      const internalRecord = await db.query.internal_users.findFirst({
        where: eq(internal_users.userId, user.id),
      });

      if (!internalRecord) {
        // Fallback default
        userProfiles.push({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
          role: "ClientUser",
        });
        continue;
      }

      // Check Admin
      const adminRecord = await db.query.admins.findFirst({
        where: eq(admins.internalUserId, user.id),
      });

      if (adminRecord) {
        userProfiles.push({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
          role: "Admin",
          isActive: internalRecord.isActive,
          department: internalRecord.department,
          hireDate: internalRecord.hireDate,
          canManageUsers: adminRecord.canManageUsers,
        });
        continue;
      }

      // Check Support Manager
      const smRecord = await db.query.support_managers.findFirst({
        where: eq(support_managers.internalUserId, user.id),
      });

      if (smRecord) {
        userProfiles.push({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
          role: "Support Manager",
          isActive: internalRecord.isActive,
          department: internalRecord.department,
          hireDate: internalRecord.hireDate,
          canAssign: smRecord.canAssign,
        });
        continue;
      }

      // Check Technician
      const techRecord = await db.query.technicians.findFirst({
        where: eq(technicians.internalUserId, user.id),
      });

      if (techRecord) {
        userProfiles.push({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          deletedAt: user.deletedAt,
          role: "Technician",
          isActive: internalRecord.isActive,
          department: internalRecord.department,
          hireDate: internalRecord.hireDate,
          specialty: techRecord.specialty,
          isAvailable: techRecord.isAvailable,
        });
        continue;
      }

      // Default internal user
      userProfiles.push({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
        role: "Support Manager",
        isActive: internalRecord.isActive,
        department: internalRecord.department,
        hireDate: internalRecord.hireDate,
      });
    }

    return userProfiles;
  }

  /**
   * Helper to fetch list of clients for vehicle assignment dropdowns.
   */
  static async getClients() {
    const clientRecords = await db.select({
      userId: clients.userId,
      companyName: clients.companyName,
      phone: clients.phone,
      name: users.name,
      email: users.email,
    })
    .from(clients)
    .innerJoin(users, eq(clients.userId, users.id))
    .where(isNull(users.deletedAt));

    return clientRecords;
  }

  /**
   * Updates user details, status, or permissions.
   */
  static async updateUser(
    targetUserId: number,
    data: {
      name?: string;
      email?: string;
      password?: string;
      department?: string;
      isActive?: boolean;
      isDeleted?: boolean;
      canManageUsers?: boolean;
      canAssign?: boolean;
      isAvailable?: boolean;
      specialty?: string;
      companyName?: string;
      phone?: string;
    },
    authenticatedUserId: number
  ) {
    await verifyAdminAccess(authenticatedUserId);

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!userRecord) {
      throw createStatusError("User not found", 404);
    }

    // Update base user fields (name, email, password, restore deletedAt)
    const userUpdates: Record<string, string | Date | null> = { updatedAt: new Date() };
    if (data.name) userUpdates.name = data.name;
    if (data.email) userUpdates.email = data.email;
    if (data.password && data.password.trim().length > 0) {
      userUpdates.password = await bcrypt.hash(data.password.trim(), 10);
    }
    if (data.isDeleted === false) {
      userUpdates.deletedAt = null;
    }

    if (Object.keys(userUpdates).length > 1) {
      await db.update(users)
        .set(userUpdates)
        .where(eq(users.id, targetUserId));
    }

    // Update internal user fields (isActive, department)
    if (typeof data.isActive === "boolean" || data.department) {
      const internalUser = await db.query.internal_users.findFirst({
        where: eq(internal_users.userId, targetUserId),
      });

      if (internalUser) {
        await db.update(internal_users)
          .set({
            ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
            ...(data.department ? { department: data.department } : {}),
          })
          .where(eq(internal_users.userId, targetUserId));
      }
    }

    // Update Admin permissions
    if (typeof data.canManageUsers === "boolean") {
      const adminRecord = await db.query.admins.findFirst({
        where: eq(admins.internalUserId, targetUserId),
      });

      if (adminRecord) {
        await db.update(admins)
          .set({ canManageUsers: data.canManageUsers })
          .where(eq(admins.internalUserId, targetUserId));
      }
    }

    // Update Support Manager permissions
    if (typeof data.canAssign === "boolean") {
      const smRecord = await db.query.support_managers.findFirst({
        where: eq(support_managers.internalUserId, targetUserId),
      });

      if (smRecord) {
        await db.update(support_managers)
          .set({ canAssign: data.canAssign })
          .where(eq(support_managers.internalUserId, targetUserId));
      }
    }

    // Update Technician specialty or availability
    if (typeof data.isAvailable === "boolean" || data.specialty) {
      const techRecord = await db.query.technicians.findFirst({
        where: eq(technicians.internalUserId, targetUserId),
      });

      if (techRecord) {
        await db.update(technicians)
          .set({
            ...(typeof data.isAvailable === "boolean" ? { isAvailable: data.isAvailable } : {}),
            ...(data.specialty ? { specialty: data.specialty } : {}),
          })
          .where(eq(technicians.internalUserId, targetUserId));
      }
    }

    // Update Client fields
    if (data.companyName || data.phone) {
      const clientRecord = await db.query.clients.findFirst({
        where: eq(clients.userId, targetUserId),
      });

      if (clientRecord) {
        await db.update(clients)
          .set({
            ...(data.companyName ? { companyName: data.companyName } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
          })
          .where(eq(clients.userId, targetUserId));
      }
    }

    return { message: "User updated successfully" };
  }

  /**
   * Soft-deletes a user.
   */
  static async deleteUser(targetUserId: number, authenticatedUserId: number) {
    await verifyAdminAccess(authenticatedUserId);

    if (targetUserId === authenticatedUserId) {
      throw createStatusError("You cannot delete your own admin account", 400);
    }

    const userRecord = await db.query.users.findFirst({
      where: and(eq(users.id, targetUserId), isNull(users.deletedAt)),
    });

    if (!userRecord) {
      throw createStatusError("User not found", 404);
    }

    await db.update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    return { message: "User soft-deleted successfully" };
  }

  /**
   * Restores a soft-deleted user.
   */
  static async restoreUser(targetUserId: number, authenticatedUserId: number) {
    await verifyAdminAccess(authenticatedUserId);

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!userRecord) {
      throw createStatusError("User not found", 404);
    }

    await db.update(users)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    return { message: "User account restored successfully" };
  }
}
