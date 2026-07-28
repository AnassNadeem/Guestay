import { useList, useCreate, useUpdate, usePermissions } from "@refinedev/core";
import { Navigate } from "react-router-dom";

export function UsersPage() {
  const { data: role } = usePermissions<string>();
  const { data, refetch } = useList({ resource: "users" });
  const { mutate: create } = useCreate();
  const { mutate: update } = useUpdate();

  if (role && role !== "owner") {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Staff / Users</h1>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const email = window.prompt("Manager email to invite");
            if (!email) return;
            create(
              {
                resource: "users",
                values: {
                  email,
                  role: "manager",
                  status: "invited",
                  lastLogin: "—",
                },
              },
              { onSuccess: () => refetch() },
            );
          }}
        >
          Invite Manager
        </button>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((u) => {
              const r = u as {
                id: string;
                email: string;
                role: string;
                status: string;
                lastLogin: string;
              };
              return (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{r.role}</td>
                  <td>{r.status}</td>
                  <td>{r.lastLogin}</td>
                  <td>
                    {r.role !== "owner" && (
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() =>
                          update(
                            {
                              resource: "users",
                              id: r.id,
                              values: { status: "suspended" },
                            },
                            { onSuccess: () => refetch() },
                          )
                        }
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
