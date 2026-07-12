// The in-app user portal (D-T80 §4): standard template machinery, pruned per
// the tenancy fork the provisioning wizard records. Multi: a TENANT-ADMIN role
// surface. Single: the app-owner's user portal over the one shared space. The
// template carries BOTH variants prune-marked; provisioning keeps exactly one.

// @prune:user_portal.tenant_admin
import { TenantAdminPortal } from '@/components/portals/TenantAdminPortal';
// @prune:user_portal.owner_only
import { OwnerPortal } from '@/components/portals/OwnerPortal';

export default function ManageUsersPage() {
  // @prune:user_portal.tenant_admin
  return <TenantAdminPortal />;
  // @prune:user_portal.owner_only
  return <OwnerPortal />;
}
