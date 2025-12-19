import { createClient } from "@supabase/supabase-js";

(async () => {
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !service) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, service);

  const USER_ID = "f4cb96d2-0923-42f6-b867-472001453bb4";
  const NEW_PASSWORD = "123951963Ra.";

  console.log(`Resetting password for user: ${USER_ID}`);

  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    password: NEW_PASSWORD,
  });

  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  console.log("Success:", data);
})();

