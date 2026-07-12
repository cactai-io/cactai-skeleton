# Customer database template

The schema of YOUR app's database (your Supabase project), applied by Cactai
provisioning — which prunes this template to your recorded tenancy answer
first (D-T80: multi keeps the tenant layer, single has none), then runs the
files in order. Never run the template unpruned: the tenancy-gated blocks are
selected by the `-- @prune:tenancy.*` markers.

The identity function `app_current_user_id()` is overridden to `auth.uid()`
on Supabase at deploy — one override point; policies never call `auth.uid()`
directly so the template also runs under test databases.
