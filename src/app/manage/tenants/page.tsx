// Tenant overview (multi-tenant variant; this directory is deleted whole by
// the single-tenant prune — D-T80 file_deletions). NOTE: tenant CREATION and
// suspension are the app-owner's operation and live in the platform-hosted
// Console tenant control plane, never in-app; this page shows the tenants the
// signed-in member belongs to.

export default function ManageTenantsPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Your tenants</h1>
      <p>The tenants you belong to. Creating or suspending tenants happens in the owner's Cactai Console.</p>
    </main>
  );
}
