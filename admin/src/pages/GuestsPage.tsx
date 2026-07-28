import { useList } from "@refinedev/core";

export function GuestsPage() {
  const { data } = useList({ resource: "guests" });
  return (
    <div>
      <h1>Guests / CRM</h1>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((g) => {
              const r = g as { id: string; name: string; email: string; phone: string };
              return (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.phone}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
