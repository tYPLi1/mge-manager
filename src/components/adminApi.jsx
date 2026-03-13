import { base44 } from "@/api/base44Client";

/**
 * Admin API helper — wraps entity operations through the admin proxy backend function.
 * Uses the admin session from localStorage for authentication.
 * For READ operations on public entities, falls through to direct SDK calls.
 * For WRITE operations (create/update/delete), always uses the proxy.
 */

function getSession() {
  try {
    const raw = localStorage.getItem("adminSession");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function proxyCall(params) {
  const session = getSession();
  if (!session) throw new Error("No admin session");
  
  const response = await base44.functions.invoke("adminEntityProxy", {
    session: {
      userId: session.userId,
      username: session.username,
      expiresAt: session.expiresAt,
      token: session.token,
    },
    ...params,
  });
  
  if (response.data?.error) {
    throw new Error(response.data.error);
  }
  return response.data?.data;
}

// Entities that require admin proxy for ALL operations (including read)
const ADMIN_ONLY_ENTITIES = ["AdminUser", "AppSettings", "Auction"];

function createEntityProxy(entityName) {
  const isAdminOnly = ADMIN_ONLY_ENTITIES.includes(entityName);
  
  return {
    // READ operations: use direct SDK for public entities, proxy for admin-only
    list: (sort, limit) => {
      if (isAdminOnly) {
        return proxyCall({ operation: "list", entityName, sort, limit });
      }
      return base44.entities[entityName].list(sort, limit);
    },
    
    filter: (filterObj, sort, limit) => {
      if (isAdminOnly) {
        return proxyCall({ operation: "filter", entityName, filter: filterObj, sort, limit });
      }
      return base44.entities[entityName].filter(filterObj, sort, limit);
    },

    get: (id) => {
      if (isAdminOnly) {
        return proxyCall({ operation: "get", entityName, entityId: id });
      }
      return base44.entities[entityName].get(id);
    },
    
    // WRITE operations: always use proxy
    create: (data) => proxyCall({ operation: "create", entityName, data }),
    bulkCreate: (data) => proxyCall({ operation: "bulkCreate", entityName, data }),
    update: (id, data) => proxyCall({ operation: "update", entityName, entityId: id, data }),
    delete: (id) => proxyCall({ operation: "delete", entityName, entityId: id }),
    
    // Subscribe still works directly (read-only, real-time)
    subscribe: (callback) => {
      if (base44.entities[entityName]?.subscribe) {
        return base44.entities[entityName].subscribe(callback);
      }
      return () => {};
    },

    // Schema passthrough
    schema: () => base44.entities[entityName]?.schema(),
  };
}

// Create a proxy object that creates entity proxies on demand
export const adminEntities = new Proxy({}, {
  get: (target, prop) => {
    if (typeof prop === "string") {
      return createEntityProxy(prop);
    }
    return undefined;
  },
});